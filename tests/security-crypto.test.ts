import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import CryptoJS from 'crypto-js'
import {
  createPasswordAccessToken,
  verifyPasswordAccessToken,
} from '../src/lib/access-cookie'
import {
  decryptToken,
  encryptToken,
  isLegacyCiphertext,
} from '../src/lib/encryption'
import {
  decryptTokenV2,
  encryptTokenV2,
  isV2Ciphertext,
} from '../src/lib/encryption-v2'
import {
  createWebhookSignature,
  verifyWebhookSignature,
} from '../src/lib/webhook-signature'
import {
  createDeterministicRandom,
  deterministicText,
} from './helpers/deterministic'

const TEST_ACCESS_SECRET = 'test-only-access-cookie-secret-with-adequate-entropy'
const TEST_ENCRYPTION_SECRET = 'test-only-token-encryption-secret-with-adequate-entropy'
let previousAccessSecret: string | undefined
let previousEncryptionSecret: string | undefined

before(() => {
  previousAccessSecret = process.env.ACCESS_COOKIE_SECRET
  previousEncryptionSecret = process.env.ENCRYPTION_KEY
  process.env.ACCESS_COOKIE_SECRET = TEST_ACCESS_SECRET
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_SECRET
})

after(() => {
  if (previousAccessSecret === undefined) delete process.env.ACCESS_COOKIE_SECRET
  else process.env.ACCESS_COOKIE_SECRET = previousAccessSecret

  if (previousEncryptionSecret === undefined) delete process.env.ENCRYPTION_KEY
  else process.env.ENCRYPTION_KEY = previousEncryptionSecret
})

function tamper(value: string): string {
  const index = Math.max(0, value.length - 2)
  const replacement = value[index] === 'a' ? 'b' : 'a'
  return `${value.slice(0, index)}${replacement}${value.slice(index + 1)}`
}

describe('password access cookies', () => {
  test('round-trips only for the exact resource and password hash', () => {
    const token = createPasswordAccessToken('view-123', 'bcrypt-hash', 60)

    assert.equal(verifyPasswordAccessToken(token, 'view-123', 'bcrypt-hash'), true)
    assert.equal(verifyPasswordAccessToken(token, 'view-456', 'bcrypt-hash'), false)
    assert.equal(verifyPasswordAccessToken(token, 'view-123', 'different-hash'), false)
  })

  test('rejects missing, expired, malformed, and tampered tokens', () => {
    const valid = createPasswordAccessToken('roadmap-1', 'hash-1', 60)
    const expired = createPasswordAccessToken('roadmap-1', 'hash-1', -1)

    assert.equal(verifyPasswordAccessToken(undefined, 'roadmap-1', 'hash-1'), false)
    assert.equal(verifyPasswordAccessToken('', 'roadmap-1', 'hash-1'), false)
    assert.equal(verifyPasswordAccessToken('not-a-token', 'roadmap-1', 'hash-1'), false)
    assert.equal(verifyPasswordAccessToken(`${valid}.extra`, 'roadmap-1', 'hash-1'), false)
    assert.equal(verifyPasswordAccessToken(tamper(valid), 'roadmap-1', 'hash-1'), false)
    assert.equal(verifyPasswordAccessToken(expired, 'roadmap-1', 'hash-1'), false)
  })

  test('metamorphic fuzzing binds every token to both inputs', () => {
    const next = createDeterministicRandom(0xacce55)

    for (let index = 0; index < 1_000; index += 1) {
      const resourceId = `resource-${deterministicText(next, 12)}`
      const passwordHash = `hash-${deterministicText(next, 48)}`
      const token = createPasswordAccessToken(resourceId, passwordHash, 120)

      assert.equal(verifyPasswordAccessToken(token, resourceId, passwordHash), true)
      assert.equal(verifyPasswordAccessToken(token, `${resourceId}-other`, passwordHash), false)
      assert.equal(verifyPasswordAccessToken(token, resourceId, `${passwordHash}-other`), false)
      assert.equal(verifyPasswordAccessToken(tamper(token), resourceId, passwordHash), false)
    }
  })
})

describe('token encryption', () => {
  test('v2 encryption round-trips UTF-8 values and uses a fresh IV', async () => {
    const values = [
      'lin_api_test_token',
      'Unicode token: café ☕ 日本語',
      'x'.repeat(4_096),
    ]

    for (const value of values) {
      const first = await encryptTokenV2(value)
      const second = await encryptToken(value)

      assert.equal(isV2Ciphertext(first), true)
      assert.equal(isLegacyCiphertext(first), false)
      assert.notEqual(first, second)
      assert.equal(await decryptTokenV2(first), value)
      assert.equal(await decryptToken(second), value)
    }
  })

  test('authenticates ciphertext and rejects truncation or tampering', async () => {
    const encrypted = await encryptTokenV2('sensitive-token')

    await assert.rejects(() => decryptTokenV2('legacy-ciphertext'), /Not a v2 ciphertext/)
    await assert.rejects(() => decryptTokenV2('v2:AA=='), /truncated/)
    await assert.rejects(() => decryptTokenV2(tamper(encrypted)))
    await assert.rejects(() => encryptTokenV2(''), /Plaintext cannot be empty/)
  })

  test('keeps legacy ciphertext readable for lazy migration', async () => {
    const legacy = CryptoJS.AES.encrypt('legacy-linear-token', TEST_ENCRYPTION_SECRET).toString()

    assert.equal(isLegacyCiphertext(legacy), true)
    assert.equal(await decryptToken(legacy), 'legacy-linear-token')
  })
})

describe('webhook signatures', () => {
  test('accepts the exact signature among comma-separated candidates', () => {
    const body = JSON.stringify({ event: 'feedback.created', id: 'feedback-1' })
    const signature = createWebhookSignature(body, 'webhook-secret')

    assert.match(signature, /^sha256=[a-f0-9]{64}$/)
    assert.equal(verifyWebhookSignature(body, 'webhook-secret', signature), true)
    assert.equal(
      verifyWebhookSignature(body, 'webhook-secret', `sha256=bad, ${signature}, sha256=also-bad`),
      true,
    )
    assert.equal(verifyWebhookSignature(body, 'webhook-secret', null), false)
  })

  test('is sensitive to body and secret changes over fuzzed payloads', () => {
    const next = createDeterministicRandom(0x51a7e)

    for (let index = 0; index < 1_000; index += 1) {
      const body = deterministicText(next, 64)
      const secret = deterministicText(next, 48)
      const signature = createWebhookSignature(body, secret)

      assert.equal(verifyWebhookSignature(body, secret, signature), true)
      assert.equal(verifyWebhookSignature(`${body}.`, secret, signature), false)
      assert.equal(verifyWebhookSignature(body, `${secret}.`, signature), false)
      assert.equal(verifyWebhookSignature(body, secret, tamper(signature)), false)
    }
  })
})
