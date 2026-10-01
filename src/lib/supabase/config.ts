// Supabase connection settings shared by browser, server and middleware code.
//
// Self-hosted (Docker) deployments can reach the Supabase API at a different
// address from the one browsers use (for example http://kong:8000 inside the
// compose network versus https://supabase.example.com publicly). Set
// SUPABASE_INTERNAL_URL for the server-side address.
//
// The auth cookie name is normally derived from the Supabase URL hostname, so
// two different URLs would produce two different cookies and break sign-in.
// NEXT_PUBLIC_SUPABASE_COOKIE_NAME pins one name for every runtime. It is
// unset on the hosted deployment so existing sessions keep their cookie.

export function getServerSupabaseUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
}

export function getSupabaseCookieOptions(): { name: string } | undefined {
  const name = process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME
  return name ? { name } : undefined
}

/** Rewrite a URL built from the internal Supabase address to the public one. */
export function toPublicSupabaseUrl(url: string): string {
  const internal = process.env.SUPABASE_INTERNAL_URL
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!internal || !publicUrl) return url
  const from = internal.replace(/\/+$/, '')
  return url.startsWith(from) ? publicUrl.replace(/\/+$/, '') + url.slice(from.length) : url
}
