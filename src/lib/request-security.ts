import { supabaseAdmin } from '@/lib/supabase'

export { hashIp } from '@/lib/ip-hash'
export { getClientIp, rateLimitResponse } from '@/lib/request-security-core'

type RateLimitOptions = {
  limit: number
  windowMs: number
}

type RateLimitBucket = {
  count: number
  resetAt: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()

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
