import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { publicFormSchema } from '../src/lib/public-form-schema'

const submission = {
  customerName: 'Feedback sender', customerEmail: 'sender@example.com',
  issueTitle: 'Estimate feedback', issueBody: 'The estimate needs attention.',
  attachmentUrl: '', templateId: '',
}

describe('public form validation', () => {
  test('accepts the embedded page URL exceeding the old 200-character limit', () => {
    const reference = `https://usual-suspects.digital-nachos.workers.dev/projects/${'a'.repeat(36)}/estimates/${'b'.repeat(36)}?context=${'c'.repeat(100)}`
    assert.ok(reference.length > 200)
    const parsed = publicFormSchema.safeParse({ ...submission, externalId: reference })
    assert.equal(parsed.success, true)
    if (parsed.success) assert.equal(parsed.data.externalId, reference)
  })
  test('accepts exact limits and returns field errors beyond them', () => {
    const limits = { customerName: 200, issueTitle: 300, issueBody: 10000, externalId: 2048, templateId: 100 }
    for (const [field, limit] of Object.entries(limits)) {
      assert.equal(publicFormSchema.safeParse({ ...submission, [field]: 'x'.repeat(limit) }).success, true)
      const parsed = publicFormSchema.safeParse({ ...submission, [field]: 'x'.repeat(limit + 1) })
      assert.equal(parsed.success, false)
      if (!parsed.success) assert.equal(parsed.error.issues[0]?.path[0], field)
    }
  })
  test('rejects missing required text and invalid email or attachment URLs', () => {
    for (const invalid of [{ customerName: '' }, { customerEmail: 'invalid' }, { issueTitle: '' }, { issueBody: '' }, { attachmentUrl: 'not-a-url' }]) {
      assert.equal(publicFormSchema.safeParse({ ...submission, ...invalid }).success, false)
    }
    assert.equal(publicFormSchema.safeParse(submission).success, true)
  })
})
