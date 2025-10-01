'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IssueDetail } from '@/app/api/public-view/[slug]/issue/[issueId]/route'

interface IssueDetailModalProps {
  isOpen: boolean
  onClose: () => void
  issueId: string
  viewSlug: string
}

const getPriorityIcon = (priority: number) => {
  if (priority === 0) {
    return (
      <svg className="w-4 h-4 text-muted-foreground/70" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      </svg>
    )
  }

  if (priority >= 3) {
    return (
      <svg className="w-4 h-4 text-orange-500" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M3.741 14.5h8.521c1.691 0 2.778-1.795 1.993-3.293l-4.26-8.134c-.842-1.608-3.144-1.608-3.986 0l-4.26 8.134C.962 12.705 2.05 14.5 3.74 14.5ZM8 3.368a.742.742 0 0 0-.663.402l-4.26 8.134A.75.75 0 0 0 3.741 13H8V3.367Z" clipRule="evenodd"></path>
      </svg>
    )
  }

  return (
    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
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
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5"></circle>
        <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  }

  if (stateType === 'started') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
        <circle className="progress" cx="8" cy="8" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="6.094689747964199" transform="rotate(-90 8 8)"></circle>
      </svg>
    )
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
      <circle className="progress" cx="8" cy="8" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 8 8)"></circle>
    </svg>
  )
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMins = Math.floor(diffInMs / 60000)
  const diffInHours = Math.floor(diffInMs / 3600000)
  const diffInDays = Math.floor(diffInMs / 86400000)

  if (diffInMins < 1) return 'just now'
  if (diffInMins < 60) return `${diffInMins}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function IssueDetailModal({ isOpen, onClose, issueId, viewSlug }: IssueDetailModalProps) {
  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>('activity')

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
                <div className="flex items-center gap-1.5 px-2 py-1 bg-accent/50 rounded-md">
                  {getPriorityIcon(issue.priority)}
                  <span className="text-xs font-medium text-foreground">{issue.priorityLabel}</span>
                </div>

                {/* Assignee */}
                {issue.assignee && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-accent/50 rounded-md">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                      {getInitials(issue.assignee.name)}
                    </div>
                    <span className="text-xs font-medium text-foreground">{issue.assignee.name}</span>
                  </div>
                )}

                {/* Labels */}
                {issue.labels.map((label) => (
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
              {issue.description && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-foreground mb-3">Description</h3>
                  <div className="prose prose-sm max-w-none text-foreground/90 markdown-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Checkboxes
                        input: ({ node, ...props }) => (
                          <input
                            {...props}
                            className="mr-2 accent-primary cursor-default"
                            disabled
                          />
                        ),
                        // Links
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        // Code blocks
                        code: ({ node, className, ...props }) => {
                          const isInline = !className || !className.includes('language-');
                          return isInline ? (
                            <code {...props} className="bg-accent/60 px-1.5 py-0.5 rounded text-sm font-mono" />
                          ) : (
                            <code {...props} className="block bg-accent/60 p-3 rounded-md text-sm font-mono overflow-x-auto" />
                          )
                        },
                        // Lists
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="list-disc list-inside space-y-1 my-2" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="list-decimal list-inside space-y-1 my-2" />
                        ),
                        // Paragraphs
                        p: ({ node, ...props }) => (
                          <p {...props} className="my-2 leading-relaxed" />
                        ),
                        // Headings
                        h1: ({ node, ...props }) => (
                          <h1 {...props} className="text-xl font-semibold mt-6 mb-3" />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 {...props} className="text-lg font-semibold mt-5 mb-2" />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 {...props} className="text-base font-semibold mt-4 mb-2" />
                        ),
                        // Images
                        img: ({ node, ...props }) => (
                          <img {...props} className="rounded-lg max-w-full my-4" />
                        ),
                        // Blockquotes
                        blockquote: ({ node, ...props }) => (
                          <blockquote {...props} className="border-l-4 border-border pl-4 italic text-muted-foreground my-3" />
                        ),
                        // Horizontal rules
                        hr: ({ node, ...props }) => (
                          <hr {...props} className="border-border my-4" />
                        ),
                        // Tables
                        table: ({ node, ...props }) => (
                          <div className="overflow-x-auto my-4">
                            <table {...props} className="min-w-full border border-border rounded-md" />
                          </div>
                        ),
                        thead: ({ node, ...props }) => (
                          <thead {...props} className="bg-accent/40" />
                        ),
                        th: ({ node, ...props }) => (
                          <th {...props} className="border border-border px-3 py-2 text-left font-medium" />
                        ),
                        td: ({ node, ...props }) => (
                          <td {...props} className="border border-border px-3 py-2" />
                        ),
                      }}
                    >
                      {issue.description}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Activity/Comments Tabs */}
              <div className="border-t border-border pt-6">
                <div className="flex items-center gap-4 mb-6">
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
                </div>

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {activityItems.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No activity yet</p>
                    )}
                    {activityItems.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                          {item.user?.name ? getInitials(item.user.name) : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{item.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                          </div>
                          {item.type === 'comment' && (
                            <div className="text-sm text-foreground bg-accent/30 rounded-lg p-3 whitespace-pre-wrap">
                              {item.body}
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
                              const priorityLabels: Record<number, string> = {
                                0: 'None',
                                1: 'Low',
                                2: 'Medium',
                                3: 'High',
                                4: 'Urgent'
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
                {activeTab === 'comments' && (
                  <div className="space-y-4">
                    {issue.comments.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
                    )}
                    {issue.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary flex-shrink-0">
                          {comment.user?.name ? getInitials(comment.user.name) : '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-foreground">{comment.user?.name || 'Unknown'}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                          </div>
                          <div className="text-sm text-foreground bg-accent/30 rounded-lg p-3 whitespace-pre-wrap">
                            {comment.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
