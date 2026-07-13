'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { IssueDetail } from '@/app/api/public-view/[slug]/issue/[issueId]/route'
import {
  getStateIcon,
  LinearMarkdown,
  formatDate,
  formatRelativeDate,
  formatAbsoluteDate,
} from '@/components/issue-detail-shared'
import { PriorityIcon, EstimateIcon } from '@/components/priority-icon'
import { UserAvatar } from '@/components/user-avatar'

interface IssueDetailViewProps {
  issueId: string
  viewSlug: string
  backHref: string
  backLabel: string
  brandName?: string
  logoUrl?: string
  onBack: () => void
  showComments?: boolean
  showActivity?: boolean
  showDescriptions?: boolean
  showAssignees?: boolean
  showLabels?: boolean
  showPriorities?: boolean
}

export function IssueDetailView({
  issueId,
  viewSlug,
  backHref,
  backLabel,
  brandName,
  logoUrl,
  onBack,
  showComments = false,
  showActivity = false,
  showDescriptions = true,
  showAssignees = true,
  showLabels = true,
  showPriorities = true,
}: IssueDetailViewProps) {
  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>(showActivity ? 'activity' : 'comments')

  // Load the issue detail (same endpoint the old modal used).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/public-view/${viewSlug}/issue/${issueId}`)
        const data = await response.json() as { success?: boolean; issue?: IssueDetail; error?: string }
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load issue details')
        if (!cancelled) setIssue(data.issue || null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load issue details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [issueId, viewSlug])

  // Escape returns to the list (Linear behaviour). No body scroll lock: a full
  // page should scroll normally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  // Reflect the open issue in the tab title, restoring the list's title on exit.
  const previousTitle = useRef<string>('')
  useEffect(() => { previousTitle.current = document.title }, [])
  useEffect(() => {
    if (!issue) return
    const suffix = brandName ? ` - ${brandName}` : ''
    document.title = `${issue.identifier} ${issue.title}${suffix}`
  }, [issue, brandName])
  useEffect(() => () => { if (previousTitle.current) document.title = previousTitle.current }, [])

  // Combine comments and history for the activity view (ported from the modal).
  const activityItems = issue ? [
    ...issue.comments.map(comment => ({
      type: 'comment' as const,
      id: comment.id,
      createdAt: comment.createdAt,
      user: comment.user,
      body: comment.body,
    })),
    ...issue.history.map(history => ({
      type: 'history' as const,
      id: history.id,
      createdAt: history.createdAt,
      user: history.user,
      fromState: history.fromState,
      toState: history.toState,
      fromAssignee: history.fromAssignee,
      toAssignee: history.toAssignee,
      fromPriority: history.fromPriority,
      toPriority: history.toPriority,
    })),
  ].filter(item => {
    // Filter out items without a user
    if (!item.user || !item.user.name) return false

    // For history items, only include if they have meaningful changes
    if (item.type === 'history') {
      const hasStatusChange = item.toState && item.fromState
      const hasAssigneeChange = item.toAssignee || item.fromAssignee
      const hasPriorityChange = item.toPriority !== undefined && item.fromPriority !== undefined && item.toPriority !== item.fromPriority
      return hasStatusChange || hasAssigneeChange || hasPriorityChange
    }

    return true
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []

  return (
    <div className="min-h-screen bg-background linear-gradient-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <a
            href={backHref}
            onClick={(e) => { e.preventDefault(); onBack() }}
            aria-label={`Back to ${backLabel}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-0"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, host not known at build time
              <img src={logoUrl} alt={brandName || 'Logo'} className="h-5 w-auto object-contain" />
            ) : (
              <span className="truncate">{backLabel}</span>
            )}
          </a>
          {issue && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-mono text-muted-foreground shrink-0">/</span>
              <span className="text-sm font-mono text-muted-foreground font-semibold shrink-0">{issue.identifier}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                {getStateIcon(issue.state.type, issue.state.color)}
                <span className="text-sm text-muted-foreground">{issue.state.name}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto mt-12 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {issue && !loading && (
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            {/* Main column */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight mb-4">{issue.title}</h1>

              {/* Mobile-only properties block, under the title */}
              <div className="lg:hidden mb-6">
                <IssueProperties
                  issue={issue}
                  showAssignees={showAssignees}
                  showLabels={showLabels}
                  showPriorities={showPriorities}
                />
              </div>

              {showDescriptions && issue.description && (
                <div className="mb-8">
                  <LinearMarkdown references={issue.referencedIssues}>
                    {issue.description}
                  </LinearMarkdown>
                </div>
              )}

              {/* Activity/Comments Tabs - only rendered when the view settings expose them */}
              {(showActivity || showComments) && (
              <div className="border-t border-border pt-6">
                <div className="flex items-center gap-4 mb-6">
                  {showActivity && (
                    <button
                      onClick={() => setActiveTab('activity')}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                        activeTab === 'activity'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Activity
                    </button>
                  )}
                  {showComments && (
                    <button
                      onClick={() => setActiveTab('comments')}
                      className={`text-sm font-medium pb-2 border-b-2 transition-colors ${
                        activeTab === 'comments'
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Comments ({issue.comments.length})
                    </button>
                  )}
                </div>

                {/* Activity Tab */}
                {showActivity && activeTab === 'activity' && (
                  <div className="space-y-4">
                    {activityItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                    )}
                    {activityItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <UserAvatar name={item.user?.name} avatarUrl={item.user?.avatarUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{item.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                          </div>
                          {item.type === 'comment' && (
                            <div className="bg-accent/30 rounded-lg p-3">
                              <LinearMarkdown
                                references={issue.referencedIssues}
                                className="text-sm text-foreground"
                              >
                                {item.body}
                              </LinearMarkdown>
                            </div>
                          )}
                          {item.type === 'history' && (() => {
                            const changes = []

                            // Status change
                            if (item.toState && item.fromState) {
                              changes.push(
                                <div key="status">
                                  changed status from <span className="font-medium text-foreground">{item.fromState.name}</span> to <span className="font-medium text-foreground">{item.toState.name}</span>
                                </div>
                              )
                            }

                            // Assignee change
                            if (item.toAssignee && item.fromAssignee) {
                              changes.push(
                                <div key="assignee-change">
                                  changed assignee from <span className="font-medium text-foreground">{item.fromAssignee.name}</span> to <span className="font-medium text-foreground">{item.toAssignee.name}</span>
                                </div>
                              )
                            } else if (item.toAssignee && !item.fromAssignee) {
                              changes.push(
                                <div key="assignee-set">
                                  assigned to <span className="font-medium text-foreground">{item.toAssignee.name}</span>
                                </div>
                              )
                            } else if (!item.toAssignee && item.fromAssignee) {
                              changes.push(
                                <div key="assignee-unset">
                                  unassigned <span className="font-medium text-foreground">{item.fromAssignee.name}</span>
                                </div>
                              )
                            }

                            // Priority change - only show if both values exist and are different
                            if (item.toPriority !== undefined && item.fromPriority !== undefined && item.toPriority !== item.fromPriority) {
                              // Linear's priority scheme: 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
                              const priorityLabels: Record<number, string> = {
                                0: 'None',
                                1: 'Urgent',
                                2: 'High',
                                3: 'Medium',
                                4: 'Low',
                              }
                              changes.push(
                                <div key="priority">
                                  changed priority from <span className="font-medium text-foreground">{priorityLabels[item.fromPriority] || item.fromPriority}</span> to <span className="font-medium text-foreground">{priorityLabels[item.toPriority] || item.toPriority}</span>
                                </div>
                              )
                            }

                            return changes.length > 0 ? (
                              <div className="text-sm text-muted-foreground space-y-1">
                                {changes}
                              </div>
                            ) : null
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments Tab */}
                {showComments && activeTab === 'comments' && (
                  <div className="space-y-4">
                    {issue.comments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                    )}
                    {issue.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <UserAvatar name={comment.user?.name} avatarUrl={comment.user?.avatarUrl} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{comment.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                          </div>
                          <div className="bg-accent/30 rounded-lg p-3">
                            <LinearMarkdown
                              references={issue.referencedIssues}
                              className="text-sm text-foreground"
                            >
                              {comment.body}
                            </LinearMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-20">
                <IssueProperties
                  issue={issue}
                  showAssignees={showAssignees}
                  showLabels={showLabels}
                  showPriorities={showPriorities}
                />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}

function PropertyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-foreground min-w-0">{children}</span>
    </div>
  )
}

function IssueProperties({
  issue,
  showAssignees,
  showLabels,
  showPriorities,
}: {
  issue: IssueDetail
  showAssignees: boolean
  showLabels: boolean
  showPriorities: boolean
}) {
  return (
    <div className="space-y-3">
      <PropertyGroup title="Properties">
        <PropertyRow label="Status">
          {getStateIcon(issue.state.type, issue.state.color)}
          <span className="truncate">{issue.state.name}</span>
        </PropertyRow>
        {showPriorities && (
          <PropertyRow label="Priority">
            <PriorityIcon priority={issue.priority} priorityLabel={issue.priorityLabel} className="w-4 h-4" />
            <span className="truncate">{issue.priorityLabel}</span>
          </PropertyRow>
        )}
        {showPriorities && issue.estimate != null && issue.estimate > 0 && (
          <PropertyRow label="Estimate">
            <EstimateIcon className="w-4 h-4" />
            <span>{issue.estimate}</span>
          </PropertyRow>
        )}
        {showAssignees && issue.assignee && (
          <PropertyRow label="Assignee">
            <UserAvatar name={issue.assignee.name} avatarUrl={issue.assignee.avatarUrl} />
            <span className="truncate">{issue.assignee.name}</span>
          </PropertyRow>
        )}
      </PropertyGroup>

      {showLabels && issue.labels.length > 0 && (
        <PropertyGroup title="Labels">
          <div className="flex flex-wrap gap-1.5">
            {issue.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/50 px-2 py-0.5 text-xs text-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </span>
            ))}
          </div>
        </PropertyGroup>
      )}

      <PropertyGroup title="Dates">
        <PropertyRow label="Created">
          <span title={formatAbsoluteDate(issue.createdAt)}>{formatRelativeDate(issue.createdAt)}</span>
        </PropertyRow>
        <PropertyRow label="Updated">
          <span title={formatAbsoluteDate(issue.updatedAt)}>{formatRelativeDate(issue.updatedAt)}</span>
        </PropertyRow>
      </PropertyGroup>
    </div>
  )
}
