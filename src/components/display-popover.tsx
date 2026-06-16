'use client'

import React, { useEffect, useRef } from 'react'
import { LayoutList, Columns3 } from 'lucide-react'
import type {
  DisplayOptions,
  DisplayProperty,
  IssueGrouping,
  IssueLayout,
  IssueOrdering,
} from '@/lib/issue-filters'

interface DisplayPopoverProps {
  isOpen: boolean
  onClose: () => void
  value: DisplayOptions
  onChange: (next: DisplayOptions) => void
  availableProperties: DisplayProperty[]
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

const GROUPING_OPTIONS: Array<{ value: IssueGrouping; label: string }> = [
  { value: 'status', label: 'Status' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
  { value: 'none', label: 'No grouping' },
]

const ORDERING_OPTIONS: Array<{ value: IssueOrdering; label: string }> = [
  { value: 'priority', label: 'Priority' },
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'title', label: 'Title' },
]

const PROPERTY_LABELS: Record<DisplayProperty, string> = {
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  labels: 'Labels',
  estimate: 'Estimate',
  created: 'Created',
}

export function DisplayPopover({
  isOpen,
  onClose,
  value,
  onChange,
  availableProperties,
  triggerRef,
}: DisplayPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, triggerRef])

  if (!isOpen) return null

  const setLayout = (layout: IssueLayout) => onChange({ ...value, layout })
  const toggleProperty = (p: DisplayProperty) =>
    onChange({ ...value, properties: { ...value.properties, [p]: !value.properties[p] } })

  const segBase =
    'flex-1 flex items-center justify-center gap-1.5 h-7 rounded text-sm font-medium transition-colors duration-150'

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-1 z-50 w-[260px] origin-top-right rounded-md border border-border bg-background shadow-md p-3 space-y-3"
    >
      {/* Layout segmented control */}
      <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/50">
        <button
          onClick={() => setLayout('list')}
          className={`${segBase} ${
            value.layout === 'list'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <LayoutList className="h-3.5 w-3.5" />
          List
        </button>
        <button
          onClick={() => setLayout('board')}
          className={`${segBase} ${
            value.layout === 'board'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Columns3 className="h-3.5 w-3.5" />
          Board
        </button>
      </div>

      {/* Grouping */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Grouping</span>
        <select
          value={value.grouping}
          onChange={e => onChange({ ...value, grouping: e.target.value as IssueGrouping })}
          className="h-7 px-2 rounded border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          {GROUPING_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ordering */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Ordering</span>
        <select
          value={value.ordering}
          onChange={e => onChange({ ...value, ordering: e.target.value as IssueOrdering })}
          className="h-7 px-2 rounded border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
        >
          {ORDERING_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Display properties */}
      {availableProperties.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1.5">Display properties</div>
          <div className="flex flex-wrap gap-1.5">
            {availableProperties.map(p => {
              const active = value.properties[p]
              return (
                <button
                  key={p}
                  onClick={() => toggleProperty(p)}
                  className={`h-7 px-2 rounded-full border text-xs font-medium transition-colors duration-150 ${
                    active
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {PROPERTY_LABELS[p]}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
