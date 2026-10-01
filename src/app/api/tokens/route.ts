import { NextRequest, NextResponse } from 'next/server'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateApiToken, hashApiToken } from '@/lib/api-tokens'
import { getActiveOrganisationIdAdmin } from '@/lib/organisations'

// Manage the organisation's API tokens (used by the MCP endpoint). Cookie
// session only: an API token can never mint or revoke API tokens.

const MAX_ACTIVE_TOKENS = 25

const createSchema = z.object({ name: z.string().trim().min(1).max(80) })
const deleteSchema = z.object({ id: z.string().uuid() })

async function requireOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }

  const organisationId = await getActiveOrganisationIdAdmin(supabaseAdmin, user.id)
  if (!organisationId) {
    return { error: NextResponse.json({ error: 'No active organisation for this user' }, { status: 400 }) }
  }
  return { userId: user.id, organisationId }
}

export async function GET() {
  const auth = await requireOrg()
  if ('error' in auth) return auth.error

  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .select('id, name, token_prefix, last_used_at, created_at')
    .eq('organisation_id', auth.organisationId)
    .is('revoked_at', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to load tokens' }, { status: 500 })
  return NextResponse.json({ success: true, tokens: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireOrg()
  if ('error' in auth) return auth.error

  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'A token name (1-80 characters) is required' }, { status: 400 })

  const { count } = await supabaseAdmin
    .from('api_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', auth.organisationId)
    .is('revoked_at', null)
  if ((count ?? 0) >= MAX_ACTIVE_TOKENS) {
    return NextResponse.json({ error: `Limit of ${MAX_ACTIVE_TOKENS} active tokens reached` }, { status: 409 })
  }

  const { token, prefix } = generateApiToken()
  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .insert({
      organisation_id: auth.organisationId,
      created_by: auth.userId,
      name: parsed.data.name,
      token_prefix: prefix,
      token_hash: await hashApiToken(token),
    })
    .select('id, name, token_prefix, created_at')
    .single()

  if (error || !data) return NextResponse.json({ error: 'Failed to create token' }, { status: 500 })
  // The only time the plaintext secret is ever returned.
  return NextResponse.json({ success: true, token, record: data }, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireOrg()
  if ('error' in auth) return auth.error

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'A valid token id is required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
    .eq('organisation_id', auth.organisationId)
    .is('revoked_at', null)

  if (error) return NextResponse.json({ error: 'Failed to revoke token' }, { status: 500 })
  return NextResponse.json({ success: true })
}
