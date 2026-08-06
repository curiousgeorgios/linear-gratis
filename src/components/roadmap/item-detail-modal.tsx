'use client'

import { useEffect, useRef } from 'react'
import { X, MessageCircle, Calendar } from 'lucide-react'
import { VoteButton } from './vote-button'
import { CommentSection } from './comment-section'
import { StateIcon } from '@/components/state-icon'
import type { RoadmapIssue } from '@/lib/linear'

interface ItemDetailModalProps {
  isOpen: boolean
  onClose: () => void
  issue: RoadmapIssue | null
  roadmapSlug: string
  voteCount: number
  commentCount: number
  fingerprint: string | null
  allowVoting: boolean
  allowComments: boolean
  requireEmailForComments: boolean
  showVoteCounts: boolean
  onVote?: (issueId: string, voted: boolean, newCount: number) => void
}

export function ItemDetailModal({
  isOpen,
  onClose,
  issue,
  roadmapSlug,
  voteCount,
  commentCount,
  fingerprint,
  allowVoting,
  allowComments,
  requireEmailForComments,
  showVoteCounts,
  onVote,
}: ItemDetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Keep keyboard focus inside the open panel, then restore it to the card
  // which launched the dialog when the panel closes.
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (e.key !== 'Tab' || !modalRef.current) return

      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus())

    return () => {
      cancelAnimationFrame(focusFrame)
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      previouslyFocusedRef.current?.focus()
    }
  }, [isOpen])

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen || !issue) return null

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm motion-reduce:backdrop-blur-none"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-item-title"
    >
      {/* Slide-in panel */}
      <div
        ref={modalRef}
        className="h-[100dvh] w-full max-w-xl overflow-hidden border-l border-border bg-background shadow-xl animate-in slide-in-from-right duration-300 motion-reduce:animate-none"
      >
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border px-4 py-3 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Project badge */}
              {issue.project && (
                <div className="mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded"
                    style={{
                      backgroundColor: issue.project.color ? `${issue.project.color}15` : 'var(--muted)',
                      color: issue.project.color || 'var(--muted-foreground)',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: issue.project.color || 'var(--muted-foreground)' }}
                    />
                    {issue.project.name}
                  </span>
                </div>
              )}

              {/* Title */}
              <h2 id="roadmap-item-title" className="pr-8 text-lg font-semibold text-foreground">
                {issue.title}
              </h2>

              {/* Identifier */}
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {issue.identifier}
              </p>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-md transition-[color,background-color,transform] duration-150 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted active:scale-[0.96] motion-reduce:transform-none motion-reduce:transition-none"
              aria-label="Close item details"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100dvh-69px)] overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-6">
            {/* Status and vote section */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-3">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <StateIcon
                    type={issue.state.type}
                    color={issue.state.color}
                    name={issue.state.name}
                  />
                  <span className="text-sm font-medium" style={{ color: issue.state.color }}>
                    {issue.state.name}
                  </span>
                </div>

                {/* Due date */}
                {issue.dueDate && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(issue.dueDate)}</span>
                  </div>
                )}
              </div>

              {/* Vote button */}
              {allowVoting && (
                <VoteButton
                  issueId={issue.id}
                  roadmapSlug={roadmapSlug}
                  initialCount={voteCount}
                  fingerprint={fingerprint}
                  allowVoting={allowVoting}
                  showCount={showVoteCounts}
                  compact
                  onVote={onVote}
                />
              )}
            </div>

            {/* Labels */}
            {issue.labels && issue.labels.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {issue.labels.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full"
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            {issue.description && (
              <div className="prose prose-sm max-w-none">
                <h3 className="text-sm font-medium text-foreground mb-2">Description</h3>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-4">
                  {/* Simple markdown-like rendering */}
                  {issue.description
                    .split('\n')
                    .map((line, i) => {
                      // Handle headers
                      if (line.startsWith('### ')) {
                        return <h4 key={i} className="font-semibold text-foreground mt-3 mb-1">{line.slice(4)}</h4>
                      }
                      if (line.startsWith('## ')) {
                        return <h3 key={i} className="font-semibold text-foreground mt-4 mb-2">{line.slice(3)}</h3>
                      }
                      if (line.startsWith('# ')) {
                        return <h2 key={i} className="font-bold text-foreground mt-4 mb-2">{line.slice(2)}</h2>
                      }
                      // Handle bullet points
                      if (line.startsWith('- ') || line.startsWith('* ')) {
                        return <li key={i} className="ml-4">{line.slice(2)}</li>
                      }
                      // Handle empty lines
                      if (!line.trim()) {
                        return <br key={i} />
                      }
                      // Regular text
                      return <p key={i} className="mb-1">{line}</p>
                    })}
                </div>
              </div>
            )}

            {/* Comments section */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comments
                {commentCount > 0 && (
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {commentCount}
                  </span>
                )}
              </h3>

              <CommentSection
                roadmapSlug={roadmapSlug}
                issueId={issue.id}
                allowComments={allowComments}
                requireEmail={requireEmailForComments}
                fingerprint={fingerprint}
              />
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
