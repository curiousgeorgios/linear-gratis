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

  test('roadmap vote failures remain useful without exposing database errors', async () => {
    const source = await readFile(
      path.join(REPO_ROOT, 'src/app/api/roadmap/[slug]/vote/route.ts'),
      'utf8',
    )
    const publicMessage = 'Voting is temporarily unavailable. Please try again shortly.'

    assert.equal(source.split(publicMessage).length - 1, 2)
    assert.doesNotMatch(source, /error\s+instanceof\s+Error\s*\?\s*error\.message/)
    assert.match(source, /console\.error\('Vote API error:'/)
    assert.match(source, /console\.error\('Vote delete API error:'/)
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

describe('public roadmap interface contracts', () => {
  test('mobile board preserves card width, touch targets, and reduced-motion semantics', async () => {
    const [card, voteButton, kanban, modal, page, layout] = await Promise.all([
      'src/components/roadmap/roadmap-card.tsx',
      'src/components/roadmap/vote-button.tsx',
      'src/components/roadmap/kanban-view.tsx',
      'src/components/roadmap/item-detail-modal.tsx',
      'src/app/roadmap/[slug]/page.tsx',
      'src/app/layout.tsx',
    ].map((file) => readFile(path.join(REPO_ROOT, file), 'utf8')))

    assert.match(card, /<article/)
    assert.match(card, /aria-label={`Open \$\{issue\.identifier\}/)
    assert.match(card, /<VoteButton[\s\S]*compact/)
    assert.doesNotMatch(card, /transition-all/)

    assert.match(voteButton, /aria-pressed={voteState\.hasVoted}/)
    assert.match(voteButton, /min-h-11 min-w-11/)
    assert.match(voteButton, /active:scale-\[0\.96\]/)
    assert.match(voteButton, /motion-reduce:transform-none/)
    assert.doesNotMatch(voteButton, /transition-all/)

    assert.match(kanban, /snap-x snap-mandatory/)
    assert.match(kanban, /touch-pan-x/)
    assert.match(kanban, /w-\[calc\(100vw-1\.5rem\)\]/)
    assert.doesNotMatch(kanban, /max-h-\[calc\(100vh-280px\)\]/)

    assert.match(modal, /role="dialog"/)
    assert.match(modal, /aria-modal="true"/)
    assert.match(modal, /e\.key !== 'Tab'/)
    assert.match(modal, /previouslyFocusedRef\.current\?\.focus\(\)/)
    assert.match(modal, /100dvh/)
    assert.match(modal, /motion-reduce:animate-none/)

    assert.match(page, /aria-label="Roadmap layout"/)
    assert.match(page, /aria-pressed={layoutType === 'kanban'}/)
    assert.match(page, /min-h-11 min-w-11/)
    assert.match(layout, /mobileOffset=/)
    assert.match(layout, /env\(safe-area-inset-bottom\)/)
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
    assert.match(deploy, /release:build && bun run release:deploy/,
      'production deploys must pass the full gate before the release lifecycle')

    assert.equal(packageJson.scripts?.['release:build'], 'bun run test:all')
    assert.match(packageJson.scripts?.['release:deploy'] ?? '',
      /^bun run db:migrate:production && wrangler deploy$/,
      'pending migrations must complete before Worker deployment')

    for (const script of ['release:cloudflare:build', 'release:cloudflare:deploy']) {
      const command = packageJson.scripts?.[script] ?? ''
      assert.match(command, /@infisical\/cli\/bin\/infisical run/)
      assert.match(command, /--domain=https:\/\/infisical\.onestack\.cloud\/api/)
      assert.match(command, /--token="\$INFISICAL_TOKEN"/)
      assert.match(command, /--env=prod/)
    }
    assert.match(packageJson.scripts?.['release:cloudflare:build'] ?? '',
      /run-test-suite\.mjs --skip-browser-smoke$/,
      'the Cloudflare image must delegate its unsupported browser smoke to GitHub')
    assert.match(packageJson.scripts?.['release:cloudflare:deploy'] ?? '',
      /wait-for-github-release-gate\.mjs && bun run release:deploy/,
      'Cloudflare must wait for the browser and database GitHub checks before deploying')

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
  test('database runner maps its URL into explicit local libpq fields', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'scripts/run-supabase-tests.mjs'), 'utf8')

    for (const field of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
      assert.ok(source.includes(`${field}:`), `database runner is missing ${field}`)
    }
    assert.doesNotMatch(source, /PGDATABASE:\s*connectionString/,
      'a PostgreSQL URI cannot be passed through PGDATABASE portably')
  })

  test('numbered migrations are unique, ordered, and contiguous', async () => {
    const directory = path.join(REPO_ROOT, 'supabase/migrations')
    const files = (await readdir(directory)).filter((file) => /^\d{3}_.+\.sql$/.test(file)).sort()
    const numbers = files.map((file) => Number(file.slice(0, 3)))

    assert.ok(numbers.length >= 25)
    assert.equal(new Set(numbers).size, numbers.length)
    assert.deepEqual(numbers, Array.from({ length: numbers.at(-1) ?? 0 }, (_, index) => index + 1))
  })

  test('production migration runner uses the standard ledger and a deployment lock', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'scripts/migrate-production.mjs'), 'utf8')

    assert.match(source, /supabase', 'db', 'push'/)
    assert.match(source, /pg_try_advisory_lock/)
    assert.match(source, /--dry-run/)
    assert.match(source, /verifying migration ledger is current/)
    assert.doesNotMatch(source, /--include-all/,
      'production must fail on out-of-order history rather than guessing a baseline')
  })

  test('Cloudflare deployment waits for both required GitHub checks', async () => {
    const source = await readFile(path.join(REPO_ROOT, 'scripts/wait-for-github-release-gate.mjs'), 'utf8')

    assert.match(source, /'Application and Worker'/)
    assert.match(source, /'Supabase invariants'/)
    assert.match(source, /WORKERS_CI_COMMIT_SHA/)
    assert.match(source, /WORKERS_CI_BRANCH/)
    assert.doesNotMatch(source, /GITHUB_TOKEN|Authorization/,
      'the public-repository check must not require another deployment secret')
  })

  test('roadmap vote insert fields are backed by explicit schema migrations', async () => {
    const route = await readFile(
      path.join(REPO_ROOT, 'src/app/api/roadmap/[slug]/vote/route.ts'),
      'utf8',
    )
    const orgScopeMigration = await readFile(
      path.join(REPO_ROOT, 'supabase/migrations/019_org_scope_roadmap_child_tables.sql'),
      'utf8',
    )
    const externalIdMigration = await readFile(
      path.join(REPO_ROOT, 'supabase/migrations/020_namespace_external_linear_ids.sql'),
      'utf8',
    )

    assert.match(route, /organisation_id:\s*roadmap\.organisation_id/)
    assert.match(route, /linear_issue_id:\s*issueAccess\.issueId/)
    assert.match(orgScopeMigration, /ALTER TABLE roadmap_votes[\s\S]*ADD COLUMN organisation_id UUID/)
    assert.match(externalIdMigration, /ALTER TABLE roadmap_votes[\s\S]*ADD COLUMN linear_issue_id TEXT/)
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
