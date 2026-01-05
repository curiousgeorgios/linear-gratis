'use client'

import { Badge } from '@/components/ui/badge'

type Priority = 'high' | 'medium' | 'low'

interface Issue {
  id: string
  title: string
  priority: Priority
  labels: string[]
}

interface Column {
  name: string
  color: string
  issues: Issue[]
}

const columns: Column[] = [
  {
    name: 'Backlog',
    color: 'bg-gray-500',
    issues: [
      { id: 'LIN-42', title: 'Add dark mode support', priority: 'medium', labels: ['enhancement'] },
      { id: 'LIN-43', title: 'Improve mobile responsiveness', priority: 'low', labels: ['ui'] },
    ],
  },
  {
    name: 'In progress',
    color: 'bg-yellow-500',
    issues: [
      { id: 'LIN-38', title: 'API rate limiting', priority: 'high', labels: ['backend'] },
      { id: 'LIN-39', title: 'User onboarding flow', priority: 'medium', labels: ['ux'] },
    ],
  },
  {
    name: 'In review',
    color: 'bg-blue-500',
    issues: [
      { id: 'LIN-35', title: 'Dashboard analytics', priority: 'medium', labels: ['feature'] },
    ],
  },
  {
    name: 'Done',
    color: 'bg-green-500',
    issues: [
      { id: 'LIN-31', title: 'SSO integration', priority: 'high', labels: ['auth'] },
      { id: 'LIN-32', title: 'Email notifications', priority: 'medium', labels: ['feature'] },
      { id: 'LIN-33', title: 'Export to CSV', priority: 'low', labels: ['feature'] },
    ],
  },
]

const priorityColors = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
}

function PriorityIcon({ priority }: { priority: Priority }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${priorityColors[priority]}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      {priority === 'high' && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      )}
      {priority === 'medium' && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
      )}
      {priority === 'low' && (
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      )}
    </svg>
  )
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="p-3 bg-background rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        <PriorityIcon priority={issue.priority} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{issue.id}</p>
          <p className="text-sm font-medium leading-tight truncate">{issue.title}</p>
          <div className="flex gap-1 mt-2">
            {issue.labels.map((label) => (
              <Badge
                key={label}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function KanbanMockup() {
  return (
    <div className="p-4 bg-muted/30 min-h-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">Product roadmap</h3>
          <p className="text-xs text-muted-foreground">Real-time view • 8 issues</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-xs">
            All statuses
          </Badge>
          <Badge variant="outline" className="text-xs">
            All priorities
          </Badge>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-4 gap-3">
        {columns.map((column) => (
          <div key={column.name} className="space-y-2">
            {/* Column header */}
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className={`w-2 h-2 rounded-full ${column.color}`} />
              <span className="text-xs font-medium">{column.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {column.issues.length}
              </span>
            </div>

            {/* Issues */}
            <div className="space-y-2">
              {column.issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
