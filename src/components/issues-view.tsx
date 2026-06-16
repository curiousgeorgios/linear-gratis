'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import type { LinearIssue } from '@/app/api/linear/issues/route'
import type { PublicView } from '@/lib/supabase'
import { KanbanBoard } from '@/components/kanban-board'
import { IssueListView } from '@/components/issue-list-view'
import { DisplayPopover } from '@/components/display-popover'
import {
  FilterDropdown,
  generateFilterOptions,
  type FilterState,
  type FilterOptions,
} from '@/components/filter-dropdown'
import {
  applyFilters,
  applyTab,
  type DisplayOptions,
  type DisplayProperty,
  type IssueTab,
  type ViewFlags,
} from '@/lib/issue-filters'

interface IssuesViewProps {
  issues: LinearIssue[]
  view: PublicView
  onIssueClick: (id: string) => void
  onCreateIssue: (stateName?: string) => void
}

const TABS: Array<{ value: IssueTab; label: string }> = [
  { value: 'all', label: 'All issues' },
  { value: 'active', label: 'Active' },
  { value: 'backlog', label: 'Backlog' },
]

const ALL_PROPERTIES: DisplayProperty[] = ['status', 'priority', 'assignee', 'labels', 'estimate', 'created']

const DEFAULT_DISPLAY: DisplayOptions = {
  layout: 'list',
  grouping: 'status',
  ordering: 'priority',
  properties: { status: true, priority: true, assignee: true, labels: true, estimate: true, created: true },
}

function loadDisplay(slug: string): DisplayOptions {
  try {
    const raw = localStorage.getItem(`linear-view-display:${slug}`)
    if (!raw) return DEFAULT_DISPLAY
    const parsed = JSON.parse(raw)
    return {
      layout: parsed.layout === 'board' ? 'board' : 'list',
      grouping: ['status', 'assignee', 'priority', 'none'].includes(parsed.grouping) ? parsed.grouping : 'status',
      ordering: ['priority', 'created', 'updated', 'title'].includes(parsed.ordering) ? parsed.ordering : 'priority',
      properties: { ...DEFAULT_DISPLAY.properties, ...(parsed.properties ?? {}) },
    }
  } catch {
    return DEFAULT_DISPLAY
  }
}

function getVisibleFilterOptions(issues: LinearIssue[], view: PublicView): FilterOptions {
  const options = generateFilterOptions(issues)
  return {
    ...options,
    assignees: view.show_assignees !== false ? options.assignees : [],
    priorities: view.show_priorities !== false ? options.priorities : [],
    labels: view.show_labels !== false ? options.labels : [],
    creators: view.show_assignees !== false ? options.creators : [],
  }
}

