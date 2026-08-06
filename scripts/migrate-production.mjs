#!/usr/bin/env bun

import { spawnSync } from 'node:child_process'
import postgres from 'postgres'

const DEPLOYMENT_LOCK = 'linear-gratis:production-migrations'
const REQUIRED_ENVIRONMENT = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_DB_HOST',
  'SUPABASE_DB_PASSWORD',
  'SUPABASE_DB_USER',
]
const CHILD_ENVIRONMENT_ALLOWLIST = [
  'BUN_INSTALL',
  'CI',
  'FORCE_COLOR',
  'HOME',
  'HTTPS_PROXY',
  'HTTP_PROXY',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'NO_COLOR',
  'NO_PROXY',
  'PATH',
  'SHELL',
  'TERM',
  'TMP',
  'TEMP',
  'TMPDIR',
  'TZ',
  'USER',
  'XDG_CACHE_HOME',
  'XDG_CONFIG_HOME',
]

/**
 * @typedef {Record<string, string | undefined>} DeploymentEnvironment
 * @typedef {{
 *   database: string,
 *   host: string,
 *   password: string,
 *   port: number,
 *   projectRef: string,
 *   user: string,
 * }} ProductionDatabaseConfig
 * @typedef {{
 *   status: number | null,
 *   stdout?: string | Buffer,
 *   stderr?: string | Buffer,
 *   error?: Error,
 * }} SpawnResult
 * @typedef {{
 *   unsafe: (query: string, parameters?: unknown[]) => Promise<Record<string, unknown>[]>,
 *   end: (options: { timeout: number }) => Promise<unknown>,
 * }} MigrationSql
 */

function fail(message) {
  throw new Error(`[migrations] ${message}`)
}

/**
 * @param {DeploymentEnvironment} [environment]
 * @returns {ProductionDatabaseConfig}
 */
export function readProductionDatabaseConfig(environment = process.env) {
  const missing = REQUIRED_ENVIRONMENT.filter((name) => !environment[name]?.trim())
  if (missing.length > 0) {
    fail(`missing required Infisical variables: ${missing.join(', ')}`)
  }

  let publicUrl
  try {
    publicUrl = new URL(environment.NEXT_PUBLIC_SUPABASE_URL)
  } catch {
    fail('NEXT_PUBLIC_SUPABASE_URL is not a valid URL')
  }

  if (publicUrl.protocol !== 'https:' || !publicUrl.hostname.endsWith('.supabase.co')) {
    fail('NEXT_PUBLIC_SUPABASE_URL must be an HTTPS Supabase project URL')
  }

  const projectRef = publicUrl.hostname.split('.')[0]
  const host = environment.SUPABASE_DB_HOST.trim().toLowerCase()
  const directHost = `db.${projectRef}.supabase.co`
  const isSupabasePooler = host.endsWith('.pooler.supabase.com')
  if (host !== directHost && !isSupabasePooler) {
    fail('SUPABASE_DB_HOST does not match the configured Supabase project')
  }

  const user = environment.SUPABASE_DB_USER.trim()
  const allowedUsers = new Set(['postgres', `postgres.${projectRef}`])
  if (!allowedUsers.has(user)) {
    fail('SUPABASE_DB_USER does not match the configured Supabase project')
  }

  const port = environment.SUPABASE_DB_PORT?.trim() || '5432'
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    fail('SUPABASE_DB_PORT must be a valid TCP port')
  }

  const database = environment.SUPABASE_DB_NAME?.trim() || 'postgres'
  if (!/^[A-Za-z0-9_-]+$/.test(database)) {
    fail('SUPABASE_DB_NAME contains invalid characters')
  }

  return {
    database,
    host,
    password: environment.SUPABASE_DB_PASSWORD,
    port: Number(port),
    projectRef,
    user,
  }
}

/** @param {ProductionDatabaseConfig} config */
export function buildDatabaseUrl(config) {
  const user = encodeURIComponent(config.user)
  const password = encodeURIComponent(config.password)
  const database = encodeURIComponent(config.database)
  return `postgresql://${user}:${password}@${config.host}:${config.port}/${database}?sslmode=require`
}

function redact(value, secrets) {
  let output = String(value ?? '')
  for (const secret of secrets.filter(Boolean).sort((left, right) => right.length - left.length)) {
    output = output.split(secret).join('[REDACTED]')
  }
  return output
}

function writeSanitisedOutput(result, secrets, writeOutput) {
  const stdout = redact(result.stdout, secrets)
  const stderr = redact(result.stderr, secrets)
  if (stdout) writeOutput('stdout', stdout)
  if (stderr) writeOutput('stderr', stderr)
}

/**
 * @param {{
 *   environment?: DeploymentEnvironment,
 *   spawn?: (command: string, args: string[], options: Record<string, unknown>) => SpawnResult,
 *   sqlFactory?: (options: Record<string, unknown>) => MigrationSql,
 *   writeOutput?: (stream: 'stdout' | 'stderr', output: string) => void,
 * }} [options]
 */
export async function runProductionMigrations({
  environment = process.env,
  spawn = (command, args, options) => spawnSync(command, args, options),
  sqlFactory = (options) => postgres(options),
  writeOutput = (stream, output) => process[stream].write(output),
} = {}) {
  const config = readProductionDatabaseConfig(environment)
  const databaseUrl = buildDatabaseUrl(config)
  const encodedPassword = encodeURIComponent(config.password)
  const secrets = [config.password, encodedPassword, databaseUrl, environment.INFISICAL_TOKEN]
  const childEnvironment = {}
  for (const name of CHILD_ENVIRONMENT_ALLOWLIST) {
    if (environment[name] !== undefined) childEnvironment[name] = environment[name]
  }

  const sql = sqlFactory({
    database: config.database,
    host: config.host,
    password: config.password,
    port: config.port,
    ssl: 'require',
    username: config.user,
    max: 1,
    connect_timeout: 15,
    idle_timeout: 5,
  })

  let lockAcquired = false
  const runPush = (label, dryRun) => {
    console.log(`[migrations] ${label}`)
    const args = ['supabase', 'db', 'push', '--db-url', databaseUrl, '--yes']
    if (dryRun) args.push('--dry-run')

    const result = spawn('bunx', args, {
      cwd: process.cwd(),
      env: childEnvironment,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    writeSanitisedOutput(result, secrets, writeOutput)

    if (result.error) fail(`unable to start Supabase CLI: ${result.error.message}`)
    if (result.status !== 0) fail(`Supabase CLI exited with status ${result.status ?? 'unknown'}`)
  }

  try {
    const [lock] = await sql.unsafe(
      'select pg_try_advisory_lock(hashtextextended($1, 0)) as acquired',
      [DEPLOYMENT_LOCK],
    )
    lockAcquired = lock?.acquired === true
    if (!lockAcquired) fail('another production migration is already running')

    runPush('checking pending migrations', true)
    if (environment.SUPABASE_MIGRATION_DRY_RUN === '1') {
      console.log('[migrations] dry run complete; production was not changed')
      return
    }

    runPush('applying pending migrations', false)
    runPush('verifying migration ledger is current', true)
    console.log('[migrations] production migration ledger is current')
  } finally {
    if (lockAcquired) {
      await sql.unsafe(
        'select pg_advisory_unlock(hashtextextended($1, 0)) as released',
        [DEPLOYMENT_LOCK],
      )
    }
    await sql.end({ timeout: 5 })
  }
}

if (import.meta.main) {
  try {
    await runProductionMigrations()
  } catch (error) {
    console.error(error instanceof Error ? error.message : '[migrations] unknown failure')
    process.exitCode = 1
  }
}
