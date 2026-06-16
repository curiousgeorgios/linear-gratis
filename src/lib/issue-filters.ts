import type { LinearIssue } from '@/app/api/linear/issues/route'
import type { FilterState } from '@/components/filter-dropdown'

export type IssueLayout = 'list' | 'board'
export type IssueTab = 'all' | 'active' | 'backlog'
export type IssueGrouping = 'status' | 'assignee' | 'priority' | 'none'
export type IssueOrdering = 'priority' | 'created' | 'updated' | 'title'
export type DisplayProperty =
  | 'status' | 'priority' | 'assignee' | 'labels' | 'estimate' | 'created'

export interface DisplayOptions {
  layout: IssueLayout
  grouping: IssueGrouping
  ordering: IssueOrdering
  properties: Record<DisplayProperty, boolean>
}

// Visibility flags coming from the PublicView's show_* config.
export interface ViewFlags {
  showAssignees: boolean
  showPriorities: boolean
  showLabels: boolean
  showDescriptions: boolean
}

// Workflow ordering for status groups / columns (Linear's order).
export const STATE_TYPE_ORDER: Record<string, number> = {
  backlog: 0,
  unstarted: 1,
  started: 2,
  completed: 3,
  canceled: 4,
}

// Linear's real priority schema: 0 None, 1 Urgent, 2 High, 3 Medium, 4 Low.
// Sort rank puts Urgent first and No-priority last.
export const PRIORITY_RANK: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 }

export function priorityLabel(priority: number): string {
  switch (priority) {
    case 1: return 'Urgent'
    case 2: return 'High'
    case 3: return 'Medium'
    case 4: return 'Low'
    default: return 'No priority'
  }
}

export function applyTab(issues: LinearIssue[], tab: IssueTab): LinearIssue[] {
  if (tab === 'active') {
    return issues.filter(i => i.state.type === 'started' || i.state.type === 'unstarted')
  }
  if (tab === 'backlog') {
    return issues.filter(i => i.state.type === 'backlog')
  }
  return issues
}

// Extracted verbatim from kanban-board.tsx's filter block, including the gates.
export function applyFilters(
  issues: LinearIssue[],
  filters: FilterState,
  flags: ViewFlags,
): LinearIssue[] {
  return issues.filter(issue => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const inText =
        issue.title.toLowerCase().includes(q) ||
        issue.identifier.toLowerCase().includes(q) ||
        (flags.showDescriptions && !!issue.description?.toLowerCase().includes(q))
      if (!inText) return false
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(issue.state.name)) return false
    if (flags.showAssignees && filters.assignees.length > 0) {
      if (!issue.assignee || !filters.assignees.includes(issue.assignee.id)) return false
    }
    if (flags.showPriorities && filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) return false
    if (flags.showLabels && filters.labels.length > 0) {
      if (!issue.labels.some(l => filters.labels.includes(l.id))) return false
    }
    // creators: no-op (no creator data), as before.
    return true
  })
}

export interface IssueGroup {
  key: string          // stable identity for collapse state + react key
  name: string         // header label
  issues: LinearIssue[]
  // For status groups only — drives the header icon:
  stateType?: string
  stateColor?: string
  priority?: number    // for priority groups — drives header PriorityIcon
  assignee?: { name: string; avatarUrl?: string }
}

export function orderIssues(issues: LinearIssue[], ordering: IssueOrdering): LinearIssue[] {
  const sorted = [...issues]
  switch (ordering) {
    case 'priority':
      sorted.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
      break
    case 'created':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'updated':
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return sorted
}

export function groupIssues(
  issues: LinearIssue[],
  grouping: IssueGrouping,
  ordering: IssueOrdering,
): IssueGroup[] {
  if (grouping === 'none') {
    return [{ key: '__all__', name: '', issues: orderIssues(issues, ordering) }]
  }

  const map = new Map<string, IssueGroup>()
  for (const issue of issues) {
    let key: string
    let group: IssueGroup
    if (grouping === 'status') {
      key = issue.state.name
      group = map.get(key) ?? { key, name: issue.state.name, issues: [], stateType: issue.state.type, stateColor: issue.state.color }
    } else if (grouping === 'priority') {
      key = String(issue.priority)
      group = map.get(key) ?? { key, name: priorityLabel(issue.priority), issues: [], priority: issue.priority }
    } else { // assignee
      key = issue.assignee?.id ?? '__none__'
      group = map.get(key) ?? {
        key,
        name: issue.assignee?.name ?? 'No assignee',
        issues: [],
        assignee: issue.assignee ? { name: issue.assignee.name, avatarUrl: issue.assignee.avatarUrl } : undefined,
      }
    }
    group.issues.push(issue)
    map.set(key, group)
  }

  const groups = [...map.values()]
  groups.sort((a, b) => {
    if (grouping === 'status') {
      return (STATE_TYPE_ORDER[a.stateType ?? ''] ?? 99) - (STATE_TYPE_ORDER[b.stateType ?? ''] ?? 99)
    }
    if (grouping === 'priority') {
      return (PRIORITY_RANK[a.priority ?? 0] ?? 9) - (PRIORITY_RANK[b.priority ?? 0] ?? 9)
    }
    // assignee: alpha, with "No assignee" last
    if (a.key === '__none__') return 1
    if (b.key === '__none__') return -1
    return a.name.localeCompare(b.name)
  })
  for (const g of groups) g.issues = orderIssues(g.issues, ordering)
  return groups
}
