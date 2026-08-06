import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, test } from 'node:test'

const REPO_ROOT = process.cwd()

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return files.flat()
}

function relative(file: string): string {
  return path.relative(REPO_ROOT, file).split(path.sep).join('/')
}

describe('API route contracts', () => {
  test('every route exports at least one supported HTTP handler', async () => {
    const routeFiles = (await walk(path.join(REPO_ROOT, 'src/app/api')))
      .filter((file) => file.endsWith('/route.ts'))
    assert.ok(routeFiles.length >= 33, `expected broad API inventory, found ${routeFiles.length}`)

    for (const file of routeFiles) {
      const source = await readFile(file, 'utf8')
      const methods = [...source.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)]
        .map((match) => match[1])

      assert.ok(methods.length > 0, `${relative(file)} does not export an HTTP handler`)
      assert.equal(new Set(methods).size, methods.length, `${relative(file)} exports a duplicate HTTP handler`)
    }
  })

  test('public mutation routes retain their authentication and abuse controls', async () => {
    const contracts: Record<string, string[]> = {
      'src/app/api/form/[slug]/submit/route.ts': [
        'checkRateLimit',
        'getClientIp',
        'MAX_FORM_SUBMIT_BODY_BYTES',
      ],
      'src/app/api/public-view/[slug]/create-issue/route.ts': [
        'authorisePublicView',
        'checkRateLimit',
        'getClientIp',
      ],
      'src/app/api/public-view/[slug]/feedback/route.ts': [
        'verifyWebhookSignature',
        'checkRateLimit',
        'getClientIp',
      ],
      'src/app/api/public-view/[slug]/issue/[issueId]/route.ts': [
        'authorisePublicView',
      ],
      'src/app/api/roadmap/[slug]/comments/route.ts': [
        'authoriseRoadmap',
        'resolveRoadmapIssue',
        'checkRateLimit',
        'getClientIp',
      ],
      'src/app/api/roadmap/[slug]/vote/route.ts': [
        'authoriseRoadmap',
        'resolveRoadmapIssue',
        'checkRateLimit',
        'getClientIp',
      ],
    }

    for (const [file, requiredTokens] of Object.entries(contracts)) {
      const source = await readFile(path.join(REPO_ROOT, file), 'utf8')
      for (const token of requiredTokens) {
        assert.ok(source.includes(token), `${file} lost required control ${token}`)
      }
    }
  })

  test('client modules cannot reference server secrets or service-role clients', async () => {
    const sourceFiles = (await walk(path.join(REPO_ROOT, 'src')))
      .filter((file) => /\.(?:ts|tsx)$/.test(file))

    for (const file of sourceFiles) {
      const source = await readFile(file, 'utf8')
      if (!/^['"]use client['"]/m.test(source)) continue

      assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|ENCRYPTION_KEY|CLOUDFLARE_API_TOKEN|FEEDBACK_WEBHOOK_SECRET/,
        `${relative(file)} references a server secret`)
      assert.doesNotMatch(source, /\bsupabaseAdmin\b/,
        `${relative(file)} imports the service-role client`)
    }
  })
})

describe('secret-management contracts', () => {
  test('production deployment remains injected through Infisical', async () => {
    const packageJson = JSON.parse(await readFile(path.join(REPO_ROOT, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    const deploy = packageJson.scripts?.deploy

    assert.ok(deploy, 'package.json is missing the production deploy command')
    assert.match(deploy, /^infisical run --env=prod --command /,
      'production deploys must receive secrets from Infisical prod')

    const gitignore = await readFile(path.join(REPO_ROOT, '.gitignore'), 'utf8')
    assert.match(gitignore, /^\.env\*$/m, 'environment files must remain ignored')
  })

  test('CI uses only explicit non-secret fixtures for build-time configuration', async () => {
    const workflow = await readFile(path.join(REPO_ROOT, '.github/workflows/test.yml'), 'utf8')

    for (const fixture of [
      'SUPABASE_SERVICE_ROLE_KEY: test-service-role-key',
      'ENCRYPTION_KEY: test-encryption-key-with-adequate-entropy',
      'ACCESS_COOKIE_SECRET: test-access-cookie-secret-with-adequate-entropy',
    ]) {
      assert.ok(workflow.includes(fixture), `CI fixture is missing or no longer visibly fake: ${fixture}`)
    }
  })
})

describe('database migration contracts', () => {
  test('numbered migrations are unique, ordered, and contiguous', async () => {
    const directory = path.join(REPO_ROOT, 'supabase/migrations')
    const files = (await readdir(directory)).filter((file) => /^\d{3}_.+\.sql$/.test(file)).sort()
    const numbers = files.map((file) => Number(file.slice(0, 3)))

    assert.ok(numbers.length >= 25)
    assert.equal(new Set(numbers).size, numbers.length)
    assert.deepEqual(numbers, Array.from({ length: numbers.at(-1) ?? 0 }, (_, index) => index + 1))
  })

  test('migration files exclude database-wide destructive operations', async () => {
    const directory = path.join(REPO_ROOT, 'supabase/migrations')
    const files = (await readdir(directory)).filter((file) => file.endsWith('.sql'))

    for (const file of files) {
      const source = await readFile(path.join(directory, file), 'utf8')
      assert.doesNotMatch(source, /\bDROP\s+DATABASE\b|\bTRUNCATE\b/i, `${file} contains a destructive database-wide statement`)
    }
  })

  test('schema tests are transactional, rollback-only, and fail loudly', async () => {
    const directory = path.join(REPO_ROOT, 'supabase/tests')
    const files = (await readdir(directory)).filter((file) => file.endsWith('.sql')).sort()
    assert.ok(files.length >= 5)

    for (const file of files) {
      const source = await readFile(path.join(directory, file), 'utf8')
      assert.match(source, /^\s*BEGIN\s*;/im, `${file} does not open a transaction`)
      assert.match(source, /\bROLLBACK\s*;\s*$/im, `${file} does not end in rollback`)
      assert.match(source, /RAISE\s+EXCEPTION/i, `${file} cannot fail loudly`)
      assert.doesNotMatch(source, /\bCOMMIT\s*;/i, `${file} may persist fixture data`)
    }
  })
})
