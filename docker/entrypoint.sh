#!/bin/sh
# Container entrypoint: swap build-time placeholders for the real NEXT_PUBLIC_*
# values, then start the server. Also exposes `gen-env` to create a .env file.
set -eu

cd /app

if [ "${1:-}" = "gen-env" ]; then
  shift
  exec node docker/generate-env.mjs "$@"
fi

# Escape a value for use on the right-hand side of a sed s||| expression.
escape() {
  printf '%s' "$1" | sed -e 's/[\\&|]/\\&/g'
}

replace() {
  placeholder="$1"
  value="$(escape "$2")"
  # Only touch files that actually contain the placeholder.
  grep -rlF -- "$placeholder" .next server.js 2>/dev/null \
    | while IFS= read -r file; do sed -i "s|$placeholder|$value|g" "$file"; done || true
}

: "${NEXT_PUBLIC_SUPABASE_URL:?NEXT_PUBLIC_SUPABASE_URL is required}"
: "${NEXT_PUBLIC_SUPABASE_ANON_KEY:?NEXT_PUBLIC_SUPABASE_ANON_KEY is required}"
: "${SUPABASE_SERVICE_ROLE_KEY:?SUPABASE_SERVICE_ROLE_KEY is required}"
: "${ENCRYPTION_KEY:?ENCRYPTION_KEY is required}"

replace "http://nextpublic-supabase-url.placeholder" "${NEXT_PUBLIC_SUPABASE_URL%/}"
replace "__NEXT_PUBLIC_SUPABASE_ANON_KEY__" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
replace "__NEXT_PUBLIC_SUPABASE_COOKIE_NAME__" "${NEXT_PUBLIC_SUPABASE_COOKIE_NAME:-}"
replace "__NEXT_PUBLIC_APP_DOMAIN__" "${NEXT_PUBLIC_APP_DOMAIN:-}"
replace "__NEXT_PUBLIC_AUTH_METHODS__" "${NEXT_PUBLIC_AUTH_METHODS:-}"
replace "__NEXT_PUBLIC_DEFAULT_LOCALE__" "${NEXT_PUBLIC_DEFAULT_LOCALE:-}"

exec "$@"