export function IssuesView({ issues, view, onIssueClick, onCreateIssue }: IssuesViewProps) {
  const [tab, setTab] = useState<IssueTab>('all')
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    statuses: [],
    assignees: [],
    priorities: [],
    labels: [],
    creators: [],
  })
  const [display, setDisplay] = useState<DisplayOptions>(DEFAULT_DISPLAY)
  const [showFilter, setShowFilter] = useState(false)
  const [showDisplay, setShowDisplay] = useState(false)
  const filterBtn = useRef<HTMLButtonElement>(null)
  const displayBtn = useRef<HTMLButtonElement>(null)

  // Read persisted display options after mount (avoids hydration mismatch);
  // persist on change. IssuesView only mounts once `view` is loaded, so
  // view.slug is always available here.
  useEffect(() => {
    setDisplay(loadDisplay(view.slug))
  }, [view.slug])
  useEffect(() => {
    try {
      localStorage.setItem(`linear-view-display:${view.slug}`, JSON.stringify(display))
    } catch {
      // ignore quota / unavailable storage
    }
  }, [display, view.slug])

  const flags: ViewFlags = {
    showAssignees: view.show_assignees !== false,
    showPriorities: view.show_priorities !== false,
    showLabels: view.show_labels !== false,
    showDescriptions: view.show_descriptions !== false,
  }

  const filterOptions = useMemo(() => getVisibleFilterOptions(issues, view), [issues, view])
  // tabIssues: tab applied but NOT filters. The list gets fully-reduced issues;
  // the board gets tabIssues + the filters prop and filters itself once, so it
  // keeps its own empty-state messages and never double-filters.
  const tabIssues = useMemo(() => applyTab(issues, tab), [issues, tab])
  const reduced = useMemo(
    () => applyFilters(tabIssues, filters, flags),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabIssues, filters, flags.showAssignees, flags.showPriorities, flags.showLabels, flags.showDescriptions],
  )

  const hasActiveFilters =
    !!filters.search ||
    filters.statuses.length > 0 ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.creators.length > 0

  const availableProperties = ALL_PROPERTIES.filter(
    p =>
      (p !== 'assignee' || flags.showAssignees) &&
      ((p !== 'priority' && p !== 'estimate') || flags.showPriorities) &&
      (p !== 'labels' || flags.showLabels),
  )

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Left: tabs + filter */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                  tab === t.value
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:block w-px h-5 bg-border/60" />

          <div className="relative flex items-center gap-2">
            <button
              ref={filterBtn}
              onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                showFilter || hasActiveFilters
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M14.25 3a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1 0-1.5h12.5ZM4 8a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 8Zm2.75 3.5a.75.75 0 0 0 0 1.5h2.5a.75.75 0 0 0 0-1.5h-2.5Z"
                />
              </svg>
              <span className="hidden sm:inline">Filter</span>
              {hasActiveFilters && <span className="w-2 h-2 bg-primary rounded-full" />}
            </button>

            <FilterDropdown
              isOpen={showFilter}
              onClose={() => setShowFilter(false)}
              filters={filters}
              onFiltersChange={setFilters}
              filterOptions={filterOptions}
              triggerRef={filterBtn}
            />

            {/* Active filter indicators */}
            {hasActiveFilters && (
              <div className="hidden md:flex items-center gap-2 text-xs">
                {filters.search && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                    Search: &quot;{filters.search}&quot;
                  </span>
                )}
                {filters.statuses.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {filters.statuses.length} status{filters.statuses.length !== 1 ? 'es' : ''}
                  </span>
                )}
                {filters.assignees.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {filters.assignees.length} assignee{filters.assignees.length !== 1 ? 's' : ''}
                  </span>
                )}
                {filters.priorities.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {filters.priorities.length} priorit{filters.priorities.length !== 1 ? 'ies' : 'y'}
                  </span>
                )}
                {filters.labels.length > 0 && (
                  <span className="px-2 py-1 bg-primary/10 text-primary rounded-full">
                    {filters.labels.length} label{filters.labels.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: display + new issue */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <button
              ref={displayBtn}
              onClick={() => setShowDisplay(v => !v)}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm rounded-md transition-colors duration-150 ${
                showDisplay
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M7 2.5C8.11933 2.5 9.06613 3.23584 9.38477 4.25H14.75C15.1642 4.25 15.5 4.58579 15.5 5C15.5 5.41421 15.1642 5.75 14.75 5.75H9.38477C9.06613 6.76416 8.11933 7.5 7 7.5C5.88067 7.5 4.93387 6.76416 4.61523 5.75H2.25C1.83579 5.75 1.5 5.41421 1.5 5C1.5 4.58579 1.83579 4.25 2.25 4.25H4.61523C4.93387 3.23584 5.88067 2.5 7 2.5ZM7 4C6.44772 4 6 4.44772 6 5C6 5.55228 6.44772 6 7 6C7.55228 6 8 5.55228 8 5C8 4.44772 7.55228 4 7 4Z"
                />
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 13.5C8.88067 13.5 7.93387 12.7642 7.61523 11.75H2.25C1.83579 11.75 1.5 11.4142 1.5 11C1.5 10.5858 1.83579 10.25 2.25 10.25H7.61523C7.93387 9.23584 8.88067 8.5 10 8.5C11.1193 8.5 12.0661 9.23584 12.3848 10.25H14.75C15.1642 10.25 15.5 10.5858 15.5 11C15.5 11.4142 15.1642 11.75 14.75 11.75H12.3848C12.0661 12.7642 11.1193 13.5 10 13.5ZM10 12C10.5523 12 11 11.5523 11 11C11 10.4477 10.5523 10 10 10C9.44772 10 9 10.4477 9 11C9 11.5523 9.44772 12 10 12Z"
                />
              </svg>
              <span className="hidden sm:inline">Display</span>
            </button>

            <DisplayPopover
              isOpen={showDisplay}
              onClose={() => setShowDisplay(false)}
              value={display}
              onChange={setDisplay}
              availableProperties={availableProperties}
              triggerRef={displayBtn}
            />
          </div>

          {view.allow_issue_creation && (
            <button
              onClick={() => onCreateIssue()}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors duration-150"
              aria-label="Create issue"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New issue</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {display.layout === 'list' ? (
        <IssueListView
          issues={reduced}
          display={display}
          flags={flags}
          allowIssueCreation={!!view.allow_issue_creation}
          totalCount={issues.length}
          onIssueClick={onIssueClick}
          onCreateIssue={onCreateIssue}
        />
      ) : (
        <KanbanBoard
          issues={tabIssues}
          filters={filters}
          showAssignees={view.show_assignees}
          showLabels={view.show_labels}
          showPriorities={view.show_priorities}
          showDescriptions={view.show_descriptions}
          onIssueClick={onIssueClick}
          className="w-full"
        />
      )}
    </div>
  )
}
