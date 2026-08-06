import type { LinearIssue } from '../../src/lib/linear'

export function makeLinearIssue(
  id: string,
  overrides: Partial<LinearIssue> = {},
): LinearIssue {
  const index = Number.parseInt(id.replace(/\D/g, ''), 10) || 0
  const base: LinearIssue = {
    id,
    identifier: `TST-${index}`,
    title: `Issue ${index}`,
    description: `Description ${index}`,
    priority: index % 5,
    priorityLabel: ['No priority', 'Urgent', 'High', 'Medium', 'Low'][index % 5],
    estimate: index % 8,
    url: `https://linear.app/issue/TST-${index}`,
    state: {
      id: `state-${index % 5}`,
      name: ['Backlog', 'Todo', 'In Progress', 'Done', 'Canceled'][index % 5],
      color: '#5e6ad2',
      type: ['backlog', 'unstarted', 'started', 'completed', 'canceled'][index % 5],
    },
    assignee: index % 3 === 0
      ? undefined
      : {
          id: `user-${index % 3}`,
          name: `User ${index % 3}`,
        },
    labels: index % 2 === 0
      ? [{ id: 'label-even', name: 'Even', color: '#22c55e' }]
      : [{ id: 'label-odd', name: 'Odd', color: '#f59e0b' }],
    createdAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
    updatedAt: new Date(Date.UTC(2026, 1, index + 1)).toISOString(),
  }

  return {
    ...base,
    ...overrides,
    state: overrides.state ?? base.state,
    labels: overrides.labels ?? base.labels,
  }
}
