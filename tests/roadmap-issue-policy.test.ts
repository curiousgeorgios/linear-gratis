import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  filterTimelineIssues,
  isRoadmapStateOpenForVoting,
  isShippedRoadmapIssue,
} from '../src/lib/roadmap-issue-policy'
import { makeLinearIssue } from './helpers/linear-issue'

describe('public roadmap issue policy', () => {
  const issues = [
    makeLinearIssue('issue-1', { state: { id: 'backlog', name: 'Backlog', color: '#6b7280', type: 'backlog' } }),
    makeLinearIssue('issue-2', { state: { id: 'todo', name: 'Todo', color: '#5e6ad2', type: 'unstarted' } }),
    makeLinearIssue('issue-3', { state: { id: 'started', name: 'In Progress', color: '#f59e0b', type: 'started' } }),
    makeLinearIssue('issue-4', { state: { id: 'done', name: 'Done', color: '#22c55e', type: 'completed' } }),
    makeLinearIssue('issue-5', { state: { id: 'canceled', name: 'Canceled', color: '#ef4444', type: 'canceled' } }),
    makeLinearIssue('issue-6', { state: { id: 'triage', name: 'Triage', color: '#9ca3af', type: 'triage' } }),
  ]

  test('timeline defaults to active work and optionally adds shipped work', () => {
    assert.deepEqual(
      filterTimelineIssues(issues, false).map((issue) => issue.state.type),
      ['backlog', 'unstarted', 'started'],
    )
    assert.deepEqual(
      filterTimelineIssues(issues, true).map((issue) => issue.state.type),
      ['backlog', 'unstarted', 'started', 'completed'],
    )
  })

  test('completed issues are shipped and only active workflow states accept votes', () => {
    assert.equal(isShippedRoadmapIssue(issues[3]), true)
    assert.equal(isShippedRoadmapIssue(issues[2]), false)

    for (const type of ['backlog', 'unstarted', 'started']) {
      assert.equal(isRoadmapStateOpenForVoting(type), true)
    }
    for (const type of ['completed', 'canceled', 'triage', 'duplicate', 'unknown']) {
      assert.equal(isRoadmapStateOpenForVoting(type), false)
    }
  })
})
