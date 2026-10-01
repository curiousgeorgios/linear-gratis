# syntax=docker/dockerfile:1.7
#
# Self-hosted linear.gratis: a standalone Next.js Node server.
#
# NEXT_PUBLIC_* values are inlined by Next.js at build time, so a single
# prebuilt image cannot know your URLs. The build uses unmistakable
# placeholders and docker/entrypoint.sh swaps in the real values from the
# container environment on start-up. One image, any deployment.

ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
# bun.lock is the repository's source of truth for dependency versions.
RUN npm install -g --no-audit --no-fund bun@1.2.21
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM node:${NODE_VERSION}-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    BUILD_STANDALONE=1 \
    NEXT_PUBLIC_SUPABASE_URL=http://nextpublic-supabase-url.placeholder \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=__NEXT_PUBLIC_SUPABASE_ANON_KEY__ \
    NEXT_PUBLIC_SUPABASE_COOKIE_NAME=__NEXT_PUBLIC_SUPABASE_COOKIE_NAME__ \
    NEXT_PUBLIC_APP_DOMAIN=__NEXT_PUBLIC_APP_DOMAIN__ \
    NEXT_PUBLIC_AUTH_METHODS=__NEXT_PUBLIC_AUTH_METHODS__ \
    NEXT_PUBLIC_DEFAULT_LOCALE=__NEXT_PUBLIC_DEFAULT_LOCALE__ \
    SUPABASE_SERVICE_ROLE_KEY=build-time-placeholder \
    ENCRYPTION_KEY=build-time-placeholder \
    ACCESS_COOKIE_SECRET=build-time-placeholder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node node_modules/next/dist/bin/next build

# sharp powers next/image in standalone mode; install it outside the traced
# bundle so its native binaries match this base image.
FROM node:${NODE_VERSION}-bookworm-slim AS sharp
WORKDIR /opt/sharp
RUN npm install --no-audit --no-fund --omit=dev sharp

FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_SHARP_PATH=/opt/sharp/node_modules/sharp
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

COPY --from=sharp /opt/sharp /opt/sharp
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node docker/entrypoint.sh docker/generate-env.mjs ./docker/
RUN chmod +x docker/entrypoint.sh

USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/hello').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "/app/docker/entrypoint.sh"]
CMD ["node", "server.js"]
