# Linear Integrations Worker App

A Next.js application that provides a web interface for creating Linear customer requests. This app allows users to submit customer feedback and requests directly to Linear projects through a user-friendly form interface.

## Features

- 🔐 Secure authentication with Supabase
- 📝 Customer request forms with validation
- 🔒 Encrypted Linear API token storage
- 🎨 Modern UI with Tailwind CSS and Radix UI
- 🚀 Deployed on Cloudflare Pages

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Linear API access

### Environment Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd integrations-worker-app
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env.local
```

4. Configure your environment variables in `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Encryption Key (required for security)
ENCRYPTION_KEY=your-base64-encryption-key-here
```

### Generating an Encryption Key

Generate a secure encryption key for protecting stored Linear API tokens:

```bash
openssl rand -base64 32
```

### Supabase Setup

1. Create a new Supabase project
2. Set up authentication (email/password recommended)
3. Create the required database schema by running the migrations in `supabase/migrations`

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deployment

This app is configured for deployment on Cloudflare Pages:

```bash
# Build for Cloudflare Pages
npm run pages:build

# Preview locally
npm run preview

# Deploy to Cloudflare Pages
npm run deploy
```

## Architecture

### Frontend
- **Next.js 15** - React framework with App Router
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **React Hook Form** - Form handling with validation
- **Framer Motion** - Animation library

### Backend
- **Supabase** - Authentication and database
- **Linear SDK** - Official Linear API client
- **Crypto-JS** - Encryption for sensitive data

### Deployment
- **Cloudflare Pages** - Edge deployment platform
- **Wrangler** - Cloudflare deployment tooling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

If you discover a security vulnerability, please send an email to hello@curiousgeorge.dev. All security vulnerabilities will be promptly addressed.

### Security Best Practices

- Never commit `.env.local` or any files containing secrets
- Rotate your encryption key regularly
- Use environment-specific encryption keys
- Monitor your Linear API token usage
- Enable audit logging in your Supabase project

## Appendix: shared-resources recipe for self-hosters

Migration `015_organisations.sql` gives every existing user a personal organisation and scopes all resource reads to members of that organisation. On a multi-user deployment where every user on the instance is a colleague (e.g. an agency running their own fork), you may want the pre-015 behaviour where everyone sees everyone's resources.

Run the following SQL **once, after `015_organisations.sql` has been applied**. It's fork-specific configuration, not part of the migration suite.

```sql
BEGIN;

-- 1. Create one shared organisation owned by the oldest user on the instance
INSERT INTO organisations (id, name, slug, created_by)
VALUES (gen_random_uuid(), 'Team', 'team',
        (SELECT id FROM profiles ORDER BY created_at LIMIT 1));

-- 2. Add every user as a member (oldest user = owner, rest = members)
INSERT INTO organisation_members (organisation_id, user_id, role)
SELECT
  (SELECT id FROM organisations WHERE slug = 'team'),
  id,
  CASE WHEN id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1)
       THEN 'owner'::org_role
       ELSE 'member'::org_role
  END
FROM profiles;

-- 3. Point every existing resource at the shared org
UPDATE public_views          SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE customer_request_forms SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE branding_settings      SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE custom_domains         SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE roadmaps               SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');

-- 4. Drop every org that no longer has resources attached (i.e. the now-empty personal orgs).
--    The shared 'team' org is exempt because it has resources pointing at it after step 3.
--    ON DELETE CASCADE on organisation_members drops the orphan personal-org membership rows;
--    it does NOT touch profiles or the 'team' org's membership rows (those reference a different
--    organisation_id). Verified before running this recipe in production.
DELETE FROM organisations o
WHERE NOT EXISTS (SELECT 1 FROM public_views          WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM customer_request_forms WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM branding_settings      WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM custom_domains         WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM roadmaps               WHERE organisation_id = o.id);

COMMIT;
```

After running, every user on the instance sees every resource. New signups still get a personal org via the `handle_new_user` trigger; re-run steps 2-4 periodically if you want to keep them in the shared model, or modify the trigger yourself. A Phase 2 roadmap item is to turn this into a first-class self-host config flag.
