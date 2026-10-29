import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { sortRoadmapIssues } from '../src/lib/roadmap-sorting'
import { makeLinearIssue } from './helpers/linear-issue'

const ids = (issues: ReturnType<typeof makeLinearIssue>[]) => issues.map((issue) => issue.id)

describe('roadmap chronological sorting', () => {
  test('sorts creation timestamps in either direction independently of votes and due dates', () => {
    const oldest = { ...makeLinearIssue('issue-1'), dueDate: '2027-12-01' }
    const newest = { ...makeLinearIssue('issue-3'), dueDate: '2026-01-01' }
    const middle = makeLinearIssue('issue-2')
    const issues = [middle, newest, oldest]
    const votes = { 'issue-1': 100, 'issue-2': 10, 'issue-3': 0 }

    assert.deepEqual(ids(sortRoadmapIssues(issues, 'newest', votes)), ['issue-3', 'issue-2', 'issue-1'])
    assert.deepEqual(ids(sortRoadmapIssues(issues, 'oldest', votes)), ['issue-1', 'issue-2', 'issue-3'])
    assert.deepEqual(issues, [middle, newest, oldest])
  })

  test('compares actual instants rather than timestamp strings', () => {
    const issues = [
      makeLinearIssue('issue-1', { createdAt: '2026-10-29T08:00:00Z' }),
      makeLinearIssue('issue-2', { createdAt: '2026-10-29T18:30:00+11:00' }),
    ]
    assert.deepEqual(ids(sortRoadmapIssues(issues, 'oldest')), ['issue-2', 'issue-1'])
  })

  test('keeps invalid dates last and breaks equal timestamp ties consistently', () => {
    const issues = [
      makeLinearIssue('issue-3', { createdAt: '' }),
      makeLinearIssue('issue-2', { createdAt: '2026-10-29T09:00:00Z' }),
      makeLinearIssue('issue-4', { createdAt: 'invalid' }),
      makeLinearIssue('issue-1', { createdAt: '2026-10-29T20:00:00+11:00' }),
    ]
    for (const sort of ['oldest', 'newest'] as const) {
      assert.deepEqual(ids(sortRoadmapIssues(issues, sort)), ['issue-1', 'issue-2', 'issue-3', 'issue-4'])
    }
  })

  test('retains most-voted ordering and the input order of vote ties', () => {
    const issues = ['issue-3', 'issue-2', 'issue-1'].map((id) => makeLinearIssue(id))
    assert.deepEqual(ids(sortRoadmapIssues(issues, 'votes', { 'issue-1': 5 })), ['issue-1', 'issue-3', 'issue-2'])
    assert.deepEqual(sortRoadmapIssues([], 'newest'), [])
  })
})
