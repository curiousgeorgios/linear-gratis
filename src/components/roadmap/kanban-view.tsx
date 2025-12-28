'use client'

import { useMemo } from 'react'
import { RoadmapCard } from './roadmap-card'
import type { RoadmapIssue } from '@/lib/linear'
import type { KanbanColumn } from '@/lib/supabase'

interface KanbanViewProps {
  issues: RoadmapIssue[]
  columns: KanbanColumn[]
  roadmapSlug: string
  voteCounts: Record<string, number>
  commentCounts: Record<string, number>
  fingerprint: string | null
  showDescriptions: boolean
  showDates: boolean
  showVoteCounts: boolean
  showCommentCounts: boolean
  allowVoting: boolean
  allowComments: boolean
  onIssueClick?: (issue: RoadmapIssue) => void
  onVote?: (issueId: string, voted: boolean, newCount: number) => void
}

// Column header icons based on column key
const ColumnIcon = ({ columnKey }: { columnKey: string }) => {
  switch (columnKey) {
    case 'planned':
      return (
        <svg className="h-4 w-4 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
    case 'in_progress':
      return (
        <svg className="h-4 w-4 text-yellow-500" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 8 L8 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case 'shipped':
      return (
        <svg className="h-4 w-4 text-green-500" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8 L7 10 L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      )
    default:
      return (
        <svg className="h-4 w-4 text-muted-foreground" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}

export function KanbanView({
  issues,
  columns,
  roadmapSlug,
  voteCounts,
  commentCounts,
  fingerprint,
  showDescriptions,
  showDates,
  showVoteCounts,
  showCommentCounts,
  allowVoting,
  allowComments,
  onIssueClick,
  onVote,
}: KanbanViewProps) {
  // Group issues by column based on state type
  const groupedIssues = useMemo(() => {
    const groups: Record<string, RoadmapIssue[]> = {}

    // Initialise empty arrays for each column
    columns.forEach((column) => {
      groups[column.key] = []
    })

    // Sort issues into columns based on their state type
    issues.forEach((issue) => {
      const stateType = issue.state.type
      const column = columns.find((col) => col.state_types.includes(stateType))
      if (column) {
        groups[column.key].push(issue)
      }
    })

    // Sort issues within each column by vote count (descending)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const aVotes = voteCounts[a.id] || 0
        const bVotes = voteCounts[b.id] || 0
        return bVotes - aVotes
      })
    })

    return groups
  }, [issues, columns, voteCounts])

  return (
    <div
      className="w-full pb-4 flex gap-4 overflow-x-auto lg:grid lg:overflow-visible"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((column) => {
        const columnIssues = groupedIssues[column.key] || []

        return (
          <div
            key={column.key}
            className="flex-shrink-0 w-72 lg:w-auto lg:flex-shrink lg:min-w-0 bg-muted/30 rounded-lg"
          >
            {/* Column header */}
            <div className="sticky top-0 bg-muted/50 backdrop-blur-sm rounded-t-lg border-b border-border/50 px-3 py-2.5 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ColumnIcon columnKey={column.key} />
                  <h3 className="text-sm font-medium text-foreground">
                    {column.label}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded">
                  {columnIssues.length}
                </span>
              </div>
            </div>

            {/* Column content */}
            <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
              {columnIssues.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No items
                </div>
              ) : (
                columnIssues.map((issue) => (
                  <RoadmapCard
                    key={issue.id}
                    issue={issue}
                    roadmapSlug={roadmapSlug}
                    voteCount={voteCounts[issue.id] || 0}
                    commentCount={commentCounts[issue.id] || 0}
                    fingerprint={fingerprint}
                    showDescription={showDescriptions}
                    showDates={showDates}
                    showVoteCounts={showVoteCounts}
                    showCommentCounts={showCommentCounts}
                    allowVoting={allowVoting}
                    allowComments={allowComments}
                    onClick={() => onIssueClick?.(issue)}
                    onVote={onVote}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
