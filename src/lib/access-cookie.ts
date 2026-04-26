import { Buffer } from 'node:buffer'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

type AccessCookiePayload = {
  v: 1
  rid: string
  ph: string
  exp: number
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function base64UrlDecode(value: string): string {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=')
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function getAccessCookieSecret(): string {
  const secret = process.env.ACCESS_COOKIE_SECRET || process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('ACCESS_COOKIE_SECRET or ENCRYPTION_KEY is required for protected public access cookies')
  }
  return secret
}

function hashPasswordHash(passwordHash: string): string {
  return createHash('sha256').update(passwordHash, 'utf8').digest('hex')
}

function sign(payload: string): string {
  return createHmac('sha256', getAccessCookieSecret()).update(payload).digest('hex')
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function createPasswordAccessToken(
  resourceId: string,
  passwordHash: string,
  maxAgeSeconds: number,
): string {
  const payload: AccessCookiePayload = {
    v: 1,
    rid: resourceId,
    ph: hashPasswordHash(passwordHash),
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  }
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifyPasswordAccessToken(
  token: string | undefined,
  resourceId: string,
  passwordHash: string,
): boolean {
  if (!token) return false

  const [encodedPayload, signature, ...rest] = token.split('.')
  if (!encodedPayload || !signature || rest.length > 0) return false

  const expectedSignature = sign(encodedPayload)
  if (!constantTimeEquals(signature, expectedSignature)) return false

  let payload: AccessCookiePayload
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as AccessCookiePayload
  } catch {
    return false
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  return (
    payload.v === 1 &&
    payload.rid === resourceId &&
    payload.ph === hashPasswordHash(passwordHash) &&
    payload.exp >= nowSeconds
  )
}
