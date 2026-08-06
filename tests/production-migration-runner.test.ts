import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  buildDatabaseUrl,
  readProductionDatabaseConfig,
  runProductionMigrations,
} from '../scripts/migrate-production.mjs'

const baseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://projectref.supabase.co',
  SUPABASE_DB_HOST: 'aws-1.example.pooler.supabase.com',
  SUPABASE_DB_NAME: 'postgres',
  SUPABASE_DB_PASSWORD: 'correct horse battery staple',
  SUPABASE_DB_PORT: '5432',
  SUPABASE_DB_USER: 'postgres.projectref',
}

function harness(environment: Record<string, string> = baseEnvironment) {
  const events: string[] = []
  const invocations: Array<{ args: string[], environment: Record<string, string> }> = []
  const output: string[] = []
  const sql = {
    unsafe: async (query: string) => {
      if (query.includes('pg_try_advisory_lock')) {
        events.push('lock')
        return [{ acquired: true }]
      }
      events.push('unlock')
      return [{ released: true }]
    },
    end: async () => events.push('end'),
  }

  return {
    events,
    invocations,
    output,
    run: () => runProductionMigrations({
      environment,
      spawn: (_command: string, args: string[], options: Record<string, unknown>) => {
        events.push(args.includes('--dry-run') ? 'dry-run' : 'apply')
        invocations.push({ args, environment: options.env as Record<string, string> })
        return { status: 0, stdout: 'ok\n', stderr: '' }
      },
      sqlFactory: () => sql,
      writeOutput: (_stream: string, value: string) => output.push(value),
    }),
  }
}

describe('production migration configuration', () => {
  test('encodes arbitrary password characters without changing their value', () => {
    const passwords = [
      'spaces are valid',
      'reserved:/?#[]@!$&\'()*+,;=',
      'unicode-🦊-påssword',
      '%already%encoded%',
    ]

    for (const password of passwords) {
      const config = readProductionDatabaseConfig({
        ...baseEnvironment,
        SUPABASE_DB_PASSWORD: password,
      })
      const databaseUrl = new URL(buildDatabaseUrl(config))
      assert.equal(decodeURIComponent(databaseUrl.password), password)
      assert.equal(databaseUrl.searchParams.get('sslmode'), 'require')
    }
  })

  test('fails closed for missing, cross-project, or non-Supabase configuration', () => {
    const invalidEnvironments = [
      { ...baseEnvironment, SUPABASE_DB_PASSWORD: '' },
      { ...baseEnvironment, NEXT_PUBLIC_SUPABASE_URL: 'http://projectref.supabase.co' },
      { ...baseEnvironment, SUPABASE_DB_HOST: 'attacker.example.com' },
      { ...baseEnvironment, SUPABASE_DB_USER: 'postgres.other-project' },
      { ...baseEnvironment, SUPABASE_DB_PORT: '70000' },
    ]

    for (const environment of invalidEnvironments) {
      assert.throws(() => readProductionDatabaseConfig(environment))
    }
  })
})

describe('production migration lifecycle', () => {
  test('locks, preflights, applies, verifies, unlocks, and closes in order', async () => {
    const testHarness = harness()
    await testHarness.run()

    assert.deepEqual(testHarness.events, [
      'lock',
      'dry-run',
      'apply',
      'dry-run',
      'unlock',
      'end',
    ])
    assert.equal(testHarness.invocations.length, 3)
    assert.ok(testHarness.invocations.every(({ args }) => args.includes('--yes')))
  })

  test('dry-run mode never applies a migration', async () => {
    const testHarness = harness({ ...baseEnvironment, SUPABASE_MIGRATION_DRY_RUN: '1' })
    await testHarness.run()
    assert.deepEqual(testHarness.events, ['lock', 'dry-run', 'unlock', 'end'])
  })

  test('does not pass Infisical or database credentials through the child environment', async () => {
    const testHarness = harness({
      ...baseEnvironment,
      ENCRYPTION_KEY: 'encryption-secret',
      INFISICAL_TOKEN: 'infisical-secret',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-secret',
      UNRELATED_SECRET: 'must-not-reach-supabase',
    })
    await testHarness.run()

    for (const invocation of testHarness.invocations) {
      for (const name of [
        'ENCRYPTION_KEY',
        'INFISICAL_TOKEN',
        'SUPABASE_DB_PASSWORD',
        'SUPABASE_SERVICE_ROLE_KEY',
        'UNRELATED_SECRET',
      ]) {
        assert.equal(invocation.environment[name], undefined)
      }
    }
  })

  test('redacts credentials from Supabase CLI output', async () => {
    const password = 'visible:/secret'
    const testHarness = harness({ ...baseEnvironment, SUPABASE_DB_PASSWORD: password })
    testHarness.invocations.length = 0

    await runProductionMigrations({
      environment: { ...baseEnvironment, SUPABASE_DB_PASSWORD: password },
      spawn: (_command: string, args: string[]) => ({
        status: 0,
        stdout: `connecting with ${password} and ${args[4]}\n`,
        stderr: '',
      }),
      sqlFactory: () => ({
        unsafe: async (query: string) => query.includes('try_')
          ? [{ acquired: true }]
          : [{ released: true }],
        end: async () => undefined,
      }),
      writeOutput: (_stream: string, value: string) => testHarness.output.push(value),
    })

    const renderedOutput = testHarness.output.join('')
    assert.doesNotMatch(renderedOutput, /visible|secret|postgresql:\/\//)
    assert.match(renderedOutput, /\[REDACTED\]/)
  })

  test('a failed preflight never reaches apply and still releases the lock', async () => {
    const events: string[] = []

    await assert.rejects(() => runProductionMigrations({
      environment: baseEnvironment,
      spawn: () => {
        events.push('preflight-failed')
        return { status: 1, stdout: '', stderr: 'migration drift\n' }
      },
      sqlFactory: () => ({
        unsafe: async (query: string) => {
          if (query.includes('try_')) {
            events.push('lock')
            return [{ acquired: true }]
          }
          events.push('unlock')
          return [{ released: true }]
        },
        end: async () => events.push('end'),
      }),
      writeOutput: () => undefined,
    }))

    assert.deepEqual(events, ['lock', 'preflight-failed', 'unlock', 'end'])
  })
})
