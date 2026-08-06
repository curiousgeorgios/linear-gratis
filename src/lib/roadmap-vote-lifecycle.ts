export type VoteIntent = 'add' | 'remove'

export type VoteLifecycleState = {
  count: number
  hasVoted: boolean
  isPending: boolean
  requestId: number
}

export type VoteTransaction = {
  requestId: number
  previous: Pick<VoteLifecycleState, 'count' | 'hasVoted'>
  intent: VoteIntent
}

export type VoteSettlement =
  | { type: 'confirmed'; voteCount?: number }
  | { type: 'already-voted'; voteCount?: number }
  | { type: 'rejected' }

function normaliseVoteCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

export function createVoteLifecycleState(
  count: number,
  hasVoted = false,
): VoteLifecycleState {
  return {
    count: normaliseVoteCount(count),
    hasVoted,
    isPending: false,
    requestId: 0,
  }
}

/** Begin a single optimistic mutation. A second mutation is rejected until the
 * first reaches a terminal state, avoiding add/remove races on slow networks. */
export function beginVote(
  state: VoteLifecycleState,
): { state: VoteLifecycleState; transaction: VoteTransaction } | null {
  if (state.isPending) return null

  const intent: VoteIntent = state.hasVoted ? 'remove' : 'add'
  const requestId = state.requestId + 1
  const countDelta = intent === 'add' ? 1 : -1

  return {
    state: {
      count: normaliseVoteCount(state.count + countDelta),
      hasVoted: intent === 'add',
      isPending: true,
      requestId,
    },
    transaction: {
      requestId,
      previous: { count: state.count, hasVoted: state.hasVoted },
      intent,
    },
  }
}

/** Apply a terminal response only if it belongs to the latest mutation. */
export function settleVote(
  state: VoteLifecycleState,
  transaction: VoteTransaction,
  settlement: VoteSettlement,
): VoteLifecycleState {
  if (!state.isPending || state.requestId !== transaction.requestId) return state

  if (settlement.type === 'rejected') {
    return {
      ...state,
      ...transaction.previous,
      isPending: false,
    }
  }

  const voteCount = settlement.voteCount === undefined
    ? state.count
    : normaliseVoteCount(settlement.voteCount)

  return {
    ...state,
    count: voteCount,
    hasVoted: settlement.type === 'already-voted' || transaction.intent === 'add',
    isPending: false,
  }
}

/** Parent refreshes are authoritative once idle but cannot clobber an active
 * optimistic request with a stale count. */
export function reconcileVoteCount(
  state: VoteLifecycleState,
  serverCount: number,
): VoteLifecycleState {
  if (state.isPending) return state

  return {
    ...state,
    count: normaliseVoteCount(serverCount),
  }
}
