import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { hashIp } from '../src/lib/ip-hash'
import {
  beginVote,
  createVoteLifecycleState,
  reconcileVoteCount,
  settleVote,
  type VoteLifecycleState,
  type VoteSettlement,
} from '../src/lib/roadmap-vote-lifecycle'

function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state
  }
}

function expectStateInvariant(state: VoteLifecycleState) {
  assert.ok(state.count >= 0)
  assert.equal(Number.isInteger(state.count), true)
  assert.ok(state.requestId >= 0)
}

describe('IP hash fallback', () => {
  test('treats a missing or whitespace-only salt as optional metadata', () => {
    assert.equal(hashIp('203.0.113.10', undefined), null)
    assert.equal(hashIp('203.0.113.10', '   '), null)
  })

  test('is deterministic and input-sensitive over fuzzed inputs', () => {
    const next = random(0x1f2e3d4c)

    for (let index = 0; index < 2_000; index += 1) {
      const ip = `${next() % 256}.${next() % 256}.${next() % 256}.${next() % 256}`
      const salt = `${next().toString(16)}-${next().toString(16)}`
      const result = hashIp(ip, salt)

      assert.match(result ?? '', /^[a-f0-9]{64}$/)
      assert.equal(hashIp(ip, salt), result)
      assert.equal(hashIp(ip, ` ${salt} `), result)
      assert.notEqual(hashIp(`${ip}:alt`, salt), result)
      assert.notEqual(hashIp(ip, `${salt}-alt`), result)
    }
  })
})

describe('roadmap vote lifecycle', () => {
  test('blocks a double submit until the first request has a terminal outcome', () => {
    const started = beginVote(createVoteLifecycleState(4, false))
    assert.notEqual(started, null)
    if (!started) return

    assert.equal(beginVote(started.state), null)
    assert.deepEqual(settleVote(started.state, started.transaction, { type: 'rejected' }), {
      ...createVoteLifecycleState(4, false),
      requestId: started.transaction.requestId,
    })
  })

  test('metamorphic fuzzing preserves lifecycle invariants across success, failure, duplicates, refreshes, and stale replies', () => {
    const next = random(0x5eedc0de)

    for (let index = 0; index < 5_000; index += 1) {
      const initialCount = next() % 1_000
      const initiallyVoted = (next() & 1) === 1
      const original = createVoteLifecycleState(initialCount, initiallyVoted)
      const started = beginVote(original)

      assert.notEqual(started, null)
      if (!started) continue

      const { state: optimistic, transaction } = started
      expectStateInvariant(optimistic)
      assert.equal(optimistic.isPending, true)
      assert.equal(optimistic.hasVoted, !initiallyVoted)
      assert.equal(optimistic.count,
        initiallyVoted ? Math.max(0, initialCount - 1) : initialCount + 1,
      )

      // Metamorphic relation: a concurrent parent refresh must not alter an
      // in-flight transaction, no matter which count it supplies.
      const staleRefreshCount = next() % 1_000
      assert.equal(reconcileVoteCount(optimistic, staleRefreshCount), optimistic)

      const serverCount = next() % 1_000
      const reportedCount = (next() & 1) === 0 ? serverCount : undefined
      const kind = next() % 3
      const settlement: VoteSettlement = kind === 0
        ? { type: 'confirmed', voteCount: reportedCount }
        : kind === 1
          ? { type: 'already-voted', voteCount: reportedCount }
          : { type: 'rejected' }
      const terminal = settleVote(optimistic, transaction, settlement)

      expectStateInvariant(terminal)
      assert.equal(terminal.isPending, false)
      if (settlement.type === 'rejected') {
        assert.equal(terminal.count, original.count)
        assert.equal(terminal.hasVoted, original.hasVoted)
      } else {
        assert.equal(terminal.count, reportedCount ?? optimistic.count)
        assert.equal(terminal.hasVoted,
          settlement.type === 'already-voted' || transaction.intent === 'add',
        )
      }

      // Replaying any terminal reply is idempotent and cannot resurrect a
      // rollback after a successful save.
      assert.equal(settleVote(terminal, transaction, { type: 'rejected' }), terminal)
      assert.equal(settleVote(terminal, transaction, { type: 'confirmed', voteCount: 0 }), terminal)

      // Metamorphic relation: once idle, a server refresh becomes canonical
      // and applying the same refresh twice is stable.
      const refreshed = reconcileVoteCount(terminal, staleRefreshCount)
      expectStateInvariant(refreshed)
      assert.deepEqual(reconcileVoteCount(refreshed, staleRefreshCount), refreshed)

      // A response from an older request must never overwrite a newer one.
      const nextStarted = beginVote(refreshed)
      assert.notEqual(nextStarted, null)
      if (!nextStarted) continue
      assert.equal(settleVote(nextStarted.state, transaction, settlement), nextStarted.state)
    }
  })

  test('normalises malformed external counts without producing a negative vote count', () => {
    const baseline = createVoteLifecycleState(-3.9, false)
    assert.equal(baseline.count, 0)

    const negative = reconcileVoteCount(baseline, -100)
    const fractional = reconcileVoteCount(baseline, 4.8)
    const nonFinite = reconcileVoteCount(baseline, Number.NaN)

    assert.equal(negative.count, 0)
    assert.equal(fractional.count, 4)
    assert.equal(nonFinite.count, 0)
  })
})
