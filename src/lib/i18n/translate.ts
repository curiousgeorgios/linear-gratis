import type { Locale } from './config'
import { ar } from './messages/ar'

export type TranslateVars = Record<string, string | number>
export type Translator = (message: string, vars?: TranslateVars) => string

const catalogues: Record<Locale, Record<string, string>> = { en: {}, ar }

/** Whitespace in JSX source is not significant, so lookups normalise it. */
export function normaliseMessage(message: string): string {
  return message.replace(/\s+/g, ' ').trim()
}

function interpolate(template: string, vars?: TranslateVars): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

/**
 * Message keys are the English source strings, so untranslated text degrades to
 * readable English instead of a missing-key placeholder. `{name}` placeholders
 * are interpolated from `vars`.
 */
export function translate(locale: Locale, message: string, vars?: TranslateVars): string {
  const key = normaliseMessage(message)
  const translated = catalogues[locale][key]
  // Keep a single leading/trailing space: "Powered by " is followed by a link.
  const lead = /^\s/.test(message) ? ' ' : ''
  const trail = key && /\s$/.test(message) ? ' ' : ''
  return lead + interpolate(translated ?? key, vars) + trail
}

export function createTranslator(locale: Locale): Translator {
  return (message, vars) => translate(locale, message, vars)
}
