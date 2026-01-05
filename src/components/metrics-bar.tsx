'use client'

import { useEffect, useState } from 'react'
import { FileText, Eye, Map } from 'lucide-react'

interface Metrics {
  forms: number
  views: number
  roadmaps: number
  total: number
}

interface MetricsResponse {
  success: boolean
  metrics: Metrics
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}

function StatItem({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
}) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span className="font-semibold text-foreground">{formatNumber(value)}</span>
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function MetricsBar() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/metrics/public')
        const data: MetricsResponse = await response.json()
        if (data.success && data.metrics) {
          setMetrics(data.metrics)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  // Don't render anything if we have no data or all zeros
  if (isLoading) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 py-6 border-t border-b border-border/50">
        <div className="h-5 w-32 bg-muted/50 rounded animate-pulse" />
        <div className="h-5 w-32 bg-muted/50 rounded animate-pulse" />
        <div className="h-5 w-32 bg-muted/50 rounded animate-pulse" />
      </div>
    )
  }

  if (!metrics || metrics.total === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 py-6 border-t border-b border-border/50">
      {metrics.forms > 0 && (
        <StatItem icon={FileText} value={metrics.forms} label="forms created" />
      )}
      {metrics.views > 0 && (
        <StatItem icon={Eye} value={metrics.views} label="views shared" />
      )}
      {metrics.roadmaps > 0 && (
        <StatItem icon={Map} value={metrics.roadmaps} label="roadmaps published" />
      )}
    </div>
  )
}
