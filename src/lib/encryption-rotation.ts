// src/lib/encryption-rotation.ts
import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptToken, encryptToken, isLegacyCiphertext } from './encryption'

/**
 * Decrypt a token and, if it was a v1 CryptoJS ciphertext, re-encrypt it as
 * v2 and update profiles.linear_api_token for the given user. Failures to
 * rotate are logged but swallowed: the decrypted plaintext is still returned
 * so the caller can proceed with whatever Linear request they were making.
 *
 * Log format: single-line JSON with event tag. Alert on a non-zero rate of
 * `encryption.rotation.failure` in your log drain to catch silent regressions
 * (e.g. a schema change that breaks the profiles UPDATE).
 */
export async function decryptAndRotateTokenIfNeeded(
  ciphertext: string,
  ctx: { userId: string; admin: SupabaseClient },
): Promise<string> {
  const plaintext = await decryptToken(ciphertext)
  if (!isLegacyCiphertext(ciphertext)) {
    return plaintext
  }
  try {
    const v2 = await encryptToken(plaintext)
    const { error } = await ctx.admin
      .from('profiles')
      .update({ linear_api_token: v2 })
      .eq('id', ctx.userId)
    if (error) {
      console.warn(
        JSON.stringify({
          event: 'encryption.rotation.failure',
          level: 'warn',
          stage: 'update',
          userId: ctx.userId,
          error: error.message,
        }),
      )
    }
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'encryption.rotation.failure',
        level: 'warn',
        stage: 'encrypt',
        userId: ctx.userId,
        error: error instanceof Error ? error.name : 'unknown',
      }),
    )
  }
  return plaintext
}
