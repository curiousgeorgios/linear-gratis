type IssueWithState = {
  state: {
    type: string
  }
}

const ACTIVE_ROADMAP_STATE_TYPES = new Set(['backlog', 'unstarted', 'started'])

export function isShippedRoadmapIssue(issue: IssueWithState): boolean {
  return issue.state.type === 'completed'
}

export function isRoadmapStateOpenForVoting(stateType: string): boolean {
  return ACTIVE_ROADMAP_STATE_TYPES.has(stateType)
}

/**
 * Timeline is an active-work view by default. Completed work is an optional
 * overlay; canceled, triage, duplicate, and unknown workflow types stay out of
 * the public timeline so it matches the roadmap's supported Kanban buckets.
 */
export function filterTimelineIssues<T extends IssueWithState>(
  issues: readonly T[],
  showShipped: boolean,
): T[] {
  return issues.filter((issue) => (
    ACTIVE_ROADMAP_STATE_TYPES.has(issue.state.type)
    || (showShipped && isShippedRoadmapIssue(issue))
  ))
}
