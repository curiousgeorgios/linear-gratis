'use client'

import { useMemo, useState } from 'react'
import { RoadmapCard } from './roadmap-card'
import { StateIcon } from '@/components/state-icon'
import {
  filterTimelineIssues,
  isShippedRoadmapIssue,
} from '@/lib/roadmap-issue-policy'
import type { RoadmapIssue } from '@/lib/linear'

interface TimelineViewProps {
  issues: RoadmapIssue[]
  granularity: 'month' | 'quarter'
  roadmapSlug: string
  voteCounts: Record<string, number>
  commentCounts: Record<string, number>
  fingerprint: string | null
  showDates: boolean
  showVoteCounts: boolean
  showCommentCounts: boolean
  allowVoting: boolean
  allowComments: boolean
  onIssueClick?: (issue: RoadmapIssue) => void
  onVote?: (issueId: string, voted: boolean, newCount: number) => void
}

interface TimelinePeriod {
  key: string
  label: string
  shortLabel: string
  startDate: Date
  endDate: Date
}

function generatePeriods(granularity: 'month' | 'quarter', monthsAhead: number = 12): TimelinePeriod[] {
  const periods: TimelinePeriod[] = []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  if (granularity === 'quarter') {
    // Generate quarters
    const currentQuarter = Math.floor(currentMonth / 3)
    const quartersToShow = Math.ceil(monthsAhead / 3)

    for (let i = 0; i < quartersToShow; i++) {
      const quarterIndex = (currentQuarter + i) % 4
      const yearOffset = Math.floor((currentQuarter + i) / 4)
      const year = currentYear + yearOffset
      const quarterNum = quarterIndex + 1

      const startMonth = quarterIndex * 3
      const startDate = new Date(year, startMonth, 1)
      const endDate = new Date(year, startMonth + 3, 0) // Last day of quarter

      periods.push({
        key: `${year}-Q${quarterNum}`,
        label: `Q${quarterNum} ${year}`,
        shortLabel: `Q${quarterNum}`,
        startDate,
        endDate,
      })
    }
  } else {
    // Generate months
    for (let i = 0; i < monthsAhead; i++) {
      const monthIndex = (currentMonth + i) % 12
      const yearOffset = Math.floor((currentMonth + i) / 12)
      const year = currentYear + yearOffset

      const startDate = new Date(year, monthIndex, 1)
      const endDate = new Date(year, monthIndex + 1, 0) // Last day of month

      const monthName = startDate.toLocaleDateString('en-GB', { month: 'long' })
      const shortMonth = startDate.toLocaleDateString('en-GB', { month: 'short' })

      periods.push({
        key: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
        label: `${monthName} ${year}`,
        shortLabel: shortMonth,
        startDate,
        endDate,
      })
    }
  }

  return periods
}

function getIssuePeriodKey(issue: RoadmapIssue, periods: TimelinePeriod[]): string | null {
  if (!issue.dueDate) return null

  const dueDate = new Date(issue.dueDate)

  for (const period of periods) {
    if (dueDate >= period.startDate && dueDate <= period.endDate) {
      return period.key
    }
  }

  // If due date is before the first period, put in first period
  if (dueDate < periods[0].startDate) {
    return periods[0].key
  }

  // If due date is after the last period, put in last period
  if (dueDate > periods[periods.length - 1].endDate) {
    return periods[periods.length - 1].key
  }

  return null
}

