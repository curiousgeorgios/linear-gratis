'use client'

import React, { useState, useEffect, useRef } from 'react'
import { LinearIssue } from '@/app/api/linear/issues/route'
import { Checkbox } from '@/components/ui/checkbox'

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

const getPriorityIcon = (priority: number) => {
  if (priority === 0) {
    return (
      <svg className="w-3.5 h-3.5 text-muted-foreground/70" viewBox="0 0 16 16" fill="currentColor">
        <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
        <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
        <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      </svg>
    )
  }

  if (priority >= 3) {
    return (
      <svg className="w-3.5 h-3.5 text-orange-500" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M3.741 14.5h8.521c1.691 0 2.778-1.795 1.993-3.293l-4.26-8.134c-.842-1.608-3.144-1.608-3.986 0l-4.26 8.134C.962 12.705 2.05 14.5 3.74 14.5ZM8 3.368a.742.742 0 0 0-.663.402l-4.26 8.134A.75.75 0 0 0 3.741 13H8V3.367Z" clipRule="evenodd"></path>
      </svg>
    )
  }

  return (
    <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
      <rect x="11.5" y="2" width="3" height="12" rx="1"></rect>
    </svg>
  )
}

const getStateIcon = (stateType: string, color: string) => {
  const strokeColor = color || '#9ca3af'

  if (stateType === 'completed') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5"></circle>
        <path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
    )
  }

  if (stateType === 'started') {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
        <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="6.094689747964199" transform="rotate(-90 7 7)"></circle>
      </svg>
    )
  }

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7"></circle>
      <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 7 7)"></circle>
    </svg>
  )
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
                  <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 14 14" fill="lch(64.892% 1.933 272 / 1)">
                    <path d="M13.9408 7.91426L11.9576 7.65557C11.9855 7.4419 12 7.22314 12 7C12 6.77686 11.9855 6.5581 11.9576 6.34443L13.9408 6.08573C13.9799 6.38496 14 6.69013 14 7C14 7.30987 13.9799 7.61504 13.9408 7.91426ZM13.4688 4.32049C13.2328 3.7514 12.9239 3.22019 12.5538 2.73851L10.968 3.95716C11.2328 4.30185 11.4533 4.68119 11.6214 5.08659L13.4688 4.32049ZM11.2615 1.4462L10.0428 3.03204C9.69815 2.76716 9.31881 2.54673 8.91341 2.37862L9.67951 0.531163C10.2486 0.767153 10.7798 1.07605 11.2615 1.4462ZM7.91426 0.0591659L7.65557 2.04237C7.4419 2.01449 7.22314 2 7 2C6.77686 2 6.5581 2.01449 6.34443 2.04237L6.08574 0.059166C6.38496 0.0201343 6.69013 0 7 0C7.30987 0 7.61504 0.0201343 7.91426 0.0591659ZM4.32049 0.531164L5.08659 2.37862C4.68119 2.54673 4.30185 2.76716 3.95716 3.03204L2.73851 1.4462C3.22019 1.07605 3.7514 0.767153 4.32049 0.531164ZM1.4462 2.73851L3.03204 3.95716C2.76716 4.30185 2.54673 4.68119 2.37862 5.08659L0.531164 4.32049C0.767153 3.7514 1.07605 3.22019 1.4462 2.73851ZM0.0591659 6.08574C0.0201343 6.38496 0 6.69013 0 7C0 7.30987 0.0201343 7.61504 0.059166 7.91426L2.04237 7.65557C2.01449 7.4419 2 7.22314 2 7C2 6.77686 2.01449 6.5581 2.04237 6.34443L0.0591659 6.08574ZM0.531164 9.67951L2.37862 8.91341C2.54673 9.31881 2.76716 9.69815 3.03204 10.0428L1.4462 11.2615C1.07605 10.7798 0.767153 10.2486 0.531164 9.67951ZM2.73851 12.5538L3.95716 10.968C4.30185 11.2328 4.68119 11.4533 5.08659 11.6214L4.32049 13.4688C3.7514 13.2328 3.22019 12.9239 2.73851 12.5538ZM6.08574 13.9408L6.34443 11.9576C6.5581 11.9855 6.77686 12 7 12C7.22314 12 7.4419 11.9855 7.65557 11.9576L7.91427 13.9408C7.61504 13.9799 7.30987 14 7 14C6.69013 14 6.38496 13.9799 6.08574 13.9408ZM9.67951 13.4688L8.91341 11.6214C9.31881 11.4533 9.69815 11.2328 10.0428 10.968L11.2615 12.5538C10.7798 12.9239 10.2486 13.2328 9.67951 13.4688ZM12.5538 11.2615L10.968 10.0428C11.2328 9.69815 11.4533 9.31881 11.6214 8.91341L13.4688 9.67951C13.2328 10.2486 12.924 10.7798 12.5538 11.2615Z" stroke="none"></path>
                  </svg>
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
                        {getStateIcon(status.type, status.color)}
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
                      {getPriorityIcon(priority.value)}
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

  const priorities = [
    { value: 0, label: 'No priority' },
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Urgent' },
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