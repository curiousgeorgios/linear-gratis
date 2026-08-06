#!/usr/bin/env node

import { readFile, readdir } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const connectionString = process.env.TEST_DATABASE_URL
if (!connectionString) {
  console.error('TEST_DATABASE_URL is required and must point to a local disposable Supabase database.')
  process.exit(1)
}

let databaseUrl
try {
  databaseUrl = new URL(connectionString)
} catch {
  console.error('TEST_DATABASE_URL is not a valid PostgreSQL URL.')
  process.exit(1)
}

const localHosts = new Set(['127.0.0.1', 'localhost', '::1'])
if (!localHosts.has(databaseUrl.hostname)) {
  console.error(`Refusing to run rollback tests against non-local host ${databaseUrl.hostname}.`)
  process.exit(1)
}

const testsDirectory = path.join(process.cwd(), 'supabase/tests')
const files = (await readdir(testsDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort()
const psqlProbe = spawnSync('psql', ['--version'], { stdio: 'ignore' })
const hasLocalPsql = !psqlProbe.error && psqlProbe.status === 0

let dockerContainer
if (!hasLocalPsql) {
  const config = await readFile(path.join(process.cwd(), 'supabase/config.toml'), 'utf8')
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1]
  if (!projectId) {
    console.error('Unable to determine the local Supabase project id from supabase/config.toml.')
    process.exit(1)
  }
  dockerContainer = `supabase_db_${projectId}`
}

for (const file of files) {
  console.log(`[database] ${file}`)
  const filePath = path.join(testsDirectory, file)
  const result = hasLocalPsql
    ? spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', filePath], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PGCONNECT_TIMEOUT: '5',
          PGDATABASE: connectionString,
        },
        stdio: 'inherit',
      })
    : spawnSync('docker', [
        'exec',
        '-i',
        dockerContainer,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
      ], {
        cwd: process.cwd(),
        input: await readFile(filePath),
        stdio: ['pipe', 'inherit', 'inherit'],
      })

  if (result.error) {
    console.error(`Unable to run psql: ${result.error.message}`)
    process.exit(1)
  }
  if (result.status !== 0) process.exit(result.status ?? 1)
}

console.log(`[database] ${files.length} rollback-only schema tests passed.`)
