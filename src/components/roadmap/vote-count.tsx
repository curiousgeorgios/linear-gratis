'use client'

import { ChevronUp } from 'lucide-react'
import { useT } from '@/lib/i18n/client'

interface VoteCountProps {
  count: number
  votingClosed?: boolean
}

export function VoteCount({ count, votingClosed = false }: VoteCountProps) {
  const t = useT()
  const voteLabel = count === 1 ? t('1 vote') : t('{count} votes', { count })
  const accessibleLabel = votingClosed
    ? t('{label}. Voting is closed for this item.', { label: voteLabel })
    : voteLabel

  return (
    <span
      aria-label={accessibleLabel}
      title={votingClosed ? t('Voting is closed for this item') : voteLabel}
      className="inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md border border-transparent bg-muted/50 px-2 text-xs font-medium tabular-nums text-muted-foreground"
    >
      <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
      {count}
    </span>
  )
}
