# linear.gratis

[![Release](https://img.shields.io/github/v/release/curiousgeorgios/linear-gratis?style=for-the-badge&color=111827)](https://github.com/curiousgeorgios/linear-gratis/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020?style=for-the-badge&logo=cloudflareworkers&logoColor=white)](https://workers.cloudflare.com/)
[![Linear API](https://img.shields.io/badge/Linear-API-5e6ad2?style=for-the-badge&logo=linear&logoColor=white)](https://developers.linear.app/)

Free, open-source Linear feedback infrastructure: customer request forms,
public issue views, public roadmaps, custom domains and branded portals backed
by your own Linear workspace.

linear.gratis is built for teams that already run product work in Linear but do
not want to pay for a separate feedback portal just to collect requests, share
progress, or publish a roadmap.

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Security](#security)
- [Contributing](#contributing)
- [Self-Hosting Notes](#self-hosting-notes)
- [License](#license)

## Features

- Customer request forms that create Linear customers and issues.
- Public Linear views for sharing filtered issues with customers or stakeholders.
- Public roadmaps with voting, comments, password protection and expiry support.
- Custom domains for forms, views and roadmaps.
- Branded public pages with logos, colours, favicons and footer settings.
- Organisation-scoped access control backed by Supabase RLS.
- Organisation-scoped Linear connections instead of user-scoped token reads.
- Encrypted Linear API token storage with lazy legacy-token rotation.
- Schema-level publishable-resource model with cross-type slug uniqueness.
- SQL migration, rollback and invariant-test coverage for the core tenancy model.

## Architecture

| Layer | Technology |
| --- | --- |
| App | Next.js 15 App Router, React 19, TypeScript |
| UI | Tailwind CSS, Radix UI primitives, Lucide icons, Framer Motion |
| Auth and database | Supabase Auth, Postgres and RLS |
| Linear integration | Linear GraphQL API and `@linear/sdk` |
| Runtime | OpenNext for Cloudflare Workers |
| Deployment | Wrangler and Cloudflare Workers static assets |

The app is intentionally server-heavy around Linear access. Linear tokens stay on
the server, are encrypted at rest, and are resolved through organisation-owned
connection rows before API calls are made.

## Getting Started

### Prerequisites

- Node.js 20 or newer
- npm
- Docker, if you want to run Supabase locally
- Supabase CLI, for local database resets and migration work
- Wrangler, installed through project dependencies
- A Linear workspace and Linear API token
- A Cloudflare account, if deploying the Worker or using custom-domain checks

### Install

```bash
git clone https://github.com/curiousgeorgios/linear-gratis.git
cd linear-gratis
npm install
cp .env.example .env.local
```

Generate an encryption key for stored Linear tokens:

```bash
openssl rand -base64 32
```

Fill out `.env.local`, then start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

The local template lives in [.env.example](.env.example).

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key for client-side authenticated access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-only key for API routes and trusted migration-style operations. |
| `ENCRYPTION_KEY` | Yes | Base64 32-byte key used to encrypt Linear API tokens. |
| `CLOUDFLARE_API_TOKEN` | For custom domains | Cloudflare API token for DNS and hostname verification checks. |
| `CLOUDFLARE_ACCOUNT_ID` | For custom domains | Cloudflare account id used with the API token. |
| `NEXT_PUBLIC_APP_DOMAIN` | Recommended | Canonical app domain used for custom-domain CNAME instructions. |

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, or Cloudflare tokens
to the browser. Keep production values in Worker secrets or your deployment
secret store.

## Database Migrations

Forward migrations live in [supabase/migrations](supabase/migrations). Manual
rollbacks live in [supabase/rollbacks](supabase/rollbacks).

Important: do not move rollback SQL into `supabase/migrations`. Supabase applies
every SQL file in that directory as a forward migration.

For a fresh local database:

```bash
supabase start
supabase db reset
```

For a linked Supabase project:

```bash
supabase db push --linked
```

Recent schema work is documented in:

- [ADR 0001: Tenancy and Publishable Resources](docs/adr/0001-tenancy-and-publishable-resources.md)
- [ADR 0001 Runbook](docs/adr/0001-runbook.md)
- [Contract Migration Drafts](supabase/contracts)

### SQL Invariant Tests

The SQL tests exercise the core migration invariants introduced by migrations
019-023. Run them against a local Supabase database:

```bash
for f in supabase/tests/*.sql; do
  echo "=== $f ==="
  docker exec -i supabase_db_integrations-worker-app \
    psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done
```

If you have `psql` installed locally, you can also use:

```bash
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
for f in supabase/tests/*.sql; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Build the Next.js app. |
| `npm run build:worker` | Build the Cloudflare Worker bundle through OpenNext. |
| `npm run preview` | Build the Worker and run it locally with Wrangler. |
| `npm run deploy` | Build and deploy the Worker with Wrangler. |
| `npm run cf-typegen` | Generate Cloudflare environment types. |
| `npm run generate-og` | Generate Open Graph assets. |

## Deployment

This project deploys as a Cloudflare Worker via OpenNext. The Worker config is
in [wrangler.jsonc](wrangler.jsonc).

```bash
npm run build:worker
npm run deploy
```

Production secrets should be set through Wrangler, not committed:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put ENCRYPTION_KEY
npx wrangler secret put CLOUDFLARE_API_TOKEN
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public
configuration values and may live in Wrangler vars.

## Project Structure

```text
src/
  app/                 Next.js routes and API handlers
  components/          Shared UI and product components
  contexts/            Client-side auth state
  data/                Static marketing and SEO content
  lib/                 Supabase, Linear, auth, crypto and domain helpers
supabase/
  migrations/          Forward-only database migrations
  rollbacks/           Manual rollback scripts, ignored by Supabase migration flow
  tests/               SQL invariant tests
  contracts/           Future contract-phase migration drafts
docs/
  adr/                 Architecture decision records and runbooks
```

## Security

- Linear API tokens are encrypted at rest and decrypted only in server-side code.
- Public password access cookies are signed, scoped and tied to the stored hash.
- Public routes enforce active, expiry and password gates server-side.
- Supabase RLS scopes authenticated resources through organisation membership.
- Service-role code paths re-check organisation membership before mutating data.

Please do not open public issues for suspected vulnerabilities. Email
hello@curiousgeorge.dev with enough detail to reproduce the problem.

## Contributing

Contributions are welcome. For non-trivial changes, open an issue or discussion
first so the schema, security and deployment implications can be worked through.

1. Fork the repository.
2. Create a branch from `main`.
3. Make the smallest coherent change.
4. Run the relevant verification commands.
5. Open a pull request with the behavior change, migration impact and test
   coverage called out clearly.

Before submitting database changes, check:

- Forward migrations are in `supabase/migrations`.
- Manual rollbacks are in `supabase/rollbacks`.
- New invariants have SQL coverage in `supabase/tests`.
- Public-surface changes do not expose secrets, hashes, tokens or private Linear
  metadata.

## Self-Hosting Notes

By default, every user belongs to a personal organisation and resources are
scoped to organisation members. That is the correct default for a public SaaS
deployment.

For a private agency or internal fork where every account on the instance is a
trusted colleague, you may want one shared organisation. Run the recipe below
only after migration `015_organisations.sql` has applied. This is fork-specific
configuration, not part of the standard migration suite.

```sql
BEGIN;

-- 1. Create one shared organisation owned by the oldest user on the instance.
INSERT INTO organisations (id, name, slug, created_by)
VALUES (
  gen_random_uuid(),
  'Team',
  'team',
  (SELECT id FROM profiles ORDER BY created_at LIMIT 1)
);

-- 2. Add every user as a member.
INSERT INTO organisation_members (organisation_id, user_id, role)
SELECT
  (SELECT id FROM organisations WHERE slug = 'team'),
  id,
  CASE
    WHEN id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1)
      THEN 'owner'::org_role
    ELSE 'member'::org_role
  END
FROM profiles;

-- 3. Point every existing resource at the shared org.
UPDATE public_views           SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE customer_request_forms SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE branding_settings      SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE custom_domains         SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE roadmaps               SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');

-- 4. Drop now-empty personal organisations.
DELETE FROM organisations o
WHERE NOT EXISTS (SELECT 1 FROM public_views           WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM customer_request_forms WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM branding_settings      WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM custom_domains         WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM roadmaps               WHERE organisation_id = o.id);

COMMIT;
```

New signups still get personal organisations through the `handle_new_user`
trigger. Re-run the membership/resource steps periodically if your fork keeps
the shared-org model, or customise the trigger for your own deployment.

## License

MIT. See [LICENSE](LICENSE).
