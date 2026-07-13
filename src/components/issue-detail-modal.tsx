'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { IssueDetail } from '@/app/api/public-view/[slug]/issue/[issueId]/route'
import { PriorityIcon, EstimateIcon } from '@/components/priority-icon'
import { UserAvatar } from '@/components/user-avatar'
import { getStateIcon, LinearMarkdown, formatDate } from '@/components/issue-detail-shared'

interface IssueDetailModalProps {
  isOpen: boolean
  onClose: () => void
  issueId: string
  viewSlug: string
  showComments?: boolean
  showActivity?: boolean
  showDescriptions?: boolean
  showAssignees?: boolean
  showLabels?: boolean
  showPriorities?: boolean
}

export function IssueDetailModal({
  isOpen,
  onClose,
  issueId,
  viewSlug,
  showComments = false,
  showActivity = false,
  showDescriptions = true,
  showAssignees = true,
  showLabels = true,
  showPriorities = true,
}: IssueDetailModalProps) {
  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>(showActivity ? 'activity' : 'comments')

  useEffect(() => {
    if (isOpen && issueId) {
      loadIssue()
    }
  }, [isOpen, issueId]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadIssue = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/public-view/${viewSlug}/issue/${issueId}`)
      const data = await response.json() as { success?: boolean; issue?: IssueDetail; error?: string }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to load issue details')
      }

      setIssue(data.issue || null)
    } catch (err) {
      console.error('Error loading issue:', err)
      setError(err instanceof Error ? err.message : 'Failed to load issue details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Combine comments and history for activity view
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
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative h-full w-full max-w-2xl bg-background border-l border-border shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {issue && (
              <>
                <span className="text-sm font-mono text-muted-foreground font-semibold">
                  {issue.identifier}
                </span>
                <div className="flex items-center gap-2">
                  {getStateIcon(issue.state.type, issue.state.color)}
                  <span className="text-sm text-muted-foreground">{issue.state.name}</span>
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8">
                <svg className="animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}

          {error && (
            <div className="p-6">
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            </div>
          )}

          {issue && !loading && (
            <div className="px-6 py-6">
              {/* Title */}
              <h2 className="text-2xl font-semibold tracking-tight mb-4">
                {issue.title}
              </h2>

              {/* Metadata row */}
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                {/* Priority */}
                {showPriorities && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded-md">
                  <PriorityIcon
                    priority={issue.priority}
                    priorityLabel={issue.priorityLabel}
                    className="w-4 h-4"
                  />
                  <span className="text-xs font-medium text-foreground">{issue.priorityLabel}</span>
                </div>
                )}

                {/* Estimate */}
                {showPriorities && issue.estimate != null && issue.estimate > 0 && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded-md">
                    <EstimateIcon className="w-4 h-4" />
                    <span className="text-xs font-medium text-foreground">{issue.estimate}</span>
                  </div>
                )}

                {/* Assignee */}
                {showAssignees && issue.assignee && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded-md">
                    <UserAvatar name={issue.assignee.name} avatarUrl={issue.assignee.avatarUrl} />
                    <span className="text-xs font-medium text-foreground">{issue.assignee.name}</span>
                  </div>
                )}

                {/* Labels */}
                {showLabels && issue.labels.map((label) => (
                  <div
                    key={label.id}
                    className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded-md"
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="text-xs font-medium text-foreground">{label.name}</span>
                  </div>
                ))}
              </div>

              {/* Description */}
              {showDescriptions && issue.description && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-foreground mb-3">Description</h3>
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
          )}
        </div>
      </div>
    </div>
  )
}
