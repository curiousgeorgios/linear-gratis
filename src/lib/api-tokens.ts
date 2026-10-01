// Organisation-scoped API tokens for machine clients (MCP, scripts).
//
// Secrets look like `lgk_<43 url-safe chars>`. Only the SHA-256 hash is
// persisted; the plaintext is returned exactly once when the token is created.
// Hashing uses Web Crypto so it behaves identically on Node and on Workers.

export const API_TOKEN_PREFIX = 'lgk_'
const SECRET_BYTES = 32

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function generateApiToken(): { token: string; prefix: string } {
  const bytes = crypto.getRandomValues(new Uint8Array(SECRET_BYTES))
  const token = `${API_TOKEN_PREFIX}${toBase64Url(bytes)}`
  return { token, prefix: token.slice(0, API_TOKEN_PREFIX.length + 6) }
}

export async function hashApiToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function looksLikeApiToken(value: string): boolean {
  return /^lgk_[A-Za-z0-9_-]{43}$/.test(value)
}

/** Extract the secret from `Authorization: Bearer <token>`; null if absent or malformed. */
export function readBearerToken(header: string | null): string | null {
  if (!header) return null
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim())
  return match ? match[1] : null
}
