import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { NextRequest } from 'next/server'
import { getClientIp, rateLimitResponse } from '../src/lib/request-security-core'

function requestWithHeaders(values: HeadersInit): NextRequest {
  return { headers: new Headers(values) } as NextRequest
}

describe('request security helpers', () => {
  test('uses trusted proxy headers in precedence order', () => {
    assert.equal(
      getClientIp(requestWithHeaders({
        'cf-connecting-ip': ' 203.0.113.10 ',
        'x-forwarded-for': '198.51.100.20, 198.51.100.21',
        'x-real-ip': '192.0.2.30',
      })),
      '203.0.113.10',
    )
    assert.equal(
      getClientIp(requestWithHeaders({
        'x-forwarded-for': ' 198.51.100.20, 198.51.100.21 ',
        'x-real-ip': '192.0.2.30',
      })),
      '198.51.100.20',
    )
    assert.equal(getClientIp(requestWithHeaders({ 'x-real-ip': ' 192.0.2.30 ' })), '192.0.2.30')
  })

  test('skips blank proxy values and falls back to unknown', () => {
    assert.equal(
      getClientIp(requestWithHeaders({
        'cf-connecting-ip': ' ',
        'x-forwarded-for': ' , 198.51.100.40',
      })),
      '198.51.100.40',
    )
    assert.equal(getClientIp(requestWithHeaders({})), 'unknown')
  })

  test('builds a standards-compatible 429 response', async () => {
    const response = rateLimitResponse(17)

    assert.equal(response.status, 429)
    assert.equal(response.headers.get('Retry-After'), '17')
    assert.deepEqual(await response.json(), {
      error: 'Too many requests. Please try again later.',
    })
  })
})
