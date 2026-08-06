import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  ALLOWED_FORM_ATTACHMENT_TYPES,
  MAX_FORM_ATTACHMENT_SIZE_BYTES,
  formatFileSize,
  getAllowedAttachmentTypeList,
  validateFormAttachmentFile,
} from '../src/lib/form-attachment'
import { createDeterministicRandom } from './helpers/deterministic'

describe('form attachment validation', () => {
  test('accepts every configured MIME type at the size boundary', () => {
    for (const type of Object.keys(ALLOWED_FORM_ATTACHMENT_TYPES)) {
      assert.deepEqual(
        validateFormAttachmentFile({ name: 'attachment.bin', size: 1, type }),
        { ok: true },
      )
      assert.deepEqual(
        validateFormAttachmentFile({ name: 'attachment.bin', size: MAX_FORM_ATTACHMENT_SIZE_BYTES, type }),
        { ok: true },
      )
    }
  })

  test('rejects blank names, empty files, invalid sizes, oversize files, and unknown types', () => {
    const allowedType = 'image/png'

    assert.equal(validateFormAttachmentFile({ name: '  ', size: 1, type: allowedType }).ok, false)
    assert.equal(validateFormAttachmentFile({ name: 'x.png', size: 0, type: allowedType }).ok, false)
    assert.equal(validateFormAttachmentFile({ name: 'x.png', size: -1, type: allowedType }).ok, false)
    assert.equal(validateFormAttachmentFile({ name: 'x.png', size: Number.NaN, type: allowedType }).ok, false)
    assert.equal(validateFormAttachmentFile({ name: 'x.png', size: Number.POSITIVE_INFINITY, type: allowedType }).ok, false)
    assert.equal(validateFormAttachmentFile({ name: 'x.png', size: 1.5, type: allowedType }).ok, false)
    assert.equal(
      validateFormAttachmentFile({ name: 'x.png', size: MAX_FORM_ATTACHMENT_SIZE_BYTES + 1, type: allowedType }).ok,
      false,
    )
    assert.equal(validateFormAttachmentFile({ name: 'x.exe', size: 1, type: 'application/x-msdownload' }).ok, false)
  })

  test('fuzzed size monotonicity preserves the maximum-size boundary', () => {
    const next = createDeterministicRandom(0xa77ac4)

    for (let index = 0; index < 5_000; index += 1) {
      const size = next() % (MAX_FORM_ATTACHMENT_SIZE_BYTES * 2)
      const result = validateFormAttachmentFile({ name: 'file.pdf', size, type: 'application/pdf' })

      assert.equal(result.ok, size >= 1 && size <= MAX_FORM_ATTACHMENT_SIZE_BYTES)
    }
  })

  test('formats boundary sizes and exposes a de-duplicated display list', () => {
    assert.equal(formatFileSize(1_023), '1023 B')
    assert.equal(formatFileSize(1_024), '1 KB')
    assert.equal(formatFileSize(1_536), '2 KB')
    assert.equal(formatFileSize(1024 * 1024), '1.0 MB')

    const labels = getAllowedAttachmentTypeList().split(', ')
    assert.equal(new Set(labels).size, labels.length)
    for (const label of new Set(Object.values(ALLOWED_FORM_ATTACHMENT_TYPES))) {
      assert.equal(labels.includes(label), true)
    }
  })
})
