import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  latestRequiredChecks,
  waitForGitHubReleaseGate,
} from '../scripts/wait-for-github-release-gate.mjs'

const environment = {
  WORKERS_CI_BRANCH: 'main',
  WORKERS_CI_COMMIT_SHA: '08c447c000000000000000000000000000000000',
}

function response(checkRuns: Array<Record<string, unknown>>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ check_runs: checkRuns }),
  } as Response
}

const successChecks = [
  { id: 10, name: 'Application and Worker', status: 'completed', conclusion: 'success' },
  { id: 11, name: 'Supabase invariants', status: 'completed', conclusion: 'success' },
]

describe('GitHub production release gate', () => {
  test('fails closed outside main or without an immutable commit', async () => {
    for (const invalidEnvironment of [
      {},
      { ...environment, WORKERS_CI_BRANCH: 'feature/preview' },
      { ...environment, WORKERS_CI_COMMIT_SHA: '08c447c' },
    ]) {
      await assert.rejects(() => waitForGitHubReleaseGate({
        environment: invalidEnvironment,
        fetchImpl: async () => response(successChecks),
        sleep: async () => undefined,
        write: () => undefined,
      }))
    }
  })

  test('waits through missing and in-progress checks, then accepts either success order', async () => {
    for (const completed of [successChecks, [...successChecks].reverse()]) {
      const payloads = [
        [{ id: 1, name: 'Workers Builds: linear-gratis', status: 'in_progress', conclusion: null }],
        [{ id: 2, name: 'Application and Worker', status: 'in_progress', conclusion: null }],
        completed,
      ]
      let request = 0
      const messages: string[] = []

      await waitForGitHubReleaseGate({
        environment,
        fetchImpl: async () => response(payloads[request++]),
        intervalMs: 0,
        maxAttempts: payloads.length,
        sleep: async () => undefined,
        write: (message) => messages.push(message),
      })

      assert.equal(request, payloads.length)
      assert.match(messages.at(-1) ?? '', /checks passed/)
    }
  })

  test('uses the newest run for each required check and ignores unrelated checks', () => {
    const selected = latestRequiredChecks([
      { id: 1, name: 'Application and Worker', status: 'completed', conclusion: 'failure' },
      { id: 9, name: 'Application and Worker', status: 'completed', conclusion: 'success' },
      { id: 8, name: 'Supabase invariants', status: 'completed', conclusion: 'success' },
      { id: 99, name: 'Workers Builds: linear-gratis', status: 'completed', conclusion: 'failure' },
    ])

    assert.equal(selected.size, 2)
    assert.equal(selected.get('Application and Worker')?.id, 9)
    assert.equal(selected.get('Supabase invariants')?.id, 8)
  })

  test('rejects every non-success terminal conclusion before deployment', async () => {
    for (const conclusion of ['failure', 'cancelled', 'timed_out', 'neutral', 'action_required']) {
      await assert.rejects(() => waitForGitHubReleaseGate({
        environment,
        fetchImpl: async () => response([
          { ...successChecks[0], conclusion },
          successChecks[1],
        ]),
        sleep: async () => undefined,
        write: () => undefined,
      }), new RegExp(`concluded ${conclusion}`))
    }
  })

  test('rejects API errors, malformed responses, and timeouts', async () => {
    await assert.rejects(() => waitForGitHubReleaseGate({
      environment,
      fetchImpl: async () => response([], 403),
      sleep: async () => undefined,
      write: () => undefined,
    }), /HTTP 403/)

    await assert.rejects(() => waitForGitHubReleaseGate({
      environment,
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({}) }) as Response,
      sleep: async () => undefined,
      write: () => undefined,
    }), /invalid response/)

    await assert.rejects(() => waitForGitHubReleaseGate({
      environment,
      fetchImpl: async () => response([]),
      intervalMs: 0,
      maxAttempts: 2,
      sleep: async () => undefined,
      write: () => undefined,
    }), /timed out/)
  })
})
