import { createHash } from 'node:crypto'

/**
 * Hash an IP address for optional abuse-analysis metadata. Votes and comments
 * are deduplicated by their visitor fingerprint, so an unavailable hash salt
 * must never prevent the primary mutation from completing.
 */
export function hashIp(ip: string, configuredSalt = process.env.IP_HASH_SALT): string | null {
  const salt = configuredSalt?.trim()
  if (!salt) return null

  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}
