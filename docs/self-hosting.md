# Self-hosting with Docker

linear.gratis runs as a single Node container plus a small Supabase stack
(Postgres, GoTrue, PostgREST, Storage). `docker-compose.yml` wires everything
together behind one [Caddy](https://caddyserver.com/) gateway, so the app and
the Supabase API share one origin, one hostname and (for real domains) one
automatic HTTPS certificate.

```text
browser ──► gateway (Caddy) ──┬─ /auth/v1/*     → auth    (GoTrue)
                              ├─ /rest/v1/*     → rest    (PostgREST)
                              ├─ /storage/v1/*  → storage (Storage API)
                              └─ everything else → app     (Next.js)
```

An Arabic version of this guide is in [self-hosting.ar.md](self-hosting.ar.md).

## Quick start (local)

Requirements: Docker with the Compose plugin, and Node 20+ (or use the
`gen-env` container command below).

```bash
git clone https://github.com/curiousgeorgios/linear-gratis.git
cd linear-gratis

node docker/generate-env.mjs --url http://localhost:3000   # writes .env with fresh secrets
docker compose up -d --build
```

Open <http://localhost:3000>, create an account on **/login**, then paste your
Linear API token in **Profile**. The first start applies the database
migrations from `supabase/migrations/` automatically (the `migrate` service).

No Node on the host? Generate the file with the image itself:

```bash
docker run --rm -v "$PWD:/out" <image> gen-env --out /out/.env --url http://localhost:3000
```

## Production deployment

1. Point a DNS record at your server and open ports 80 and 443.
2. Generate the environment for your public URL:

   ```bash
   node docker/generate-env.mjs --url https://feedback.example.com
   ```

   `SITE_ADDRESS` becomes the bare hostname, which makes Caddy obtain and renew
   a Let's Encrypt certificate on its own.
3. Use the prebuilt image instead of building locally. In `.env` set
   `LINEAR_GRATIS_IMAGE=<your-dockerhub-user>/linear-gratis:latest`, then:

   ```bash
   docker compose pull app
   docker compose up -d --no-build
   ```

4. Configure e-mail (optional but recommended): fill `SMTP_*`, set
   `AUTH_AUTOCONFIRM=false`, and add `magic_link` to `AUTH_METHODS` if you want
   passwordless sign-in.

Back up the `db-data` and `storage-data` volumes and keep `.env` private:
rotating `ENCRYPTION_KEY` makes stored Linear tokens unreadable, and rotating
`JWT_SECRET` invalidates every session and requires regenerating the two JWTs.

## Configuration reference

All values live in `.env` (created by `generate-env.mjs`).

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Public origin, for example `https://feedback.example.com`. |
| `APP_DOMAIN` | Hostname of `APP_URL`. Requests for any other host are treated as customer custom domains. |
| `SITE_ADDRESS`, `HTTP_PORT`, `HTTPS_PORT` | Caddy listen address and published ports. |
| `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY` | Supabase secrets. The two keys are JWTs signed with `JWT_SECRET`. |
| `ENCRYPTION_KEY`, `ACCESS_COOKIE_SECRET`, `IP_HASH_SALT`, `FEEDBACK_WEBHOOK_SECRET` | Application secrets, see the main README. |
| `AUTH_METHODS` | Sign-in methods on `/login`: `password`, `magic_link`, `github` (comma separated). |
| `DEFAULT_LOCALE` | `ar` or `en`. Visitors can switch language in the header. |
| `AUTH_AUTOCONFIRM`, `DISABLE_SIGNUP`, `SMTP_*` | GoTrue e-mail behaviour. Set `DISABLE_SIGNUP=true` after creating your accounts to close registration. |
| `GITHUB_ENABLED`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Optional GitHub OAuth. The callback URL is `<APP_URL>/auth/v1/callback`. |
| `CLOUDFLARE_*` | Optional custom-domain verification. |
| `LINEAR_GRATIS_IMAGE` | Image to run (`linear-gratis:local` when built from source). |

### How one image serves any deployment

Next.js inlines `NEXT_PUBLIC_*` values at build time. The Dockerfile therefore
builds with unmistakable placeholders and `docker/entrypoint.sh` swaps in the
real values from the container environment on start-up. Changing a public value
means recreating the container (`docker compose up -d` does this for you).

Server-side code talks to Supabase through `SUPABASE_INTERNAL_URL`
(`http://gateway` inside the compose network) while browsers use the public
URL. Because the Supabase auth cookie name is normally derived from the
hostname, the compose file pins it with `NEXT_PUBLIC_SUPABASE_COOKIE_NAME` so
both sides agree.

## Publishing the image to Docker Hub

`.github/workflows/docker-publish.yml` builds a multi-architecture
(`linux/amd64`, `linux/arm64`) image and pushes it to Docker Hub and GHCR.

1. Create a Docker Hub access token with read/write scope.
2. In the GitHub repository add the secrets `DOCKERHUB_USERNAME` and
   `DOCKERHUB_TOKEN` (and optionally the variable `DOCKERHUB_REPOSITORY`).
3. Push to `main` for an `edge` image, or tag a release (`git tag v1.0.0 &&
   git push --tags`) for `1.0.0`, `1.0`, `1` and `latest`.

To publish by hand instead:

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t <user>/linear-gratis:latest --push .
```

## Upgrading

```bash
git pull
docker compose pull app      # or: docker compose build app
docker compose up -d
```

New migrations are applied by the `migrate` service on every start; it records
them in the same `supabase_migrations.schema_migrations` ledger the Supabase CLI
uses.

## Troubleshooting

- **`app` keeps restarting** – run `docker compose logs app`; a missing
  required variable is reported by the entrypoint.
- **Sign-in loops back to `/login`** – `APP_URL` must match the address in the
  browser exactly (scheme, host and port).
- **Magic links never arrive** – configure `SMTP_*`, or use `password` sign-in.
- **Reset everything** – `docker compose down -v` deletes all data volumes.