export function TimelineView({
  issues,
  granularity,
  roadmapSlug,
  voteCounts,
  commentCounts,
  fingerprint,
  showDates,
  showVoteCounts,
  showCommentCounts,
  allowVoting,
  allowComments,
  onIssueClick,
  onVote,
}: TimelineViewProps) {
  const [showShipped, setShowShipped] = useState(false)

  // Generate timeline periods
  const periods = useMemo(() => generatePeriods(granularity, 12), [granularity])
  const shippedIssues = useMemo(() => issues.filter(isShippedRoadmapIssue), [issues])
  const visibleIssues = useMemo(
    () => filterTimelineIssues(issues, showShipped),
    [issues, showShipped],
  )
  const shippedState = shippedIssues[0]?.state

  // Group issues by period and separate unscheduled
  const { groupedIssues, unscheduledIssues } = useMemo(() => {
    const groups: Record<string, RoadmapIssue[]> = {}
    const unscheduled: RoadmapIssue[] = []

    // Initialise empty arrays for each period
    periods.forEach((period) => {
      groups[period.key] = []
    })

    // Sort issues into periods
    visibleIssues.forEach((issue) => {
      const periodKey = getIssuePeriodKey(issue, periods)
      if (periodKey && groups[periodKey]) {
        groups[periodKey].push(issue)
      } else {
        unscheduled.push(issue)
      }
    })

    // Sort issues within each period by vote count (descending)
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const aVotes = voteCounts[a.id] || 0
        const bVotes = voteCounts[b.id] || 0
        return bVotes - aVotes
      })
    })

    // Sort unscheduled by vote count too
    unscheduled.sort((a, b) => {
      const aVotes = voteCounts[a.id] || 0
      const bVotes = voteCounts[b.id] || 0
      return bVotes - aVotes
    })

    return { groupedIssues: groups, unscheduledIssues: unscheduled }
  }, [visibleIssues, periods, voteCounts])

  // Get unique projects for row grouping
  const projects = useMemo(() => {
    const projectMap = new Map<string, { id: string; name: string; color?: string }>()
    visibleIssues.forEach((issue) => {
      if (issue.project && !projectMap.has(issue.project.id)) {
        projectMap.set(issue.project.id, issue.project)
      }
    })
    return Array.from(projectMap.values())
  }, [visibleIssues])

  return (
    <div className="space-y-6">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
        <p className="text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {visibleIssues.length - (showShipped ? shippedIssues.length : 0)} active{' '}
          {visibleIssues.length - (showShipped ? shippedIssues.length : 0) === 1 ? 'item' : 'items'}
        </p>

        {shippedIssues.length > 0 && (
          <button
            type="button"
            onClick={() => setShowShipped((current) => !current)}
            role="switch"
            aria-checked={showShipped}
            aria-label={`Show ${shippedIssues.length} shipped ${shippedIssues.length === 1 ? 'item' : 'items'}`}
            className="inline-flex min-h-11 touch-manipulation items-center gap-2 rounded-md border border-border/70 bg-card px-2.5 text-xs font-medium transition-[background-color,border-color,transform] duration-150 [@media(hover:hover)_and_(pointer:fine)]:hover:border-border [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <StateIcon
              type="completed"
              color={shippedState?.color || 'var(--muted-foreground)'}
              name={shippedState?.name || 'Shipped'}
              size={13}
            />
            <span>Shipped</span>
            <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums text-[10px] text-muted-foreground">
              {shippedIssues.length}
            </span>
            <span className={`min-w-[3.25rem] text-right ${showShipped ? 'text-foreground' : 'text-muted-foreground'}`}>
              {showShipped ? 'Shown' : 'Hidden'}
            </span>
            <span
              aria-hidden="true"
              className={`relative h-5 w-9 shrink-0 rounded-full p-0.5 transition-[background-color] duration-150 motion-reduce:transition-none ${
                showShipped ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`block h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-150 motion-reduce:transition-none ${
                  showShipped ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </span>
          </button>
        )}
      </div>

      {/* Timeline header */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[800px]">
          {/* Period headers */}
          <div className="flex border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
            {/* Unscheduled column */}
            <div className="flex-shrink-0 w-64 px-3 py-2 border-r border-border/30">
              <span className="text-sm font-medium text-muted-foreground">Unscheduled</span>
            </div>

            {/* Period columns */}
            {periods.map((period) => {
              const now = new Date()
              const isCurrent = now >= period.startDate && now <= period.endDate

              return (
                <div
                  key={period.key}
                  className={`flex-1 min-w-[180px] px-3 py-2 text-center border-r border-border/30 last:border-r-0 ${
                    isCurrent ? 'bg-primary/5' : ''
                  }`}
                >
                  <span className={`text-sm font-medium ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
                    {period.label}
                  </span>
                  {isCurrent && (
                    <span className="ml-2 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      Now
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Timeline rows by project */}
          {projects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No items to display
            </div>
          ) : (
            projects.map((project) => {
              const projectIssues = visibleIssues.filter((i) => i.project?.id === project.id)
              const projectUnscheduled = unscheduledIssues.filter((i) => i.project?.id === project.id)

              return (
                <div key={project.id} className="border-b border-border/30 last:border-b-0">
                  {/* Project header */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: project.color || 'var(--muted-foreground)' }}
                    />
                    <span className="text-sm font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({projectIssues.length} item{projectIssues.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Project items row */}
                  <div className="flex">
                    {/* Unscheduled column */}
                    <div className="flex-shrink-0 w-64 p-2 border-r border-border/30 bg-muted/10 space-y-2">
                      {projectUnscheduled.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">—</div>
                      ) : (
                        projectUnscheduled.map((issue) => (
                          <RoadmapCard
                            key={issue.id}
                            issue={issue}
                            roadmapSlug={roadmapSlug}
                            voteCount={voteCounts[issue.id] || 0}
                            commentCount={commentCounts[issue.id] || 0}
                            fingerprint={fingerprint}
                            showDescription={false}
                            showDates={false}
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

                    {/* Period columns */}
                    {periods.map((period) => {
                      const periodIssues = (groupedIssues[period.key] || []).filter(
                        (i) => i.project?.id === project.id
                      )
                      const now = new Date()
                      const isCurrent = now >= period.startDate && now <= period.endDate

                      return (
                        <div
                          key={period.key}
                          className={`flex-1 min-w-[180px] p-2 border-r border-border/30 last:border-r-0 space-y-2 ${
                            isCurrent ? 'bg-primary/5' : ''
                          }`}
                        >
                          {periodIssues.length === 0 ? (
                            <div className="py-4 text-center text-xs text-muted-foreground">—</div>
                          ) : (
                            periodIssues.map((issue) => (
                              <RoadmapCard
                                key={issue.id}
                                issue={issue}
                                roadmapSlug={roadmapSlug}
                                voteCount={voteCounts[issue.id] || 0}
                                commentCount={commentCounts[issue.id] || 0}
                                fingerprint={fingerprint}
                                showDescription={false}
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
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-primary/10 border border-primary/30 rounded" />
          <span>Current period</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-muted/30 rounded" />
          <span>Unscheduled items (no due date)</span>
        </div>
      </div>
    </div>
  )
}
