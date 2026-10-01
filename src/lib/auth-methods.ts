// Which sign-in methods the login page offers. The hosted site keeps magic
// link + GitHub; self-hosted installs without SMTP or a GitHub OAuth app can
// switch to password sign-in through NEXT_PUBLIC_AUTH_METHODS, e.g.
// "password" or "password,github".

export type AuthMethod = 'magic_link' | 'github' | 'password'

const ALL_METHODS: readonly AuthMethod[] = ['magic_link', 'github', 'password']
const DEFAULT_METHODS: readonly AuthMethod[] = ['magic_link', 'github']

export function parseAuthMethods(value: string | undefined | null): AuthMethod[] {
  const parsed = (value ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is AuthMethod => (ALL_METHODS as readonly string[]).includes(item))
  return parsed.length > 0 ? [...new Set(parsed)] : [...DEFAULT_METHODS]
}

export function getAuthMethods(): AuthMethod[] {
  return parseAuthMethods(process.env.NEXT_PUBLIC_AUTH_METHODS)
}
