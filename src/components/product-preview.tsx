'use client'

import { cn } from '@/lib/utils'

interface ProductPreviewProps {
  children: React.ReactNode
  className?: string
  url?: string
}

export function ProductPreview({ children, className, url = 'linear.gratis/view/your-project' }: ProductPreviewProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl overflow-hidden border border-border/50 shadow-2xl bg-card',
        className
      )}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
        {/* Traffic lights */}
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>

        {/* URL bar */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-background/50 text-xs text-muted-foreground max-w-md w-full">
            <svg
              className="h-3 w-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="truncate">{url}</span>
          </div>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-[52px]" />
      </div>

      {/* Content */}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}
