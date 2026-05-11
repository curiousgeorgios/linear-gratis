// src/lib/linear-connection.ts
// Org-scoped Linear connection resolution (Fix E from ADR 0001).
//
// Replaces the legacy per-user lookup in src/lib/linear-auth.ts that read
// profiles.linear_api_token. Tokens now live on organisation_linear_connections
// and resources reference their connection by linear_connection_id.
//
// During the migrate window the sync trigger from migration 022 keeps the
// owner's profile token aligned with the personal-org connection, so callers
// that still hit profiles continue to work. New code should always go
// through these helpers.

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptToken, encryptToken, isLegacyCiphertext } from '@/lib/encryption'

export type LinearConnectionFailure = {
  ok: false
  response: NextResponse
}

export type LinearConnectionSuccess = {
  ok: true
  userId: string
  organisationId: string
  connectionId: string
  linearToken: string
}

export type LinearConnectionResult = LinearConnectionFailure | LinearConnectionSuccess

/**
 * Authenticate the caller via cookie session, resolve their active
 * organisation, and return a decrypted Linear token for that org's
 * connection. The plaintext token never leaves the server.
 *
 * "Active organisation" here = the caller's first owned org. The personal-org
 * pattern from migration 015 makes this unambiguous for solo users. A future
 * multi-org switcher would pass the org id explicitly via a different entry
 * point.
 */
export async function getAuthenticatedOrgConnection(): Promise<LinearConnectionResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }),
    }
  }

  const { data: membership, error: memberError } = await supabaseAdmin
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (memberError || !membership) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No active organisation for this user' },
        { status: 400 },
      ),
    }
  }

  const { data: connection, error: connectionError } = await supabaseAdmin
    .from('organisation_linear_connections')
    .select('id, organisation_id')
    .eq('organisation_id', membership.organisation_id)
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (connectionError || !connection) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'No Linear connection configured for this organisation' },
        { status: 400 },
      ),
    }
  }

  // Delegate to getTokenForConnection so the lazy workspace-id discovery
  // side-effect runs through the authenticated path too.
  const linearToken = await getTokenForConnection(connection.id)
  if (!linearToken) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Linear API token could not be decrypted' },
        { status: 500 },
      ),
    }
  }

  return {
    ok: true,
    userId: user.id,
    organisationId: connection.organisation_id,
    connectionId: connection.id,
    linearToken,
  }
}

/**
 * Look up the first Linear connection for an organisation. Used at resource-
 * creation time to stamp linear_connection_id on a new roadmap/form/view.
 * Returns null if the org has no connection yet (user hasn't completed
 * Linear OAuth) — caller decides whether that's fatal for their flow.
 */
export async function getActiveConnectionIdForOrg(
  admin: SupabaseClient,
  organisationId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('organisation_linear_connections')
    .select('id')
    .eq('organisation_id', organisationId)
    .order('connected_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return data.id
}

/**
 * Resolve a Linear token for a specific connection id. Used by resource-scoped
 * lookups: a roadmap/form/view carries linear_connection_id and a request for
 * its public-facing Linear data resolves the token through that connection,
 * not through the requester (who is typically anonymous).
 *
 * Returns null on any failure; the caller is expected to surface an
 * appropriate error response. Failures are not interesting to differentiate
 * for the public-facing paths.
 *
 * Side effect: if the connection's linear_workspace_id is null, this fires a
 * one-time Linear API call to discover the workspace id and persists it.
 * Backfill from migration 022 leaves the column null; discovery happens on
 * the first authenticated call after the contract is applied. Subsequent
 * calls skip the discovery because the column is now populated.
 */
export async function getTokenForConnection(
  connectionId: string,
): Promise<string | null> {
  const { data: connection, error } = await supabaseAdmin
    .from('organisation_linear_connections')
    .select('id, linear_api_token, linear_workspace_id')
    .eq('id', connectionId)
    .maybeSingle()
  if (error || !connection?.linear_api_token) return null

  const token = await decryptAndRotateConnectionToken(
    connection.linear_api_token,
    connection.id,
    supabaseAdmin,
  )
  if (!token) return null

  if (!connection.linear_workspace_id) {
    await discoverWorkspaceIdIfMissing(connection.id, token).catch((error) => {
      console.warn(JSON.stringify({
        event: 'linear.workspace_discovery.failure',
        level: 'warn',
        connectionId: connection.id,
        error: error instanceof Error ? error.name : 'unknown',
      }))
    })
  }

  return token
}

/**
 * One-shot workspace-id discovery. Asks Linear "who is this token for?" via
 * viewer.organization and patches organisation_linear_connections. Best
 * effort: any failure is logged and swallowed so the surrounding request
 * still proceeds.
 *
 * The conflicting-UNIQUE case (another connection in the same org already
 * holds this workspace_id) is also swallowed; the most likely cause is two
 * concurrent first-token-uses racing, and the constraint correctly prevents
 * a duplicate.
 */
async function discoverWorkspaceIdIfMissing(
  connectionId: string,
  token: string,
): Promise<void> {
  const query = `query LinearWorkspaceDiscovery {
    viewer {
      organization {
        id
        name
      }
    }
  }`

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token.trim(),
    },
    body: JSON.stringify({ query }),
  })

  if (!response.ok) return

  const result = (await response.json()) as {
    data?: { viewer?: { organization?: { id?: string; name?: string } | null } | null }
    errors?: Array<{ message: string }>
  }
  if (result.errors) return
  const workspaceId = result.data?.viewer?.organization?.id
  const workspaceName = result.data?.viewer?.organization?.name
  if (!workspaceId) return

  const { error } = await supabaseAdmin
    .from('organisation_linear_connections')
    .update({
      linear_workspace_id: workspaceId,
      linear_workspace_name: workspaceName ?? null,
    })
    .eq('id', connectionId)
    .is('linear_workspace_id', null)   // idempotent: only patch if still null

  if (error && error.code !== '23505') {
    console.warn(JSON.stringify({
      event: 'linear.workspace_discovery.persist_failure',
      level: 'warn',
      connectionId,
      error: error.message,
    }))
  }
}

// Internal: decrypt; if the ciphertext is a v1 CryptoJS blob, re-encrypt as v2
// and persist back to the connection row. Mirrors decryptAndRotateTokenIfNeeded
// for the org-connection storage location.
async function decryptAndRotateConnectionToken(
  ciphertext: string,
  connectionId: string,
  admin: SupabaseClient,
): Promise<string | null> {
  try {
    const plaintext = await decryptToken(ciphertext)
    if (!isLegacyCiphertext(ciphertext)) return plaintext
    try {
      const v2 = await encryptToken(plaintext)
      const { error } = await admin
        .from('organisation_linear_connections')
        .update({ linear_api_token: v2 })
        .eq('id', connectionId)
      if (error) {
        console.warn(JSON.stringify({
          event: 'encryption.rotation.failure',
          level: 'warn',
          stage: 'update',
          target: 'organisation_linear_connections',
          connectionId,
          error: error.message,
        }))
      }
    } catch (error) {
      console.warn(JSON.stringify({
        event: 'encryption.rotation.failure',
        level: 'warn',
        stage: 'encrypt',
        target: 'organisation_linear_connections',
        connectionId,
        error: error instanceof Error ? error.name : 'unknown',
      }))
    }
    return plaintext
  } catch {
    return null
  }
}
