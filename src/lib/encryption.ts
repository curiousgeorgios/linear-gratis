// src/lib/encryption.ts
// Dispatches encryption/decryption by version prefix.
// New writes always use v2 (AES-GCM). Reads transparently handle v1 (CryptoJS)
// and v2 so existing rows keep working until they're rotated to v2 on first
// authenticated decrypt via decryptAndRotateTokenIfNeeded (see Batch F notes).

import CryptoJS from 'crypto-js'
import { encryptTokenV2, decryptTokenV2, isV2Ciphertext } from './encryption-v2'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is required')
}
// Narrow for downstream usage; the throw above guarantees this is set.
const LEGACY_KEY: string = ENCRYPTION_KEY

export async function encryptToken(plaintext: string): Promise<string> {
  return encryptTokenV2(plaintext)
}

export async function decryptToken(ciphertext: string): Promise<string> {
  if (isV2Ciphertext(ciphertext)) {
    return decryptTokenV2(ciphertext)
  }
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, LEGACY_KEY)
    const plaintext = bytes.toString(CryptoJS.enc.Utf8)
    if (!plaintext) {
      throw new Error('Decryption produced empty result')
    }
    return plaintext
  } catch (error) {
    console.error('Error decrypting token:', error instanceof Error ? error.name : 'unknown')
    throw new Error('Failed to decrypt token')
  }
}

/**
 * Returns true if the given ciphertext is a legacy (v1) encoding that should
 * be re-encrypted as v2 on next access. Callers with a user_id and admin
 * client should use this to drive lazy rotation.
 */
export function isLegacyCiphertext(ciphertext: string): boolean {
  return !isV2Ciphertext(ciphertext)
}
