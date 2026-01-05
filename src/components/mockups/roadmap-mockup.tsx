'use client'

import { Badge } from '@/components/ui/badge'
import { ThumbsUp, MessageSquare } from 'lucide-react'

type Status = 'planned' | 'in-progress' | 'shipped'

interface RoadmapItem {
  id: string
  title: string
  status: Status
  votes: number
  comments: number
  quarter: string
}

const roadmapItems: RoadmapItem[] = [
  {
    id: 'LIN-45',
    title: 'Real-time collaboration',
    status: 'planned',
    votes: 24,
    comments: 8,
    quarter: 'Q1 2025',
  },
  {
    id: 'LIN-46',
    title: 'Advanced analytics dashboard',
    status: 'planned',
    votes: 18,
    comments: 5,
    quarter: 'Q1 2025',
  },
  {
    id: 'LIN-47',
    title: 'Mobile app',
    status: 'in-progress',
    votes: 42,
    comments: 12,
    quarter: 'Q2 2025',
  },
  {
    id: 'LIN-48',
    title: 'API v2 with webhooks',
    status: 'in-progress',
    votes: 31,
    comments: 9,
    quarter: 'Q2 2025',
  },
  {
    id: 'LIN-49',
    title: 'White-label solution',
    status: 'shipped',
    votes: 56,
    comments: 15,
    quarter: 'Shipped',
  },
]

const statusColors: Record<Status, string> = {
  planned: 'bg-gray-500',
  'in-progress': 'bg-yellow-500',
  shipped: 'bg-green-500',
}

const statusLabels: Record<Status, string> = {
  planned: 'Planned',
  'in-progress': 'In progress',
  shipped: 'Shipped',
}

export function RoadmapMockup() {
  return (
    <div className="p-4 bg-muted/30 min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Public roadmap</h3>
          <p className="text-xs text-muted-foreground">Vote on upcoming features</p>
        </div>
        <Badge variant="outline" className="text-xs">
          Timeline view
        </Badge>
      </div>

      {/* Roadmap items */}
      <div className="space-y-3">
        {roadmapItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border/50"
          >
            {/* Status indicator */}
            <div className="flex items-center gap-2 w-24 shrink-0">
              <div className={`w-2 h-2 rounded-full ${statusColors[item.status]}`} />
              <span className="text-xs text-muted-foreground">
                {statusLabels[item.status]}
              </span>
            </div>

            {/* Title */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.id}</p>
            </div>

            {/* Quarter */}
            <Badge variant="secondary" className="text-xs shrink-0">
              {item.quarter}
            </Badge>

            {/* Engagement */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-1 text-muted-foreground">
                <ThumbsUp className="h-3.5 w-3.5" />
                <span className="text-xs">{item.votes}</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs">{item.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
