import { supabaseAdmin } from '@/lib/supabase'
import { hashApiToken, looksLikeApiToken } from '@/lib/api-tokens'
import { getTokenForConnection } from '@/lib/linear-connection'
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation'
import { McpToolError } from './protocol'

export type ApiTokenPrincipal = {
  tokenId: string
  organisationId: string
  createdBy: string | null
}

/** Resolve a presented bearer secret to its organisation, or null. */
export async function authenticateApiToken(secret: string | null): Promise<ApiTokenPrincipal | null> {
  if (!secret || !looksLikeApiToken(secret)) return null

  const { data, error } = await supabaseAdmin
    .from('api_tokens')
    .select('id, organisation_id, created_by')
    .eq('token_hash', await hashApiToken(secret))
    .is('revoked_at', null)
    .maybeSingle()

  if (error || !data) return null

  // Best effort: a failed timestamp write must never block the request.
  void supabaseAdmin
    .from('api_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => undefined, () => undefined)

  return { tokenId: data.id, organisationId: data.organisation_id, createdBy: data.created_by }
}

/** Decrypt the organisation's Linear token (connection row first, legacy profile second). */
export async function getLinearTokenForPrincipal(principal: ApiTokenPrincipal): Promise<string> {
  const { data: connection } = await supabaseAdmin
    .from('organisation_linear_connections')
    .select('id')
    .eq('organisation_id', principal.organisationId)
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (connection) {
    const token = await getTokenForConnection(connection.id)
    if (token) return token
  }

  if (principal.createdBy) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', principal.createdBy)
      .maybeSingle()
    if (profile?.linear_api_token) {
      try {
        return await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
          userId: principal.createdBy,
          admin: supabaseAdmin,
        })
      } catch {
        // fall through to the generic message below
      }
    }
  }

  throw new McpToolError('This organisation has no usable Linear connection. Save a Linear API token in the profile settings.')
}

export async function listOrgRows(organisationId: string, table: string, columns: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })
  if (error) throw new McpToolError(`Could not read ${table}.`)
  return (data ?? []) as unknown as Array<Record<string, unknown>>
}
