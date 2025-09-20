'use client'

import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { SimpleThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'

export function Navigation() {
  const { user, signOut, loading } = useAuth()

  if (loading) {
    return (
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">linear.gratis</h1>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-semibold hover:text-primary transition-colors duration-200">
          linear.gratis
        </Link>

        {/* Center navigation */}
        <div className="flex items-center gap-2">
          {!user && (
            <>
              <Link href="/features">
                <Button variant="ghost" size="sm" className="font-medium">
                  Features
                </Button>
              </Link>
              <Link href="https://linear.gratis/view/lineargratis">
                <Button variant="ghost" size="sm" className="font-medium">
                  Roadmap
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <SimpleThemeToggle />
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </span>
              <div className="flex items-center gap-2">
                <Link href="/forms">
                  <Button variant="ghost" size="sm" className="font-medium">
                    Forms
                  </Button>
                </Link>
                <Link href="/views">
                  <Button variant="ghost" size="sm" className="font-medium">
                    Public views
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="ghost" size="sm" className="font-medium">
                    Profile
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign out
                </Button>
              </div>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" className="font-medium">
                Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}