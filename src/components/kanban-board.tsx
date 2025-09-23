'use client'

import { LinearIssue } from '@/app/api/linear/issues/route'
import { FilterState } from '@/components/filter-dropdown'

interface KanbanBoardProps {
  issues: LinearIssue[]
  showAssignees?: boolean
  showLabels?: boolean
  showPriorities?: boolean
  showDescriptions?: boolean
  className?: string
  filters?: FilterState
  allowIssueCreation?: boolean
  onCreateIssue?: (columnName: string) => void
}

const getPriorityIcon = (priority: number) => {
  if (priority === 0) {
    return (
      <svg className="w-3.5 h-3.5 text-muted-foreground/70" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      </svg>
    )
  }

  if (priority >= 3) {
    return (
      <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M3.741 14.5h8.521c1.691 0 2.778-1.795 1.993-3.293l-4.26-8.134c-.842-1.608-3.144-1.608-3.986 0l-4.26 8.134C.962 12.705 2.05 14.5 3.74 14.5ZM8 3.368a.742.742 0 0 0-.663.402l-4.26 8.134A.75.75 0 0 0 3.741 13H8V3.367Z" clipRule="evenodd"></path>
      </svg>
    )
  }

  return (
    <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
      <rect x="11.5" y="2" width="3" height="12" rx="1"></rect>
    </svg>
  )
}

const getStateIcon = (stateType: string, color: string) => {
  const strokeColor = color || '#9ca3af'

  if (stateType === 'completed') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5"></circle>
        <path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  }

  if (stateType === 'started') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
        <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="6.094689747964199" transform="rotate(-90 7 7)"></circle>
      </svg>
    )
  }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
      <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 7 7)"></circle>
    </svg>
  )
}

