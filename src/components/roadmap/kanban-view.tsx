'use client'

import { useMemo } from 'react'
import { RoadmapCard } from './roadmap-card'
import { StateIcon } from '@/components/state-icon'
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

// Roadmap columns are presentation buckets rather than Linear states, so map
// their keys to the closest Linear workflow category and reuse StateIcon.
const ColumnIcon = ({ columnKey }: { columnKey: string }) => {
  switch (columnKey) {
    case 'planned':
      return <StateIcon type="unstarted" color="#3b82f6" name="Planned" size={16} />
    case 'in_progress':
      return <StateIcon type="started" color="#eab308" name="In progress" size={16} />
    case 'shipped':
      return <StateIcon type="completed" color="#22c55e" name="Shipped" size={16} />
    default:
      return <StateIcon type="unstarted" color="currentColor" size={16} />
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
      aria-label="Roadmap board"
      className="-mx-2 flex w-[calc(100%+1rem)] snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-px-2 px-2 pb-4 touch-pan-x sm:mx-0 sm:w-full sm:gap-4 sm:px-0 lg:grid lg:overflow-visible"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      {columns.map((column) => {
        const columnIssues = groupedIssues[column.key] || []

        return (
          <div
            key={column.key}
            className="w-[calc(100vw-1.5rem)] max-w-72 flex-shrink-0 snap-start rounded-lg bg-muted/30 lg:w-auto lg:max-w-none lg:flex-shrink lg:min-w-0"
          >
            {/* Column header */}
            <div className="sticky top-0 z-10 rounded-t-lg border-b border-border/50 bg-muted/90 px-3 py-2.5 backdrop-blur-sm">
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
            <div className="space-y-2 p-2 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
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
