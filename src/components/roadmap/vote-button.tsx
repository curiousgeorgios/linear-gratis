'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import {
  beginVote,
  createVoteLifecycleState,
  reconcileVoteCount,
  settleVote,
  type VoteLifecycleState,
} from '@/lib/roadmap-vote-lifecycle'

interface VoteButtonProps {
  issueId: string
  roadmapSlug: string
  initialCount: number
  fingerprint: string | null
  allowVoting: boolean
  showCount: boolean
  compact?: boolean
  onVote?: (issueId: string, voted: boolean, newCount: number) => void
}

type VoteResponse = {
  error?: unknown
  voteCount?: unknown
}

const VOTE_TOAST_ID = 'roadmap-vote-status'

function getStoredVoteIds(roadmapSlug: string): string[] {
  try {
    const value = localStorage.getItem(`roadmap_votes_${roadmapSlug}`)
    if (!value) return []

    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')
      ? parsed
      : []
  } catch {
    return []
  }
}

function getVoteCount(response: VoteResponse): number | undefined {
  return typeof response.voteCount === 'number' && Number.isFinite(response.voteCount)
    ? response.voteCount
    : undefined
}

function getErrorMessage(response: VoteResponse): string {
  return typeof response.error === 'string' && response.error.trim()
    ? response.error
    : 'Please try again.'
}

export function VoteButton({
  issueId,
  roadmapSlug,
  initialCount,
  fingerprint,
  allowVoting,
  showCount,
  compact = false,
  onVote,
}: VoteButtonProps) {
  const [voteState, setVoteState] = useState<VoteLifecycleState>(() =>
    createVoteLifecycleState(initialCount),
  )
  const [isAnimating, setIsAnimating] = useState(false)
  const voteStateRef = useRef(voteState)
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateVoteState = (nextState: VoteLifecycleState) => {
    voteStateRef.current = nextState
    setVoteState(nextState)
  }

  const updateLocalStorage = (voted: boolean) => {
    try {
      const parsed = getStoredVoteIds(roadmapSlug)
      const next = voted
        ? (parsed.includes(issueId) ? parsed : [...parsed, issueId])
        : parsed.filter((id) => id !== issueId)

      localStorage.setItem(`roadmap_votes_${roadmapSlug}`, JSON.stringify(next))
    } catch {
      // Private browsing and storage-quota failures must not block voting.
    }
  }

  const publishVote = (state: VoteLifecycleState) => {
    onVote?.(issueId, state.hasVoted, state.count)
  }

  // Restore a visitor's visual vote state when the card or roadmap changes.
  useEffect(() => {
    const current = voteStateRef.current
    if (current.isPending) return

    const nextState = {
      ...current,
      hasVoted: getStoredVoteIds(roadmapSlug).includes(issueId),
    }
    updateVoteState(nextState)
  }, [issueId, roadmapSlug])

  // A refresh may arrive while the vote request is in flight. Preserve the
  // local transaction until it settles, then accept the server count.
  useEffect(() => {
    updateVoteState(reconcileVoteCount(voteStateRef.current, initialCount))
  }, [initialCount])

  useEffect(() => () => {
    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
  }, [])

  const handleVote = async () => {
    if (!allowVoting || !fingerprint) return

    const started = beginVote(voteStateRef.current)
    if (!started) return

    updateVoteState(started.state)
    updateLocalStorage(started.state.hasVoted)
    publishVote(started.state)
    setIsAnimating(true)

    if (animationTimeoutRef.current) clearTimeout(animationTimeoutRef.current)
    animationTimeoutRef.current = setTimeout(() => setIsAnimating(false), 200)

    try {
      const response = await fetch(`/api/roadmap/${roadmapSlug}/vote`, {
        method: started.transaction.intent === 'add' ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, fingerprint }),
      })
      const payload = await response.json().catch(() => ({})) as VoteResponse

      const settlement = response.ok
        ? { type: 'confirmed' as const, voteCount: getVoteCount(payload) }
        : response.status === 409
          ? { type: 'already-voted' as const, voteCount: getVoteCount(payload) }
          : { type: 'rejected' as const }
      const settledState = settleVote(voteStateRef.current, started.transaction, settlement)

      updateVoteState(settledState)
      updateLocalStorage(settledState.hasVoted)
      publishVote(settledState)

      if (!response.ok && response.status !== 409) {
        toast.error('Could not save your vote', {
          id: VOTE_TOAST_ID,
          description: getErrorMessage(payload),
        })
      }
    } catch (error) {
      console.error('Vote error:', error)
      const settledState = settleVote(voteStateRef.current, started.transaction, { type: 'rejected' })

      updateVoteState(settledState)
      updateLocalStorage(settledState.hasVoted)
      publishVote(settledState)
      toast.error('Could not save your vote', {
        id: VOTE_TOAST_ID,
        description: 'Network error. Please try again.',
      })
    }
  }

  const isDisabled = !allowVoting || !fingerprint || voteState.isPending
  const title = voteState.isPending
    ? 'Saving vote…'
    : voteState.hasVoted
      ? 'Remove vote'
      : 'Upvote this item'

  return (
    <button
      onClick={(event) => {
        event.stopPropagation()
        void handleVote()
      }}
      disabled={isDisabled}
      aria-busy={voteState.isPending}
      aria-pressed={voteState.hasVoted}
      aria-label={title}
      className={`
        inline-flex min-h-11 min-w-11 items-center justify-center rounded-md touch-manipulation
        text-xs font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out
        motion-reduce:transform-none motion-reduce:transition-none
        ${compact ? 'flex-row gap-0.5 px-2' : 'flex-col gap-0.5'}
        ${voteState.hasVoted
          ? 'bg-primary/10 text-primary border border-primary/30'
          : 'bg-muted/50 text-muted-foreground border border-transparent [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:border-border'
        }
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.96]'}
      `}
      title={title}
    >
      <ChevronUp
        className={`h-3.5 w-3.5 transition-transform duration-150 ease-out motion-reduce:transform-none motion-reduce:transition-none ${
          voteState.hasVoted ? 'text-primary' : ''
        } ${isAnimating && voteState.hasVoted ? 'scale-125' : ''}`}
      />
      {showCount && (
        <span className={`tabular-nums transition-transform duration-150 motion-reduce:transform-none motion-reduce:transition-none ${voteState.hasVoted ? 'text-primary' : ''} ${isAnimating ? 'scale-110' : ''}`}>
          {voteState.count}
        </span>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {voteState.isPending
          ? 'Saving vote'
          : voteState.hasVoted
            ? `Voted. ${voteState.count} votes.`
            : `${voteState.count} votes.`}
      </span>
    </button>
  )
}
