#!/usr/bin/env node
// scripts/test-rls-isolation.mjs
//
// Smoke test: two test users, each with resources, assert neither can SELECT
// the other's rows. Run against a DB that already has migration 015 applied.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=https://... \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
//   TEST_USER_A_EMAIL=alice@test ... TEST_USER_A_PASSWORD=... \
//   TEST_USER_B_EMAIL=bob@test ... TEST_USER_B_PASSWORD=... \
//   node scripts/test-rls-isolation.mjs
//
// The two test users must already exist, each with at least one row in each of
// the five resource tables. The script does not create data (keeps blast
// radius small).

import { createClient } from '@supabase/supabase-js'

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD,
  TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD,
} = process.env

for (const [name, val] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD,
})) {
  if (!val) { console.error(`missing env ${name}`); process.exit(1) }
}

const TABLES = ['public_views', 'customer_request_forms', 'branding_settings', 'custom_domains', 'roadmaps']

async function sessionFor(email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return { client, userId: data.user.id }
}

async function main() {
  const a = await sessionFor(TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD)
  const b = await sessionFor(TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD)

  let failures = 0
  for (const table of TABLES) {
    // A should see only rows whose user_id is A's
    const aRows = await a.client.from(table).select('user_id')
    if (aRows.error) { console.error(`[${table}] A select error: ${aRows.error.message}`); failures++; continue }
    const aBad = (aRows.data ?? []).filter(r => r.user_id !== a.userId)
    if (aBad.length) { console.error(`[${table}] A saw ${aBad.length} rows belonging to other users`); failures++ }

    // B should see only rows whose user_id is B's
    const bRows = await b.client.from(table).select('user_id')
    if (bRows.error) { console.error(`[${table}] B select error: ${bRows.error.message}`); failures++; continue }
    const bBad = (bRows.data ?? []).filter(r => r.user_id !== b.userId)
    if (bBad.length) { console.error(`[${table}] B saw ${bBad.length} rows belonging to other users`); failures++ }

    console.log(`[${table}] OK - A saw ${aRows.data?.length ?? 0} rows, B saw ${bRows.data?.length ?? 0} rows`)
  }

  // Cross-tenant write attempt: A tries to insert into B's org
  const bMemberships = await b.client.from('organisation_members').select('organisation_id').eq('user_id', b.userId)
  const bOrg = bMemberships.data?.[0]?.organisation_id
  if (bOrg) {
    const wrote = await a.client.from('public_views').insert({
      user_id: a.userId,
      organisation_id: bOrg,
      name: 'attack', slug: `attack-${Date.now()}`, view_title: 'x',
      is_active: true, show_assignees: true, show_labels: true,
      show_priorities: true, show_descriptions: true,
      show_comments: false, show_activity: false,
      show_project_updates: true, excluded_issue_ids: [], allowed_statuses: [],
      password_protected: false, allow_issue_creation: false,
    })
    if (!wrote.error) {
      console.error(`[public_views] A was able to INSERT a row into B's org - RLS broken`)
      failures++
    } else {
      console.log(`[public_views] OK - cross-tenant INSERT was rejected: ${wrote.error.message}`)
    }
  }

  // Cross-tenant UPDATE attempt: A tries to rename one of B's views
  const bViews = await b.client.from('public_views').select('id').eq('user_id', b.userId).limit(1)
  const bViewId = bViews.data?.[0]?.id
  if (bViewId) {
    const updated = await a.client.from('public_views').update({ name: 'pwned' }).eq('id', bViewId).select('id')
    if (updated.error) {
      console.log(`[public_views] OK - cross-tenant UPDATE was rejected: ${updated.error.message}`)
    } else if ((updated.data ?? []).length > 0) {
      console.error(`[public_views] A updated ${updated.data.length} of B's rows - RLS broken`)
      failures++
    } else {
      console.log(`[public_views] OK - cross-tenant UPDATE silently affected 0 rows`)
    }
  }

  // Cross-tenant DELETE attempt: A tries to delete one of B's views
  if (bViewId) {
    const deleted = await a.client.from('public_views').delete().eq('id', bViewId).select('id')
    if (deleted.error) {
      console.log(`[public_views] OK - cross-tenant DELETE was rejected: ${deleted.error.message}`)
    } else if ((deleted.data ?? []).length > 0) {
      console.error(`[public_views] A deleted ${deleted.data.length} of B's rows - RLS broken`)
      failures++
    } else {
      console.log(`[public_views] OK - cross-tenant DELETE silently affected 0 rows`)
    }
  }

  if (failures > 0) {
    console.error(`\nFAIL: ${failures} isolation failures`)
    process.exit(1)
  }
  console.log('\nPASS: RLS isolation holds across all five tables')
}

main().catch(err => { console.error(err); process.exit(1) })
