#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function run(label, command, args, extraEnv = {}) {
  console.log(`\n[tests] ${label}`)
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: { ...process.env, ...extraEnv },
    stdio: 'inherit',
  })

  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}

run('unit, property, contract, and render coverage', 'bun', [
  'test',
  '--coverage',
  '--coverage-reporter=text',
  '--coverage-reporter=lcov',
  '--coverage-dir=coverage',
])
run('coverage thresholds', 'bun', ['scripts/check-coverage.mjs'])

if (!process.argv.includes('--coverage-only')) {
  run('TypeScript', 'bunx', ['tsc', '--noEmit'])
  run('lint', 'bun', ['run', 'lint'])
  run('production Cloudflare Worker build', 'bun', ['run', 'build:worker'])
  if (process.argv.includes('--skip-browser-smoke')) {
    console.log('\n[tests] browser smoke delegated to the required GitHub release check')
  } else {
    run('headless production-page smoke tests', 'bun', ['scripts/test-site-smoke.mjs'], {
      SMOKE_SKIP_BUILD: '1',
    })
  }
}
