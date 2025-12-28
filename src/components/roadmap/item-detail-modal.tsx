'use client'

import { useEffect, useRef } from 'react'
import { X, MessageCircle, Calendar } from 'lucide-react'
import { VoteButton } from './vote-button'
import { CommentSection } from './comment-section'
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

  // Handle escape key
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
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

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

  // Get status colour based on state type
  const getStatusColour = (stateType: string) => {
    switch (stateType) {
      case 'completed':
        return 'bg-green-500'
      case 'started':
        return 'bg-yellow-500'
      case 'backlog':
      case 'unstarted':
        return 'bg-blue-500'
      case 'canceled':
        return 'bg-gray-400'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      {/* Slide-in panel */}
      <div
        ref={modalRef}
        className="h-full w-full max-w-xl bg-background border-l border-border shadow-xl overflow-hidden animate-in slide-in-from-right duration-300"
        style={{
          animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
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
              <h2 className="text-lg font-semibold text-foreground pr-8">
                {issue.title}
              </h2>

              {/* Identifier */}
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {issue.identifier}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-64px)]">
          <div className="p-4 space-y-6">
            {/* Status and vote section */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${getStatusColour(issue.state.type)}`} />
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

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  )
}
