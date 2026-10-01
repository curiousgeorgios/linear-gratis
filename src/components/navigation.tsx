'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { SimpleThemeToggle } from '@/components/theme-toggle'
import { LanguageToggle } from '@/components/language-toggle'
import Link from 'next/link'
import { useT } from '@/lib/i18n/client'

export function Navigation() {
  const t = useT()

  const { user, signOut, loading } = useAuth()

  if (loading) {
    return (
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">{t("linear.gratis")}</h1>
          <div className="text-sm text-muted-foreground">{t("Loading...")}</div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-semibold hover:text-primary transition-colors duration-200">
          {t("linear.gratis")}
        </Link>

        {/* Center navigation */}
        <div className="flex items-center gap-2">
          {!user && (
            <>
              <Link href="/features">
                <Button variant="ghost" size="sm" className="font-medium">
                  {t("Features")}
                </Button>
              </Link>
              <Link href="https://linear.gratis/view/lineargratis">
                <Button variant="ghost" size="sm" className="font-medium">
                  {t("Roadmap")}
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <SimpleThemeToggle />
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </span>
              <div className="flex items-center gap-2">
                <Link href="/forms">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("Forms")}
                  </Button>
                </Link>
                <Link href="/roadmaps">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("Roadmaps")}
                  </Button>
                </Link>
                <Link href="/views">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("Public views")}
                  </Button>
                </Link>
                <Link href="/profile/branding">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("Branding")}
                  </Button>
                </Link>
                <Link href="/profile/domains">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("Domains")}
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("Profile")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t("Sign out")}
                </Button>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="font-medium">
                {t("Sign in")}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}