import { createHash } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()

export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()

  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return 'unknown'
}

function checkMemoryRateLimit(
  key: string,
  options: RateLimitOptions,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now()
  const existing = rateLimitBuckets.get(key)

  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return { ok: true }
  }

  existing.count += 1
  if (existing.count <= options.limit) {
    return { ok: true }
  }

  return {
    ok: false,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
      p_key: key,
      p_limit: options.limit,
      p_window_seconds: Math.ceil(options.windowMs / 1000),
    })

    const row = Array.isArray(data) ? data[0] : data
    if (!error && row && typeof row.allowed === 'boolean') {
      return row.allowed
        ? { ok: true }
        : {
            ok: false,
            retryAfterSeconds: Math.max(1, Number(row.retry_after_seconds) || 1),
          }
    }
  } catch {
    // Fall back to in-memory buckets for local/dev environments where the
    // migration has not been applied yet.
  }

  return checkMemoryRateLimit(key, options)
}

export function rateLimitResponse(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
      },
    },
  )
}

export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT
  if (!salt) {
    throw new Error('IP_HASH_SALT environment variable is required')
  }

  return createHash('sha256').update(`${ip}:${salt}`).digest('hex')
}
