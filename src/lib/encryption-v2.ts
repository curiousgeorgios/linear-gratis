// src/lib/encryption-v2.ts
// AES-256-GCM encryption for Linear API tokens. Version prefix "v2:" lets
// decryptToken in src/lib/encryption.ts fall back to the legacy CryptoJS
// (v1) path for rows written before this module existed.

const VERSION_PREFIX = 'v2:'

let cachedKey: CryptoKey | null = null

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  return key
}

async function getKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  const encoder = new TextEncoder()
  const keyMaterial = encoder.encode(getEncryptionKey())
  const keyBytes = await crypto.subtle.digest('SHA-256', keyMaterial)
  cachedKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt'],
  )
  return cachedKey
}

function toBase64(bytes: Uint8Array): string {
  // Compact base64 conversion that works in Workers and Node.
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export function isV2Ciphertext(value: string): boolean {
  return typeof value === 'string' && value.startsWith(VERSION_PREFIX)
}

export async function encryptTokenV2(plaintext: string): Promise<string> {
  if (!plaintext) throw new Error('Plaintext cannot be empty')
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded),
  )
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(ciphertext, iv.byteLength)
  return VERSION_PREFIX + toBase64(combined)
}

export async function decryptTokenV2(payload: string): Promise<string> {
  if (!isV2Ciphertext(payload)) {
    throw new Error('Not a v2 ciphertext')
  }
  const body = payload.slice(VERSION_PREFIX.length)
  const combined = fromBase64(body)
  if (combined.byteLength <= 12) {
    throw new Error('v2 ciphertext is truncated')
  }
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)
  const key = await getKey()
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(plaintext)
}
