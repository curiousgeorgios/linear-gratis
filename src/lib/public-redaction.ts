import type { LinearIssue, RoadmapIssue } from '@/lib/linear'
import type { PublicView, Roadmap } from '@/lib/supabase'

export function redactPublicViewIssue(issue: LinearIssue, view: PublicView): LinearIssue {
  const showPriorities = view.show_priorities !== false

  return {
    ...issue,
    description: view.show_descriptions !== false ? issue.description : undefined,
    assignee: view.show_assignees !== false ? issue.assignee : undefined,
    labels: view.show_labels !== false ? issue.labels : [],
    priority: showPriorities ? issue.priority : 0,
    priorityLabel: showPriorities ? issue.priorityLabel : 'No priority',
    estimate: showPriorities ? issue.estimate : undefined,
  }
}

export function redactRoadmapIssue(issue: RoadmapIssue, roadmap: Roadmap): RoadmapIssue {
  return {
    ...issue,
    description: roadmap.show_item_descriptions !== false ? issue.description : undefined,
    dueDate: roadmap.show_item_dates !== false ? issue.dueDate : undefined,
  }
}
