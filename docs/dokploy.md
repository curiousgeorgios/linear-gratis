# Deploying on Dokploy

`docker-compose.dokploy.yml` is the same stack as `docker-compose.yml` made
self-contained for [Dokploy](https://dokploy.com): no bind mounts, no build step
and no published ports. Traefik (Dokploy) terminates HTTPS and forwards to the
Caddy `gateway` service, which routes the app and the Supabase API on one domain.
Migrations ship inside the app image and are applied by a one-shot job.

## Steps

1. **Create the service**: Project → *Create Service* → *Compose*. Source: *Git*
   (this repository, compose path `./docker-compose.dokploy.yml`) or *Raw*
   (paste the file).
2. **Environment**: generate secrets on any machine and paste the output into
   the *Environment* tab:

   ```bash
   node docker/generate-env.mjs --proxy --url https://feedback.example.com --out dokploy.env
   ```

   `--proxy` makes the gateway serve plain HTTP (Traefik handles TLS). Keep the
   file private; rotating `ENCRYPTION_KEY` makes stored Linear tokens unreadable.
   Optional: `LINEAR_GRATIS_IMAGE=<your-hub-user>/linear-gratis:latest`
   (default: `samerelhamdousa/linear-gratis:latest`).
3. **Domain**: *Domains* tab → add `feedback.example.com`, service `gateway`,
   container port `80`, HTTPS on. `APP_URL` must be exactly this https address.
4. **Deploy.** First start: database → auth/storage → migrations → app → gateway.
5. Open the domain, create an account (`/login`), save your Linear token in
   *Profile*, and create an MCP token for Claude Code (`docs/mcp.md`).

## Notes

- The `dokploy-network` external network is created by Dokploy; if you deploy
  elsewhere, run `docker network create dokploy-network` first.
- Update by redeploying: the app image is pulled on every deploy.
- Back up the `db-data` and `storage-data` volumes (Dokploy → Volume backups).
- Set `DISABLE_SIGNUP=true` once your accounts exist; configure `SMTP_*` and
  `AUTH_AUTOCONFIRM=false` for e-mail confirmation.

## Troubleshooting

- **`storage` / `auth` unhealthy after a failed first deploy** – the database
  volume keeps the password it was first created with. If you changed
  `POSTGRES_PASSWORD` afterwards, delete the `db-data` volume (Dokploy → the
  compose service → Volumes, or `docker volume rm <project>_db-data`) and
  redeploy. Passwords must be hex/alphanumeric; `generate-env.mjs` does this.
- Check `docker logs <project>-storage-1` – the first error line names the cause.
