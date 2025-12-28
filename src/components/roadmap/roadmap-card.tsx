'use client'

import { MessageCircle } from 'lucide-react'
import { VoteButton } from './vote-button'
import type { RoadmapIssue } from '@/lib/linear'

interface RoadmapCardProps {
  issue: RoadmapIssue
  roadmapSlug: string
  voteCount: number
  commentCount: number
  fingerprint: string | null
  showDescription: boolean
  showDates: boolean
  showVoteCounts: boolean
  showCommentCounts: boolean
  allowVoting: boolean
  allowComments: boolean
  onClick?: () => void
  onVote?: (issueId: string, voted: boolean, newCount: number) => void
}

export function RoadmapCard({
  issue,
  roadmapSlug,
  voteCount,
  commentCount,
  fingerprint,
  showDescription,
  showDates,
  showVoteCounts,
  showCommentCounts,
  allowVoting,
  allowComments,
  onClick,
  onVote,
}: RoadmapCardProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    })
  }

  return (
    <div
      onClick={onClick}
      className="group bg-card border border-border rounded-lg p-3 cursor-pointer hover:border-border/80 hover:shadow-sm transition-all duration-200"
    >
      <div className="flex gap-3">
        {/* Vote button */}
        {allowVoting && (
          <div className="flex-shrink-0">
            <VoteButton
              issueId={issue.id}
              roadmapSlug={roadmapSlug}
              initialCount={voteCount}
              fingerprint={fingerprint}
              allowVoting={allowVoting}
              showCount={showVoteCounts}
              onVote={onVote}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Project badge */}
          {issue.project && (
            <div className="mb-1.5">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded"
                style={{
                  backgroundColor: issue.project.color ? `${issue.project.color}15` : 'var(--muted)',
                  color: issue.project.color || 'var(--muted-foreground)',
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: issue.project.color || 'var(--muted-foreground)' }}
                />
                {issue.project.name}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {issue.title}
          </h3>

          {/* Description */}
          {showDescription && issue.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {issue.description.replace(/[#*_`]/g, '').slice(0, 150)}
            </p>
          )}

          {/* Footer */}
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {/* Due date */}
            {showDates && issue.dueDate && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M4 1a.75.75 0 0 1 .75.75V3h6.5V1.75a.75.75 0 0 1 1.5 0V3h1.5A1.75 1.75 0 0 1 16 4.75v9.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25v-9.5A1.75 1.75 0 0 1 1.75 3h1.5V1.75A.75.75 0 0 1 4 1ZM1.75 4.5a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25H1.75ZM4 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM4 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
                </svg>
                {formatDate(issue.dueDate)}
              </span>
            )}

            {/* Comment count */}
            {showCommentCounts && allowComments && commentCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {commentCount}
              </span>
            )}

            {/* Labels */}
            {issue.labels && issue.labels.length > 0 && (
              <div className="flex items-center gap-1 overflow-hidden">
                {issue.labels.slice(0, 2).map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded truncate max-w-[80px]"
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {issue.labels.length > 2 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{issue.labels.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
