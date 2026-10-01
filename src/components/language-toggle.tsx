'use client'

import { useRouter } from 'next/navigation'
import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/client'
import { LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

/** Switches between English and Arabic; the server re-renders with the new locale. */
export function LanguageToggle({ className }: { className?: string }) {
  const router = useRouter()
  const { locale, t } = useI18n()
  const next: Locale = locale === 'ar' ? 'en' : 'ar'

  const switchLocale = () => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`
    router.refresh()
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className={className ?? 'font-medium'}
      title={t('Switch language')}
      lang={next}
    >
      <Languages className="h-4 w-4" />
      <span>{next === 'ar' ? 'العربية' : 'English'}</span>
    </Button>
  )
}
