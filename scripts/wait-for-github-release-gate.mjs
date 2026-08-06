#!/usr/bin/env bun

const REPOSITORY = 'curiousgeorgios/linear-gratis'
const REQUIRED_CHECKS = ['Application and Worker', 'Supabase invariants']

/**
 * @typedef {{
 *   id: number,
 *   name: string,
 *   status: string,
 *   conclusion: string | null,
 * }} CheckRun
 */

function fail(message) {
  throw new Error(`[release-gate] ${message}`)
}

/** @param {CheckRun[]} checkRuns */
export function latestRequiredChecks(checkRuns) {
  const latest = new Map()
  for (const check of checkRuns) {
    if (!REQUIRED_CHECKS.includes(check.name)) continue
    const previous = latest.get(check.name)
    if (!previous || check.id > previous.id) latest.set(check.name, check)
  }
  return latest
}

/**
 * @param {{
 *   environment?: Record<string, string | undefined>,
 *   fetchImpl?: typeof fetch,
 *   intervalMs?: number,
 *   maxAttempts?: number,
 *   sleep?: (milliseconds: number) => Promise<void>,
 *   write?: (message: string) => void,
 * }} [options]
 */
export async function waitForGitHubReleaseGate({
  environment = process.env,
  fetchImpl = fetch,
  intervalMs = 15_000,
  maxAttempts = 41,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  write = (message) => console.log(message),
} = {}) {
  const commit = environment.WORKERS_CI_COMMIT_SHA?.trim()
  const branch = environment.WORKERS_CI_BRANCH?.trim()
  if (!commit || !/^[a-f0-9]{40}$/i.test(commit)) {
    fail('WORKERS_CI_COMMIT_SHA must be a full Git commit SHA')
  }
  if (branch !== 'main') fail('production deploys are restricted to the main branch')
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) fail('maxAttempts must be positive')

  const endpoint = `https://api.github.com/repos/${REPOSITORY}/commits/${commit}/check-runs?per_page=100`
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) await sleep(intervalMs)

    const response = await fetchImpl(endpoint, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'linear-gratis-workers-build',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!response.ok) fail(`GitHub checks API returned HTTP ${response.status}`)

    const payload = await response.json()
    if (!payload || !Array.isArray(payload.check_runs)) {
      fail('GitHub checks API returned an invalid response')
    }

    const latest = latestRequiredChecks(payload.check_runs)
    const failures = REQUIRED_CHECKS
      .map((name) => latest.get(name))
      .filter((check) => check?.status === 'completed' && check.conclusion !== 'success')
    if (failures.length > 0) {
      fail(failures.map((check) => `${check.name} concluded ${check.conclusion}`).join('; '))
    }

    const pending = REQUIRED_CHECKS.filter((name) => {
      const check = latest.get(name)
      return !check || check.status !== 'completed' || check.conclusion !== 'success'
    })
    if (pending.length === 0) {
      write(`[release-gate] GitHub checks passed for ${commit.slice(0, 7)}`)
      return
    }

    write(`[release-gate] waiting for ${pending.join(', ')} (${attempt}/${maxAttempts})`)
  }

  fail('timed out waiting for required GitHub checks')
}

if (import.meta.main) {
  try {
    await waitForGitHubReleaseGate()
  } catch (error) {
    console.error(error instanceof Error ? error.message : '[release-gate] unknown failure')
    process.exitCode = 1
  }
}