export function KanbanBoard({
  issues,
  showAssignees = true,
  showPriorities = true,
  className = '',
  filters,
  allowIssueCreation = false,
  onCreateIssue
}: KanbanBoardProps) {
  // Filter issues based on provided filters
  const filteredIssues = filters ? issues.filter(issue => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!issue.title.toLowerCase().includes(searchLower) &&
          !issue.identifier.toLowerCase().includes(searchLower) &&
          !(issue.description?.toLowerCase().includes(searchLower))) {
        return false
      }
    }

    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(issue.state.name)) {
      return false
    }

    // Assignee filter
    if (filters.assignees.length > 0) {
      if (!issue.assignee || !filters.assignees.includes(issue.assignee.id)) {
        return false
      }
    }

    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) {
      return false
    }

    // Labels filter
    if (filters.labels.length > 0) {
      const hasMatchingLabel = issue.labels.some(label => filters.labels.includes(label.id))
      if (!hasMatchingLabel) {
        return false
      }
    }

    // Creator filter (placeholder - would need additional API data)
    if (filters.creators.length > 0) {
      // For now, we'll skip this filter since we don't have creator data
      // In a real implementation, you'd filter by issue.creator.id
    }

    return true
  }) : issues

  // Group filtered issues by their state
  const groupedIssues = filteredIssues.reduce((acc, issue) => {
    const stateName = issue.state.name
    if (!acc[stateName]) {
      acc[stateName] = {
        issues: [],
        color: issue.state.color,
        type: issue.state.type
      }
    }
    acc[stateName].issues.push(issue)
    return acc
  }, {} as Record<string, { issues: LinearIssue[], color: string, type: string }>)

  const columns = Object.keys(groupedIssues).sort()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }


  if (filteredIssues.length === 0 && issues.length > 0) {
    return (
      <div className="text-center py-20">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">No issues match your filters</div>
          <div className="text-sm">Try adjusting your filter criteria to see more results.</div>
        </div>
      </div>
    )
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-muted-foreground">
          <div className="text-lg font-medium mb-2">No issues found</div>
          <div className="text-sm">This view doesn&apos;t contain any issues yet.</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Linear-style board container */}
      <div className="flex gap-1 overflow-x-auto pb-4 px-1">
        {columns.map((columnName) => {
          const column = groupedIssues[columnName]
          const columnColor = column.color || '#9ca3af'

          return (
            <div key={columnName} className="flex-shrink-0 w-80 sm:w-[356px] group">
              {/* Column Header - matching Linear's exact structure */}
              <div className="flex flex-row h-12 w-full pl-1" style={{ paddingLeft: '4px' }}>
                <div className="w-full" style={{ width: '348px' }}>
                  <div className="flex items-center justify-between p-3 mb-2">
                    <div className="flex items-center gap-2">
                      {getStateIcon(column.type, columnColor)}
                      <span className="text-sm font-medium text-foreground tracking-tight">
                        {columnName}
                      </span>
                      <div className="flex items-center justify-center px-2 py-0.5 bg-muted/60 rounded-full">
                        <span className="text-xs font-medium text-muted-foreground">
                          {column.issues.length}
                        </span>
                      </div>
                    </div>

                    {allowIssueCreation && (
                      <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-accent rounded transition-colors opacity-60 group-hover:opacity-100">
                          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
                          </svg>
                        </button>
                        <button
                          className="p-1 hover:bg-accent rounded transition-colors opacity-60 group-hover:opacity-100"
                          onClick={() => onCreateIssue?.(columnName)}
                          aria-label={`Create issue in ${columnName}`}
                        >
                          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.75 4C8.75 3.58579 8.41421 3.25 8 3.25C7.58579 3.25 7.25 3.58579 7.25 4V7.25H4C3.58579 7.25 3.25 7.58579 3.25 8C3.25 8.41421 3.58579 8.75 4 8.75H7.25V12C7.25 12.4142 7.58579 12.75 8 12.75C8.41421 12.75 8.75 12.4142 8.75 12V8.75H12C12.4142 8.75 12.75 8.41421 12.75 8C12.75 7.58579 12.4142 7.25 12 7.25H8.75V4Z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Issues Column - matching Linear's exact structure */}
              <div className="flex flex-row w-full pl-1" style={{ paddingLeft: '4px' }}>
                <div className="w-full" style={{ width: '348px' }}>
                  <div className="space-y-2 px-1">
                    {column.issues.map((issue) => (
                      <div key={issue.id} className="linear-hover-lift">
                          {/* Issue Card - matching Linear's exact structure */}
                          <div className="bg-card border border-border/40 rounded-md hover:border-border/60 hover:shadow-sm transition-all duration-200 group">
                            <div className="relative p-3">
                              {/* Top row: Issue ID, Status Icon, and Assignee */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground/80 tracking-wider font-semibold">
                                    {issue.identifier}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    {getStateIcon(issue.state.type, issue.state.color)}
                                  </div>
                                </div>

                                {/* Assignee in top right */}
                                {showAssignees && issue.assignee && (
                                  <div className="flex-shrink-0">
                                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                      {getInitials(issue.assignee.name)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Issue title */}
                              <div className="mb-3">
                                <h4 className="text-sm font-medium text-foreground leading-tight tracking-tight line-clamp-2">
                                  {issue.title}
                                </h4>
                              </div>

                              {/* Bottom badges row */}
                              <div className="flex items-center gap-1 flex-wrap">

                                {/* Priority badge */}
                                {showPriorities && (
                                  <div
                                    className="flex items-center gap-1 text-xs font-medium overflow-hidden flex-shrink-0 transition-colors duration-150 hover:text-white"
                                    style={{
                                      borderRadius: '4px',
                                      height: '22px',
                                      padding: '4px',
                                      border: '0.5px solid lch(22.5 4.707 272)',
                                      backgroundColor: 'lch(8.3 1.867 272)',
                                      color: 'lch(62.6% 1.35 272 / 1)',
                                      maxWidth: '134px'
                                    }}
                                  >
                                    {getPriorityIcon(issue.priority)}
                                  </div>
                                )}



                                {/* Label badges */}
                                {issue.labels.map((label) => (
                                  <div
                                    key={label.id}
                                    className="flex items-center gap-1 text-xs font-medium overflow-hidden flex-shrink-0 transition-colors duration-150 hover:text-white"
                                    style={{
                                      borderRadius: '4px',
                                      height: '22px',
                                      padding: '4px',
                                      border: '0.5px solid lch(22.5 4.707 272)',
                                      backgroundColor: 'lch(8.3 1.867 272)',
                                      color: 'lch(62.6% 1.35 272 / 1)',
                                      maxWidth: '134px'
                                    }}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: label.color }}
                                    />
                                    <span>{label.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                      </div>
                    ))}

                    {column.issues.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground/60">
                        <div className="text-sm">No issues</div>
                      </div>
                    )}

                    {/* Add issue button */}
                    {allowIssueCreation && (
                      <div className="pt-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          className="w-full p-3 border-2 border-dashed border-border/40 rounded-md hover:border-border/60 hover:bg-accent/20 transition-all duration-200 text-muted-foreground hover:text-foreground"
                          onClick={() => onCreateIssue?.(columnName)}
                          aria-label={`Create issue in ${columnName}`}
                        >
                          <svg className="w-4 h-4 mx-auto" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8.75 4C8.75 3.58579 8.41421 3.25 8 3.25C7.58579 3.25 7.25 3.58579 7.25 4V7.25H4C3.58579 7.25 3.25 7.58579 3.25 8C3.25 8.41421 3.58579 8.75 4 8.75H7.25V12C7.25 12.4142 7.58579 12.75 8 12.75C8.41421 12.75 8.75 12.4142 8.75 12V8.75H12C12.4142 8.75 12.75 8.41421 12.75 8C12.75 7.58579 12.4142 7.25 12 7.25H8.75V4Z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}