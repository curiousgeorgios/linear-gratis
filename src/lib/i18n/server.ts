import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, getDefaultLocale, resolveLocale, type Locale } from './config'
import { createTranslator, type Translator } from './translate'

export async function getLocale(): Promise<Locale> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  return resolveLocale({
    cookie: cookieStore.get(LOCALE_COOKIE)?.value,
    configuredDefault: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || null,
    acceptLanguage: headerStore.get('accept-language'),
  })
}

/** Translator for server components, route handlers and metadata. */
export async function getT(): Promise<Translator> {
  return createTranslator(await getLocale())
}

export { getDefaultLocale }
