'use client'

import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { LinearIssue } from '@/app/api/linear/issues/route'
import { StateIcon } from '@/components/state-icon'
import { PriorityIcon, EstimateIcon } from '@/components/priority-icon'
import { UserAvatar } from '@/components/user-avatar'
import { groupIssues, type DisplayOptions, type ViewFlags } from '@/lib/issue-filters'

interface IssueListViewProps {
  issues: LinearIssue[] // already tab + filter reduced by IssuesView
  display: DisplayOptions
  flags: ViewFlags
  allowIssueCreation: boolean
  totalCount: number // unreduced count, for the empty-state message
  onIssueClick: (id: string) => void
  onCreateIssue: (stateName?: string) => void
}

function formatDate(iso: string): string {
  // Month-first ("Jun 16") to match Linear's list rows exactly.
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function IssueListView({
  issues,
  display,
  flags,
  allowIssueCreation,
  totalCount,
  onIssueClick,
  onCreateIssue,
}: IssueListViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (totalCount === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">No issues found</div>
          <div className="text-sm">This view doesn&apos;t contain any issues yet.</div>
        </div>
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">No issues match your filters</div>
          <div className="text-sm">Try adjusting your filter criteria to see more results.</div>
        </div>
      </div>
    )
  }

  const groups = groupIssues(issues, display.grouping, display.ordering)
  const grouped = display.grouping !== 'none'

  return (
    <div className="w-full rounded-md border border-border/60 overflow-hidden bg-card/40">
      {groups.map(group => {
        const isCollapsed = grouped && collapsed.has(group.key)
        return (
          <div key={group.key}>
            {grouped && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleCollapse(group.key)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    toggleCollapse(group.key)
                  }
                }}
                className="group/header flex items-center gap-2 h-9 px-3 bg-muted/40 border-b border-border/50 cursor-pointer select-none hover:bg-muted/60 transition-colors"
              >
                <ChevronRight
                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none ${
                    isCollapsed ? '' : 'rotate-90'
                  }`}
                />
                {display.grouping === 'status' && (
                  <StateIcon type={group.stateType ?? ''} color={group.stateColor ?? ''} />
                )}
                {display.grouping === 'priority' && (
                  <PriorityIcon priority={group.priority ?? 0} priorityLabel={group.name} />
                )}
                {display.grouping === 'assignee' && (
                  <UserAvatar name={group.assignee?.name} avatarUrl={group.assignee?.avatarUrl} />
                )}
                <span className="text-sm font-medium text-foreground tracking-tight">{group.name}</span>
                <span className="text-xs text-muted-foreground">{group.issues.length}</span>
                {allowIssueCreation && (
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      onCreateIssue(display.grouping === 'status' ? group.name : undefined)
                    }}
                    className="ml-auto opacity-0 group-hover/header:opacity-100 p-1 rounded hover:bg-accent transition-opacity duration-150"
                    aria-label="New issue"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {!isCollapsed &&
              group.issues.map(issue => (
                <button
                  key={issue.id}
                  onClick={() => onIssueClick(issue.identifier)}
                  className="flex items-center gap-2 w-full h-9 px-3 text-left border-b border-border/40 last:border-b-0 hover:bg-accent/50 transition-colors duration-150"
                >
                  {display.properties.priority && flags.showPriorities && (
                    <span className="flex-shrink-0">
                      <PriorityIcon priority={issue.priority} priorityLabel={issue.priorityLabel} />
                    </span>
                  )}
                  <span className="flex-shrink-0 w-16 text-xs font-mono text-muted-foreground/80 whitespace-nowrap">
                    {issue.identifier}
                  </span>
                  {display.properties.status && (
                    <span className="flex-shrink-0">
                      <StateIcon type={issue.state.type} color={issue.state.color} />
                    </span>
                  )}
                  <span className="flex-1 min-w-0 truncate text-sm text-foreground">{issue.title}</span>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {display.properties.labels &&
                      flags.showLabels &&
                      issue.labels.map(label => (
                        <span
                          key={label.id}
                          className="hidden sm:flex items-center gap-1 h-[22px] px-1.5 rounded border border-border bg-accent/40 text-xs text-muted-foreground max-w-[140px]"
                        >
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                          <span className="truncate">{label.name}</span>
                        </span>
                      ))}
                    {display.properties.estimate && flags.showPriorities && issue.estimate != null && issue.estimate > 0 && (
                      <span className="hidden sm:flex items-center gap-1 h-[22px] px-1.5 rounded border border-border bg-accent/40 text-xs text-muted-foreground">
                        <EstimateIcon />
                        <span>{issue.estimate}</span>
                      </span>
                    )}
                    {display.properties.assignee &&
                      flags.showAssignees &&
                      (issue.assignee ? (
                        <UserAvatar name={issue.assignee.name} avatarUrl={issue.assignee.avatarUrl} />
                      ) : (
                        <span className="w-5 h-5 rounded-full border border-dashed border-border/70 flex-shrink-0" />
                      ))}
                    {display.properties.created && (
                      <span className="hidden sm:block w-[52px] text-right text-xs text-muted-foreground">
                        {formatDate(issue.createdAt)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )
      })}
    </div>
  )
}
