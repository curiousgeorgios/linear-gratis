'use client'

import { SimpleThemeToggle } from '@/components/theme-toggle'
import Link from 'next/link'

export function Navigation() {
  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-semibold hover:text-primary transition-colors duration-200">
          Linear Clone
        </Link>
        <div className="flex items-center gap-2">
          <SimpleThemeToggle />
        </div>
      </div>
    </nav>
  )
}
