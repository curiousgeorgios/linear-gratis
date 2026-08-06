import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get('cf-connecting-ip')?.trim()
  if (cfConnectingIp) return cfConnectingIp

  const forwardedFor = request.headers.get('x-forwarded-for')
    ?.split(',')
    .map((value) => value.trim())
    .find(Boolean)
  if (forwardedFor) return forwardedFor

  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
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
