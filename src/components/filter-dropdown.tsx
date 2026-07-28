'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LinearIssue } from '@/app/api/linear/issues/route'
import { Checkbox } from '@/components/ui/checkbox'
import { PriorityIcon } from '@/components/priority-icon'
import { StateIcon, StatusCategoryIcon } from '@/components/state-icon'

export type FilterState = {
  search: string
  statuses: string[]
  assignees: string[]
  priorities: number[]
  labels: string[]
  creators: string[]
}

export type FilterOptions = {
  statuses: Array<{ name: string; color: string; type: string }>
  statusCounts?: Record<string, number>
  assignees: Array<{ id: string; name: string }>
  priorities: Array<{ value: number; label: string }>
  labels: Array<{ id: string; name: string; color: string }>
  creators: Array<{ id: string; name: string }>
}

interface FilterDropdownProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  filterOptions: FilterOptions
  triggerRef: React.RefObject<HTMLButtonElement | null>
}

export function FilterDropdown({
  isOpen,
  onClose,
  filters,
  onFiltersChange,
  filterOptions,
  triggerRef,
}: FilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState(filters.search)
  const [hoverSections, setHoverSections] = useState<Set<string>>(new Set())
  const [submenuPosition, setSubmenuPosition] = useState<{ top: number; left: number } | null>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

  useEffect(() => {
    setSearch(filters.search)
  }, [filters.search])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
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

  const handleSearchChange = (value: string) => {
    setSearch(value)
    onFiltersChange({ ...filters, search: value })
  }

  const toggleFilter = (
    category: keyof FilterState,
    value: string | number
  ) => {
    const currentValues = filters[category] as (string | number)[]
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]

    onFiltersChange({ ...filters, [category]: newValues })
  }


  const handleSectionMouseEnter = (section: string, event: React.MouseEvent) => {
    const newHover = new Set(hoverSections)
    newHover.add(section)
    setHoverSections(newHover)

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const dropdownRect = dropdownRef.current?.getBoundingClientRect()

    if (dropdownRect) {
      setSubmenuPosition({
        top: rect.top,
        left: rect.right + 4 // 4px gap between main menu and submenu
      })
      setActiveSubmenu(section)
    }
  }

  const handleSectionMouseLeave = (section: string) => {
    const newHover = new Set(hoverSections)
    newHover.delete(section)
    setHoverSections(newHover)

    setTimeout(() => {
      if (!hoverSections.has(section)) {
        setActiveSubmenu(null)
        setSubmenuPosition(null)
      }
    }, 100) // Small delay to allow moving to submenu
  }

  const handleSubmenuMouseEnter = () => {
    // Keep submenu open when hovering over it
  }

  const handleSubmenuMouseLeave = () => {
    setActiveSubmenu(null)
    setSubmenuPosition(null)
    setHoverSections(new Set())
  }

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      statuses: [],
      assignees: [],
      priorities: [],
      labels: [],
      creators: [],
    })
    setSearch('')
  }

  const hasActiveFilters = filters.search ||
    filters.statuses.length > 0 ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.creators.length > 0

  if (!isOpen) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 min-w-[206px] overflow-hidden rounded-md border bg-background shadow-md"
      style={{
        top: '100%',
        left: '-0.5px',
        transformOrigin: '-0.5px -4.5px',
        height: 'auto',
        maxHeight: '706px',
        width: '206px'
      }}
    >
      {/* Search input row - exactly matching Linear's structure */}
      <div data-list-row="true" className="flex">
        <form
          data-placeholder="Filter…"
          autoComplete="off"
          data-form-type="other"
          className="w-full relative"
        >
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            Showing all items
          </span>
          <input
            type="text"
            placeholder="Filter…"
            spellCheck="false"
            autoComplete="off"
            autoCorrect="off"
            data-1p-ignore="true"
            data-form-type="other"
            data-lpignore="true"
            name="action-menu-filter"
            aria-label="Filter…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border-0 bg-transparent focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
          <span className="absolute right-2 top-1.5">
            <span
              aria-label="F"
              className="inline-flex h-5 w-5 items-center justify-center rounded border border-border/50 bg-muted/30 text-xs font-medium text-muted-foreground"
            >
              <kbd aria-hidden="true" className="font-mono">F</kbd>
            </span>
          </span>
        </form>
      </div>

      {/* Content container - using Linear's exact virtual scrolling structure */}
      <div className="relative h-auto w-full overflow-auto" style={{ maxHeight: '668px' }}>
        <ul
          role="listbox"
          aria-multiselectable="true"
          data-checkmark-trailing="false"
          className="w-full"
        >

          {/* Status filter */}
          {filterOptions.statuses.length > 0 && (
            <li
              role="option"
              data-list-row="true"
              data-focused="false"
              aria-disabled="false"
              aria-selected={hoverSections.has('status')}
              className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onMouseEnter={(e) => handleSectionMouseEnter('status', e)}
              onMouseLeave={() => handleSectionMouseLeave('status')}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    <StatusCategoryIcon size={16} />
                  </span>
                  <span className="text-sm font-medium text-foreground">Status</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ▶
                </div>
              </div>
            </li>
          )}


          {/* Assignee filter */}
          {filterOptions.assignees.length > 0 && (
            <li
              role="option"
              data-list-row="true"
              aria-selected={hoverSections.has('assignee')}
              className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onMouseEnter={(e) => handleSectionMouseEnter('assignee', e)}
              onMouseLeave={() => handleSectionMouseLeave('assignee')}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16" fill="lch(64.892% 1.933 272 / 1)">
                    <path d="M8 4a2 2 0 0 0-2 2v.5a2 2 0 0 0 4 0V6a2 2 0 0 0-2-2Z"></path>
                    <path fillRule="evenodd" clipRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm-2.879-4.121-1.01 1.01a5.5 5.5 0 1 1 7.778 0l-1.01-1.01A3 3 0 0 0 8.757 10H7.243a3 3 0 0 0-2.122.879Z"></path>
                  </svg>
                  <span className="text-sm font-medium text-foreground">Assignee</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ▶
                </div>
              </div>
            </li>
          )}


          {/* Priority filter */}
          {filterOptions.priorities.length > 0 && (
            <li
              role="option"
              data-list-row="true"
              aria-selected={hoverSections.has('priority')}
              className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onMouseEnter={(e) => handleSectionMouseEnter('priority', e)}
              onMouseLeave={() => handleSectionMouseLeave('priority')}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16" fill="lch(64.892% 1.933 272 / 1)">
                    <rect x="1" y="8" width="3" height="6" rx="1"></rect>
                    <rect x="6" y="5" width="3" height="9" rx="1"></rect>
                    <rect x="11" y="2" width="3" height="12" rx="1"></rect>
                  </svg>
                  <span className="text-sm font-medium text-foreground">Priority</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ▶
                </div>
              </div>
            </li>
          )}


          {/* Labels filter */}
          {filterOptions.labels.length > 0 && (
            <li
              role="option"
              data-list-row="true"
              aria-selected={hoverSections.has('labels')}
              className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
              onMouseEnter={(e) => handleSectionMouseEnter('labels', e)}
              onMouseLeave={() => handleSectionMouseLeave('labels')}
            >
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16" fill="lch(64.892% 1.933 272 / 1)">
                    <path d="M12 11.5V13H5.132v-1.5H12Zm1.5-1.5V6a1.5 1.5 0 0 0-1.346-1.492L12 4.5H5.133a.5.5 0 0 0-.303.103l-.08.076-2.382 2.834a.5.5 0 0 0-.11.234l-.008.087v.331a.5.5 0 0 0 .118.321l2.382 2.835a.5.5 0 0 0 .383.179V13l-.22-.012a2 2 0 0 1-1.16-.54l-.15-.16L1.218 9.45a2 2 0 0 1-.46-1.11L.75 8.165v-.331a2 2 0 0 1 .363-1.147l.106-.14 2.383-2.834a2 2 0 0 1 1.312-.701L5.134 3H12a3 3 0 0 1 3 3v4a3 3 0 0 1-3.002 3v-1.5c.778 0 1.417-.59 1.494-1.347L13.5 10Z"></path>
                    <path d="M5.5 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path>
                  </svg>
                  <span className="text-sm font-medium text-foreground">Labels</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  ▶
                </div>
              </div>
            </li>
          )}


          {/* Clear all filters option */}
          {hasActiveFilters && (
            <>
              <div role="separator" className="my-1 h-px bg-border"></div>
              <li
                role="option"
                data-list-row="true"
                aria-selected={false}
                className="relative flex cursor-pointer select-none items-center px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent"
                onClick={clearAllFilters}
              >
                <div className="flex w-full items-center gap-2">
                  <span className="text-sm text-muted-foreground">Clear all filters</span>
                </div>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Submenu window */}
      {activeSubmenu && submenuPosition && (
        <div
          className="fixed z-[1000] min-w-[200px] overflow-hidden rounded-md border bg-background shadow-md"
          style={{
            top: submenuPosition.top,
            left: submenuPosition.left,
            transformOrigin: '0px 0px',
            height: 'auto',
            maxHeight: '300px',
            width: '200px'
          }}
          onMouseEnter={handleSubmenuMouseEnter}
          onMouseLeave={handleSubmenuMouseLeave}
        >
          <div className="relative h-auto w-full overflow-auto" style={{ maxHeight: '300px' }}>
            <ul
              role="listbox"
              aria-multiselectable="true"
              data-checkmark-trailing="false"
              className="w-full p-1"
            >
              {/* Status submenu */}
              {activeSubmenu === 'status' && filterOptions.statuses.map((status) => {
                const statusCount = filterOptions.statusCounts?.[status.name] || 0
                return (
                  <li
                    key={status.name}
                    role="option"
                    data-list-row="true"
                    data-focused="false"
                    aria-disabled="false"
                    aria-selected="false"
                    aria-checked={filters.statuses.includes(status.name)}
                    className="relative flex cursor-pointer select-none items-center py-1 px-2 text-sm outline-none hover:bg-accent focus:bg-accent rounded"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFilter('statuses', status.name)
                    }}
                  >
                    {/* Checkbox container */}
                    <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 mr-2">
                      <Checkbox
                        checked={filters.statuses.includes(status.name)}
                        onChange={() => toggleFilter('statuses', status.name)}
                        onClick={(e) => e.stopPropagation()}
                        tabIndex={-1}
                      />
                    </div>

                    {/* Content container */}
                    <div className="flex items-center justify-between flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <StateIcon
                          type={status.type}
                          color={status.color}
                          name={status.name}
                        />
                        <span className="text-sm font-medium text-foreground truncate">{status.name}</span>
                      </div>

                      {/* Issue count */}
                      {statusCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 ml-2">
                          <span className="font-medium">
                            {statusCount} {statusCount === 1 ? 'issue' : 'issues'}
                          </span>
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}

              {/* Assignee submenu */}
              {activeSubmenu === 'assignee' && filterOptions.assignees.map((assignee) => (
                <li
                  key={assignee.id}
                  role="option"
                  data-list-row="true"
                  data-focused="false"
                  aria-disabled="false"
                  aria-selected="false"
                  aria-checked={filters.assignees.includes(assignee.id)}
                  className="relative flex cursor-pointer select-none items-center py-1 px-2 text-sm outline-none hover:bg-accent focus:bg-accent rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFilter('assignees', assignee.id)
                  }}
                >
                  {/* Checkbox container */}
                  <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 mr-2">
                    <Checkbox
                      checked={filters.assignees.includes(assignee.id)}
                      onChange={() => toggleFilter('assignees', assignee.id)}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={-1}
                    />
                  </div>

                  {/* Content container */}
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">{assignee.name}</span>
                  </div>
                </li>
              ))}

              {/* Priority submenu */}
              {activeSubmenu === 'priority' && filterOptions.priorities.map((priority) => (
                <li
                  key={priority.value}
                  role="option"
                  data-list-row="true"
                  data-focused="false"
                  aria-disabled="false"
                  aria-selected="false"
                  aria-checked={filters.priorities.includes(priority.value)}
                  className="relative flex cursor-pointer select-none items-center py-1 px-2 text-sm outline-none hover:bg-accent focus:bg-accent rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFilter('priorities', priority.value)
                  }}
                >
                  {/* Checkbox container */}
                  <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 mr-2">
                    <Checkbox
                      checked={filters.priorities.includes(priority.value)}
                      onChange={() => toggleFilter('priorities', priority.value)}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={-1}
                    />
                  </div>

                  {/* Content container */}
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <PriorityIcon priority={priority.value} priorityLabel={priority.label} />
                      <span className="text-sm font-medium text-foreground truncate">{priority.label}</span>
                    </div>
                  </div>
                </li>
              ))}

              {/* Labels submenu */}
              {activeSubmenu === 'labels' && filterOptions.labels.map((label) => (
                <li
                  key={label.id}
                  role="option"
                  data-list-row="true"
                  data-focused="false"
                  aria-disabled="false"
                  aria-selected="false"
                  aria-checked={filters.labels.includes(label.id)}
                  className="relative flex cursor-pointer select-none items-center py-1 px-2 text-sm outline-none hover:bg-accent focus:bg-accent rounded"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFilter('labels', label.id)
                  }}
                >
                  {/* Checkbox container */}
                  <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 mr-2">
                    <Checkbox
                      checked={filters.labels.includes(label.id)}
                      onChange={() => toggleFilter('labels', label.id)}
                      onClick={(e) => e.stopPropagation()}
                      tabIndex={-1}
                    />
                  </div>

                  {/* Content container */}
                  <div className="flex items-center justify-between flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="text-sm font-medium text-foreground truncate">{label.name}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to generate filter options from issues
export function generateFilterOptions(issues: LinearIssue[]): FilterOptions {
  const statuses = Array.from(
    new Map(
      issues.map(issue => [
        issue.state.name,
        { name: issue.state.name, color: issue.state.color, type: issue.state.type }
      ])
    ).values()
  )

  // Generate status counts
  const statusCounts = issues.reduce((acc, issue) => {
    acc[issue.state.name] = (acc[issue.state.name] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const assignees = Array.from(
    new Map(
      issues
        .filter(issue => issue.assignee)
        .map(issue => [
          issue.assignee!.id,
          { id: issue.assignee!.id, name: issue.assignee!.name }
        ])
    ).values()
  )

  // Linear's real priority schema: 0 None, 1 Urgent, 2 High, 3 Medium, 4 Low.
  // (Matches priority-icon.tsx; ordered Urgent → No priority.)
  const priorities = [
    { value: 1, label: 'Urgent' },
    { value: 2, label: 'High' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Low' },
    { value: 0, label: 'No priority' },
  ].filter(priority =>
    issues.some(issue => issue.priority === priority.value)
  )

  const labels = Array.from(
    new Map(
      issues
        .flatMap(issue => issue.labels)
        .map(label => [label.id, label])
    ).values()
  )

  const creators = assignees

  return {
    statuses,
    statusCounts,
    assignees,
    priorities,
    labels,
    creators,
  }
}
