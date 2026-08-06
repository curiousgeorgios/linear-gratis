import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { appendAttachmentMarkdown } from '../src/lib/attachment-markdown'
import { redactPublicViewIssue, redactRoadmapIssue } from '../src/lib/public-redaction'
import { isMissingSchemaError } from '../src/lib/supabase-errors'
import { makeLinearIssue } from './helpers/linear-issue'

describe('public issue redaction', () => {
  test('removes every disabled public-view field without mutating the source', () => {
    const issue = makeLinearIssue('issue-4')
    const source = structuredClone(issue)
    const view = {
      show_descriptions: false,
      show_assignees: false,
      show_labels: false,
      show_priorities: false,
    }

    const redacted = redactPublicViewIssue(issue, view as never)

    assert.equal(redacted.description, undefined)
    assert.equal(redacted.assignee, undefined)
    assert.deepEqual(redacted.labels, [])
    assert.equal(redacted.priority, 0)
    assert.equal(redacted.priorityLabel, 'No priority')
    assert.equal(redacted.estimate, undefined)
    assert.deepEqual(issue, source)
    assert.deepEqual(redactPublicViewIssue(redacted, view as never), redacted)
  })

  test('default visibility preserves fields when flags are null or undefined', () => {
    const issue = makeLinearIssue('issue-8')
    const visible = redactPublicViewIssue(issue, {} as never)

    assert.deepEqual(visible, issue)
    assert.notEqual(visible, issue)
  })

  test('roadmap redaction independently gates descriptions and dates', () => {
    const issue = {
      ...makeLinearIssue('issue-6'),
      dueDate: '2026-09-01',
      project: { id: 'project-1', name: 'Project' },
    }

    const hidden = redactRoadmapIssue(issue, {
      show_item_descriptions: false,
      show_item_dates: false,
    } as never)
    const visible = redactRoadmapIssue(issue, {} as never)

    assert.equal(hidden.description, undefined)
    assert.equal(hidden.dueDate, undefined)
    assert.deepEqual(visible, issue)
  })
})

describe('attachment markdown', () => {
  test('preserves empty input and appends escaped image markdown', () => {
    assert.equal(appendAttachmentMarkdown(undefined, []), undefined)
    assert.equal(appendAttachmentMarkdown('Description', []), 'Description')
    assert.equal(
      appendAttachmentMarkdown('  Description  ', [
        { fileName: 'wireframe [final]\\.png', assetUrl: 'https://uploads.linear.app/asset-1' },
        { fileName: 'report.pdf', assetUrl: 'https://uploads.linear.app/asset-2' },
      ]),
      [
        'Description',
        '![wireframe \\[final\\]\\\\.png](https://uploads.linear.app/asset-1)',
        '![report.pdf](https://uploads.linear.app/asset-2)',
      ].join('\n\n'),
    )
  })

  test('attachment-only descriptions do not gain leading whitespace', () => {
    assert.equal(
      appendAttachmentMarkdown('   ', [
        { fileName: 'file.png', assetUrl: 'https://uploads.linear.app/file' },
      ]),
      '![file.png](https://uploads.linear.app/file)',
    )
  })
})

describe('Supabase schema error classification', () => {
  test('recognises the explicit PostgreSQL and PostgREST missing-schema codes', () => {
    for (const code of ['42P01', '42703', 'PGRST204', 'PGRST205']) {
      assert.equal(isMissingSchemaError({ code }), true)
    }
  })

  test('recognises message, detail, and hint variants without broad false positives', () => {
    const missing = [
      { message: 'Could not find the table public.forms' },
      { details: 'relation "roadmap_votes" does not exist' },
      { hint: 'column roadmaps.linear_project_ids does not exist' },
    ]
    for (const error of missing) assert.equal(isMissingSchemaError(error), true)

    for (const value of [null, undefined, '42P01', {}, { code: '23505' }, { message: 'network timeout' }]) {
      assert.equal(isMissingSchemaError(value), false)
    }
  })
})
