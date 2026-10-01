'use client'

import { createContext, useContext, useMemo } from 'react'
import { DirectionProvider } from '@radix-ui/react-direction'
import { directionOf, intlLocaleOf, type Locale } from './config'
import { createTranslator, type Translator } from './translate'

type I18nValue = {
  locale: Locale
  dir: 'ltr' | 'rtl'
  t: Translator
  /** BCP 47 tag for Intl/toLocale* formatting. */
  intlLocale: string
}

const I18nContext = createContext<I18nValue>({
  locale: 'en',
  dir: 'ltr',
  t: createTranslator('en'),
  intlLocale: 'en-US',
})

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo<I18nValue>(
    () => ({ locale, dir: directionOf(locale), t: createTranslator(locale), intlLocale: intlLocaleOf(locale) }),
    [locale],
  )
  return (
    <I18nContext.Provider value={value}>
      <DirectionProvider dir={value.dir}>{children}</DirectionProvider>
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}

/** Translator hook for client components. */
export function useT(): Translator {
  return useContext(I18nContext).t
}
