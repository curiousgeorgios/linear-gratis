import { ChevronUp } from 'lucide-react'

interface VoteCountProps {
  count: number
  votingClosed?: boolean
}

export function VoteCount({ count, votingClosed = false }: VoteCountProps) {
  const voteLabel = `${count} ${count === 1 ? 'vote' : 'votes'}`
  const accessibleLabel = votingClosed
    ? `${voteLabel}. Voting is closed for this item.`
    : voteLabel

  return (
    <span
      aria-label={accessibleLabel}
      title={votingClosed ? 'Voting is closed for this item' : voteLabel}
      className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-transparent bg-muted/50 px-2 text-xs font-medium tabular-nums text-muted-foreground"
    >
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
      {count}
    </span>
  )
}
