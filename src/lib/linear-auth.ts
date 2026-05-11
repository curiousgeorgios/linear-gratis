import { NextResponse } from 'next/server'
import {
  getAuthenticatedOrgConnection,
  type LinearConnectionResult,
} from '@/lib/linear-connection'

export type LinearAuthFailure = {
  ok: false
  response: NextResponse
}

export type LinearAuthSuccess = {
  ok: true
  userId: string
  linearToken: string
  // Exposed so callers can stamp linear_connection_id on resources they create.
  organisationId: string
  connectionId: string
}

export type LinearAuthResult = LinearAuthFailure | LinearAuthSuccess

/**
 * Authenticate the caller via cookie session and return their decrypted Linear
 * API token. If anything fails, returns a response the caller should return
 * as-is. The plaintext token never leaves the server.
 *
 * Post-Fix-E (ADR 0001) this delegates to getAuthenticatedOrgConnection.
 * The token resolves through the active organisation's
 * organisation_linear_connections row, not profiles.linear_api_token.
 * The legacy column on profiles is kept in sync by migration 022's
 * sync_profile_token_to_connection trigger so any in-flight code that still
 * reads it continues to work until the contract migration drops it.
 */
export async function getAuthenticatedLinearToken(): Promise<LinearAuthResult> {
  const result: LinearConnectionResult = await getAuthenticatedOrgConnection()
  if (!result.ok) return result
  return {
    ok: true,
    userId: result.userId,
    linearToken: result.linearToken,
    organisationId: result.organisationId,
    connectionId: result.connectionId,
  }
}
