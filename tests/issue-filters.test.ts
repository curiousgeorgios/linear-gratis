import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import type { FilterState } from '../src/components/filter-dropdown'
import {
  applyFilters,
  applyTab,
  groupIssues,
  orderIssues,
  priorityLabel,
  type ViewFlags,
} from '../src/lib/issue-filters'
import { createDeterministicRandom, deterministicShuffle } from './helpers/deterministic'
import { makeLinearIssue } from './helpers/linear-issue'

const NO_FILTERS: FilterState = {
  search: '',
  statuses: [],
  assignees: [],
  priorities: [],
  labels: [],
  creators: [],
}

const ALL_VISIBLE: ViewFlags = {
  showAssignees: true,
  showPriorities: true,
  showLabels: true,
  showDescriptions: true,
}

describe('issue tabs and filters', () => {
  const issues = Array.from({ length: 25 }, (_, index) => makeLinearIssue(`issue-${index}`))

  test('partitions active, backlog, and all tabs without mutating input', () => {
    const before = structuredClone(issues)
    const active = applyTab(issues, 'active')
    const backlog = applyTab(issues, 'backlog')

    assert.equal(active.every((issue) => ['started', 'unstarted'].includes(issue.state.type)), true)
    assert.equal(backlog.every((issue) => issue.state.type === 'backlog'), true)
    assert.equal(applyTab(issues, 'all'), issues)
    assert.deepEqual(issues, before)
  })

  test('search respects description visibility and remains case-insensitive', () => {
    const target = makeLinearIssue('issue-99', {
      title: 'Unrelated title',
      identifier: 'ABC-99',
      description: 'Hidden Needle',
    })
    const filters = { ...NO_FILTERS, search: 'nEeDlE' }

    assert.deepEqual(applyFilters([target], filters, ALL_VISIBLE), [target])
    assert.deepEqual(
      applyFilters([target], filters, { ...ALL_VISIBLE, showDescriptions: false }),
      [],
    )
  })

  test('hidden properties make their associated filters inert', () => {
    const target = makeLinearIssue('issue-7')
    const restrictive: FilterState = {
      ...NO_FILTERS,
      assignees: ['someone-else'],
      priorities: [99],
      labels: ['someone-else'],
    }

    assert.deepEqual(applyFilters([target], restrictive, ALL_VISIBLE), [])
    assert.deepEqual(
      applyFilters([target], restrictive, {
        ...ALL_VISIBLE,
        showAssignees: false,
        showPriorities: false,
        showLabels: false,
      }),
      [target],
    )
  })

  test('combines status, assignee, priority, and label filters conjunctively', () => {
    const target = makeLinearIssue('issue-8')
    const filters: FilterState = {
      ...NO_FILTERS,
      statuses: [target.state.name],
      assignees: [target.assignee?.id ?? ''],
      priorities: [target.priority],
      labels: [target.labels[0].id],
    }

    assert.deepEqual(applyFilters(issues, filters, ALL_VISIBLE).map((issue) => issue.id), ['issue-8'])
  })
})

describe('issue ordering and grouping', () => {
  const issues = Array.from({ length: 50 }, (_, index) => makeLinearIssue(`issue-${index}`))

  test('maps Linear priorities to their canonical labels', () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 99].map(priorityLabel),
      ['No priority', 'Urgent', 'High', 'Medium', 'Low', 'No priority'],
    )
  })

  test('ordering is pure, deterministic, and permutation-invariant for unique sort keys', () => {
    const next = createDeterministicRandom(0x0d3e7)
    const uniquelyTitled = issues.map((issue, index) => ({ ...issue, title: `Title ${String(index).padStart(3, '0')}` }))
    const expected = orderIssues(uniquelyTitled, 'title').map((issue) => issue.id)

    for (let index = 0; index < 500; index += 1) {
      const permutation = deterministicShuffle(uniquelyTitled, next)
      const before = permutation.map((issue) => issue.id)

      assert.deepEqual(orderIssues(permutation, 'title').map((issue) => issue.id), expected)
      assert.deepEqual(permutation.map((issue) => issue.id), before)
    }
  })

  test('groups form a lossless partition and follow Linear status order', () => {
    const groups = groupIssues(issues, 'status', 'priority')
    const flattened = groups.flatMap((group) => group.issues)

    assert.deepEqual(groups.map((group) => group.stateType), [
      'backlog',
      'unstarted',
      'started',
      'completed',
      'canceled',
    ])
    assert.equal(flattened.length, issues.length)
    assert.equal(new Set(flattened.map((issue) => issue.id)).size, issues.length)
    assert.deepEqual(
      flattened.map((issue) => issue.id).sort(),
      issues.map((issue) => issue.id).sort(),
    )
  })

  test('priority and assignee group ordering preserves special cases', () => {
    const priorityGroups = groupIssues(issues, 'priority', 'updated')
    const assigneeGroups = groupIssues(issues, 'assignee', 'created')

    assert.deepEqual(priorityGroups.map((group) => group.priority), [1, 2, 3, 4, 0])
    assert.equal(assigneeGroups.at(-1)?.key, '__none__')
    assert.equal(groupIssues(issues, 'none', 'created').length, 1)
  })
})
