'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronUp } from 'lucide-react'

interface VoteButtonProps {
  issueId: string
  roadmapSlug: string
  initialCount: number
  fingerprint: string | null
  allowVoting: boolean
  showCount: boolean
  onVote?: (issueId: string, voted: boolean, newCount: number) => void
}

export function VoteButton({
  issueId,
  roadmapSlug,
  initialCount,
  fingerprint,
  allowVoting,
  showCount,
  onVote,
}: VoteButtonProps) {
  const [count, setCount] = useState(initialCount)
  const [hasVoted, setHasVoted] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const pendingRequest = useRef<AbortController | null>(null)

  // Check localStorage for existing vote
  useEffect(() => {
    const votedItems = localStorage.getItem(`roadmap_votes_${roadmapSlug}`)
    if (votedItems) {
      try {
        const parsed = JSON.parse(votedItems) as string[]
        setHasVoted(parsed.includes(issueId))
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [issueId, roadmapSlug])

  // Sync count when initialCount changes (from parent state)
  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  const updateLocalStorage = (voted: boolean) => {
    const votedItems = localStorage.getItem(`roadmap_votes_${roadmapSlug}`)
    let parsed: string[] = []
    if (votedItems) {
      try {
        parsed = JSON.parse(votedItems) as string[]
      } catch {
        // Ignore
      }
    }

    if (voted) {
      if (!parsed.includes(issueId)) {
        parsed.push(issueId)
      }
    } else {
      parsed = parsed.filter((id) => id !== issueId)
    }

    localStorage.setItem(`roadmap_votes_${roadmapSlug}`, JSON.stringify(parsed))
  }

  const handleVote = async () => {
    if (!allowVoting || !fingerprint) return

    // Cancel any pending request
    if (pendingRequest.current) {
      pendingRequest.current.abort()
    }

    const willVote = !hasVoted
    const previousCount = count
    const previousVoted = hasVoted

    // Optimistic update
    const newCount = willVote ? count + 1 : count - 1
    setCount(newCount)
    setHasVoted(willVote)
    updateLocalStorage(willVote)
    setIsAnimating(true)

    // Notify parent immediately for optimistic UI
    onVote?.(issueId, willVote, newCount)

    // Clear animation after a short delay
    setTimeout(() => setIsAnimating(false), 200)

    // Create abort controller for this request
    const controller = new AbortController()
    pendingRequest.current = controller

    try {
      const response = await fetch(`/api/roadmap/${roadmapSlug}/vote`, {
        method: willVote ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, fingerprint }),
        signal: controller.signal,
      })

      if (!response.ok && response.status !== 409) {
        // Revert on error (except 409 which means already voted)
        setCount(previousCount)
        setHasVoted(previousVoted)
        updateLocalStorage(previousVoted)
        onVote?.(issueId, previousVoted, previousCount)
      } else if (response.ok) {
        // Sync with server count if available
        const data = await response.json() as { voteCount: number }
        if (data.voteCount !== newCount) {
          setCount(data.voteCount)
          onVote?.(issueId, willVote, data.voteCount)
        }
      } else if (response.status === 409) {
        // Already voted - ensure state is synced
        if (!willVote) {
          // Tried to vote but already voted, keep voted state
          setHasVoted(true)
          updateLocalStorage(true)
        }
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      // Revert on network error
      console.error('Vote error:', error)
      setCount(previousCount)
      setHasVoted(previousVoted)
      updateLocalStorage(previousVoted)
      onVote?.(issueId, previousVoted, previousCount)
    } finally {
      pendingRequest.current = null
    }
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        handleVote()
      }}
      disabled={!allowVoting || !fingerprint}
      className={`
        flex flex-col items-center justify-center gap-0.5 px-2 py-1.5 rounded-md
        text-xs font-medium transition-all duration-200 ease-out
        ${hasVoted
          ? 'bg-primary/10 text-primary border border-primary/30'
          : 'bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted hover:border-border'
        }
        ${!allowVoting || !fingerprint ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
      `}
      title={hasVoted ? 'Remove vote' : 'Upvote this item'}
    >
      <ChevronUp
        className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${
          hasVoted ? 'text-primary' : ''
        } ${isAnimating && hasVoted ? 'scale-125' : ''}`}
      />
      {showCount && (
        <span className={`transition-transform duration-150 ${hasVoted ? 'text-primary' : ''} ${isAnimating ? 'scale-110' : ''}`}>
          {count}
        </span>
      )}
    </button>
  )
}
