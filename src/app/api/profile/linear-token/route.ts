import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { encryptToken } from '@/lib/encryption'
import * as z from 'zod'

const bodySchema = z.object({
  token: z.string().min(1).max(1000),
})

async function clearLinearConnectionReferences(organisationId: string) {
  const tables = ['public_views', 'customer_request_forms', 'roadmaps', 'public_resources'] as const

  for (const table of tables) {
    const { error } = await supabaseAdmin
      .from(table)
      .update({ linear_connection_id: null })
      .eq('organisation_id', organisationId)

    if (error) {
      return { table, error }
    }
  }

  return null
}

// Post-Fix-E (ADR 0001) the canonical Linear token home is
// organisation_linear_connections. The legacy profiles.linear_api_token
// column is kept in sync for backwards compat during the migrate window;
// migration 022's profiles_sync_token_to_connection trigger handles
// profile → connection sync, and this route explicitly writes both sides
// to cover the connection → profile direction until the contract migration.

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const parsed = bodySchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }

    const encrypted = await encryptToken(parsed.data.token)

    const { data: membership, error: memberError } = await supabaseAdmin
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    if (memberError || !membership) {
      return NextResponse.json(
        { error: 'No active organisation for this user' },
        { status: 400 },
      )
    }

    // UPSERT-style: update the existing connection for this org if one exists,
    // otherwise insert a new one. Each org has at most one connection until
    // the multi-workspace UI ships.
    const { data: existing } = await supabaseAdmin
      .from('organisation_linear_connections')
      .select('id')
      .eq('organisation_id', membership.organisation_id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { error } = await supabaseAdmin
        .from('organisation_linear_connections')
        .update({ linear_api_token: encrypted, connected_by: user.id })
        .eq('id', existing.id)
      if (error) {
        console.error('[api/profile/linear-token PUT] connection update failed:', error)
        return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
      }
    } else {
      const { error } = await supabaseAdmin
        .from('organisation_linear_connections')
        .insert({
          organisation_id: membership.organisation_id,
          linear_api_token: encrypted,
          connected_by: user.id,
        })
      if (error) {
        console.error('[api/profile/linear-token PUT] connection insert failed:', error)
        return NextResponse.json({ error: 'Failed to save token' }, { status: 500 })
      }
    }

    // Mirror to profile for legacy readers. Removed after the contract migration.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ linear_api_token: encrypted })
      .eq('id', user.id)
    if (profileError) {
      console.warn('[api/profile/linear-token PUT] legacy profile mirror failed:', profileError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/profile/linear-token PUT]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: membership } = await supabaseAdmin
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    if (membership) {
      // Resource tables point at organisation_linear_connections through
      // ON DELETE RESTRICT FKs. Clear those nullable references before deleting
      // the org connection, otherwise token removal fails for any org that has
      // already created a form, view or roadmap.
      const clearError = await clearLinearConnectionReferences(membership.organisation_id)
      if (clearError) {
        console.error(
          `[api/profile/linear-token DELETE] failed to clear ${clearError.table}.linear_connection_id:`,
          clearError.error,
        )
        return NextResponse.json({ error: 'Failed to clear token' }, { status: 500 })
      }

      const { error } = await supabaseAdmin
        .from('organisation_linear_connections')
        .delete()
        .eq('organisation_id', membership.organisation_id)
      if (error) {
        console.error('[api/profile/linear-token DELETE] connection delete failed:', error)
        return NextResponse.json({ error: 'Failed to clear token' }, { status: 500 })
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ linear_api_token: null })
      .eq('id', user.id)
    if (profileError) {
      console.warn('[api/profile/linear-token DELETE] legacy profile clear failed:', profileError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[api/profile/linear-token DELETE]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET returns only whether a token is configured, never the token itself.
// Sourced from organisation_linear_connections; falls back to the profile
// column when the user's org has no connection row yet (very early signup
// before migration 022's backfill ran for this user).
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    const { data: membership } = await supabaseAdmin
      .from('organisation_members')
      .select('organisation_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    if (membership) {
      const { data: connection } = await supabaseAdmin
        .from('organisation_linear_connections')
        .select('id')
        .eq('organisation_id', membership.organisation_id)
        .limit(1)
        .maybeSingle()
      if (connection) return NextResponse.json({ hasToken: true })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', user.id)
      .single()

    return NextResponse.json({ hasToken: Boolean(profile?.linear_api_token) })
  } catch (error) {
    console.error('[api/profile/linear-token GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
