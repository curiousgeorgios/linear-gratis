import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase'
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation'

export type LinearAuthFailure = {
  ok: false
  response: NextResponse
}

export type LinearAuthSuccess = {
  ok: true
  userId: string
  linearToken: string
}

export type LinearAuthResult = LinearAuthFailure | LinearAuthSuccess

/**
 * Authenticate the caller via cookie session and return their decrypted Linear
 * API token. If anything fails, returns a response the caller should return as-is.
 * The plaintext token never leaves the server.
 */
export async function getAuthenticatedLinearToken(): Promise<LinearAuthResult> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }),
    }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.linear_api_token) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Linear API token not set on profile' },
        { status: 400 },
      ),
    }
  }

  let linearToken: string
  try {
    linearToken = await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
      userId: user.id,
      admin: supabaseAdmin,
    })
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Linear API token could not be decrypted' },
        { status: 500 },
      ),
    }
  }

  return { ok: true, userId: user.id, linearToken }
}
