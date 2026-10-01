export const LOCALES = ['en', 'ar'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_COOKIE = 'lg-locale'
export const RTL_LOCALES: ReadonlySet<Locale> = new Set(['ar'])

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr'
}

/** Deployment-wide default (NEXT_PUBLIC_DEFAULT_LOCALE); falls back to English. */
export function getDefaultLocale(): Locale {
  const configured = process.env.NEXT_PUBLIC_DEFAULT_LOCALE
  return isLocale(configured) ? configured : 'en'
}

/**
 * Pick the locale for a request: explicit cookie choice first, then the
 * deployment default (when configured), then the browser's Accept-Language.
 */
export function resolveLocale(input: {
  cookie?: string | null
  acceptLanguage?: string | null
  configuredDefault?: string | null
}): Locale {
  if (isLocale(input.cookie)) return input.cookie
  if (isLocale(input.configuredDefault)) return input.configuredDefault

  for (const part of (input.acceptLanguage ?? '').split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().split('-')[0]
    if (isLocale(tag)) return tag
  }
  return 'en'
}

/** BCP 47 tag used for Intl formatting. Latin digits keep identifiers (ENG-12) and dates consistent. */
export function intlLocaleOf(locale: Locale): string {
  return locale === 'ar' ? 'ar-u-nu-latn' : 'en-US'
}
