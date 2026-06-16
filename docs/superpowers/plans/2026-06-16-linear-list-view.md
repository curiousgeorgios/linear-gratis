# Linear list view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a faithful clone of Linear's "All issues" list view the default presentation for public views, with a List/Board toggle that keeps the existing kanban as "Board".

**Architecture:** Frontend-only. A new `<IssuesView>` wrapper owns the toolbar (tabs + filter + display popover + new issue) and renders either a new `<IssueListView>` (default) or the existing `<KanbanBoard>`. Pure helpers in `src/lib/issue-filters.ts` (filter/tab/group/order) are shared by both so behaviour can't drift. No GraphQL/DB/redaction changes; columns needing un-fetched fields (project/cycle/due date) are omitted.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind v4 · lucide-react · framer-motion (available, optional). No unit-test runner exists, so verification is `npx tsc --noEmit`, `npm run lint`, and in-browser parity against `https://linear.app/digital-nachos/team/DEL/all`.

**Spec:** `docs/superpowers/specs/2026-06-16-linear-list-view-design.md`

---

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/state-icon.tsx` | Create | The status SVG, extracted from the two places it's duplicated. |
| `src/lib/issue-filters.ts` | Create | Pure helpers + shared constants: `STATE_TYPE_ORDER`, `PRIORITY_RANK`, `priorityLabel`, `applyTab`, `applyFilters`, `groupIssues`, `orderIssues`, plus the option/`DisplayOptions` types. |
| `src/components/issue-list-view.tsx` | Create | Grouped, dense Linear list renderer. |
| `src/components/display-popover.tsx` | Create | List/Board toggle, grouping, ordering, property toggles. |
| `src/components/issues-view.tsx` | Create | Wrapper: toolbar + state (filters/tab/layout/display) + renders list or board. |
| `src/components/kanban-board.tsx` | Modify | Use shared `StateIcon` + `applyFilters` + `STATE_TYPE_ORDER`. Behaviour unchanged. |
| `src/components/filter-dropdown.tsx` | Modify | Use shared `StateIcon`; fix priority labels. |
| `src/app/view/[slug]/page.tsx` | Modify | Render `<IssuesView>`; drop old filter bar + filter state. |

---

## Task 1: Shared `StateIcon` component

**Files:**
- Create: `src/components/state-icon.tsx`
- Modify: `src/components/kanban-board.tsx` (remove local `getStateIcon`, import shared), `src/components/filter-dropdown.tsx` (same)

- [ ] **Step 1: Create the component** (verbatim copy of the existing SVG logic, now in one place)

```tsx
// src/components/state-icon.tsx
type StateIconProps = {
  type: string
  color: string
  size?: number
}

/**
 * Linear workflow-state icon. Shape is driven by the state's `type`
 * (completed / started / everything-else) and tinted by the state's colour.
 * Extracted from kanban-board.tsx and filter-dropdown.tsx so list, board and
 * filter UIs render an identical icon.
 */
export function StateIcon({ type, color, size = 14 }: StateIconProps) {
  const strokeColor = color || '#9ca3af'

  if (type === 'completed') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill={strokeColor} stroke={strokeColor} strokeWidth="1.5" />
        <path d="M4.5 7l2 2 3-3" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  if (type === 'started') {
    return (
      <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
        <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7" />
        <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="6.094689747964199" transform="rotate(-90 7 7)" />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill="none" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3.14 0" strokeDashoffset="-0.7" />
      <circle className="progress" cx="7" cy="7" r="2" fill="none" stroke={strokeColor} strokeWidth="4" strokeDasharray="12.189379495928398 24.378758991856795" strokeDashoffset="12.189379495928398" transform="rotate(-90 7 7)" />
    </svg>
  )
}
```

- [ ] **Step 2: Refactor `kanban-board.tsx`** — delete the local `getStateIcon` (lines ~25-52), add `import { StateIcon } from '@/components/state-icon'`, and replace the two call sites `{getStateIcon(column.type, columnColor)}` → `<StateIcon type={column.type} color={columnColor} />` and `{getStateIcon(issue.state.type, issue.state.color)}` → `<StateIcon type={issue.state.type} color={issue.state.color} />`.

- [ ] **Step 3: Refactor `filter-dropdown.tsx`** — delete the local `getStateIcon` (lines ~35-62), add the import, replace the call site at the status submenu `{getStateIcon(status.type, status.color)}` → `<StateIcon type={status.type} color={status.color} />`.

- [ ] **Step 4: Type-check** — `npx tsc --noEmit` → no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/state-icon.tsx src/components/kanban-board.tsx src/components/filter-dropdown.tsx
git commit -m "refactor: extract shared StateIcon component"
```

---

## Task 2: Shared filter/tab/group/order helpers + priority fix

**Files:**
- Create: `src/lib/issue-filters.ts`
- Modify: `src/components/filter-dropdown.tsx` (priority labels), `src/components/kanban-board.tsx` (use `applyFilters` + `STATE_TYPE_ORDER`)

- [ ] **Step 1: Create `src/lib/issue-filters.ts`** with the full pure logic:

```ts
import type { LinearIssue } from '@/app/api/linear/issues/route'
import type { FilterState } from '@/components/filter-dropdown'

export type IssueLayout = 'list' | 'board'
export type IssueTab = 'all' | 'active' | 'backlog'
export type IssueGrouping = 'status' | 'assignee' | 'priority' | 'none'
export type IssueOrdering = 'priority' | 'created' | 'updated' | 'title'
export type DisplayProperty =
  | 'status' | 'priority' | 'assignee' | 'labels' | 'estimate' | 'created'

export interface DisplayOptions {
  layout: IssueLayout
  grouping: IssueGrouping
  ordering: IssueOrdering
  properties: Record<DisplayProperty, boolean>
}

// Visibility flags coming from the PublicView's show_* config.
export interface ViewFlags {
  showAssignees: boolean
  showPriorities: boolean
  showLabels: boolean
  showDescriptions: boolean
}

// Workflow ordering for status groups / columns (Linear's order).
export const STATE_TYPE_ORDER: Record<string, number> = {
  backlog: 0,
  unstarted: 1,
  started: 2,
  completed: 3,
  canceled: 4,
}

// Linear's real priority schema: 0 None, 1 Urgent, 2 High, 3 Medium, 4 Low.
// Sort rank puts Urgent first and No-priority last.
export const PRIORITY_RANK: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 }

export function priorityLabel(priority: number): string {
  switch (priority) {
    case 1: return 'Urgent'
    case 2: return 'High'
    case 3: return 'Medium'
    case 4: return 'Low'
    default: return 'No priority'
  }
}

export function applyTab(issues: LinearIssue[], tab: IssueTab): LinearIssue[] {
  if (tab === 'active') {
    return issues.filter(i => i.state.type === 'started' || i.state.type === 'unstarted')
  }
  if (tab === 'backlog') {
    return issues.filter(i => i.state.type === 'backlog')
  }
  return issues
}

// Extracted verbatim from kanban-board.tsx's filter block, including the gates.
export function applyFilters(
  issues: LinearIssue[],
  filters: FilterState,
  flags: ViewFlags,
): LinearIssue[] {
  return issues.filter(issue => {
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const inText =
        issue.title.toLowerCase().includes(q) ||
        issue.identifier.toLowerCase().includes(q) ||
        (flags.showDescriptions && !!issue.description?.toLowerCase().includes(q))
      if (!inText) return false
    }
    if (filters.statuses.length > 0 && !filters.statuses.includes(issue.state.name)) return false
    if (flags.showAssignees && filters.assignees.length > 0) {
      if (!issue.assignee || !filters.assignees.includes(issue.assignee.id)) return false
    }
    if (flags.showPriorities && filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) return false
    if (flags.showLabels && filters.labels.length > 0) {
      if (!issue.labels.some(l => filters.labels.includes(l.id))) return false
    }
    // creators: no-op (no creator data), as before.
    return true
  })
}

export interface IssueGroup {
  key: string          // stable identity for collapse state + react key
  name: string         // header label
  issues: LinearIssue[]
  // For status groups only — drives the header icon:
  stateType?: string
  stateColor?: string
  priority?: number    // for priority groups — drives header PriorityIcon
  assignee?: { name: string; avatarUrl?: string }
}

export function orderIssues(issues: LinearIssue[], ordering: IssueOrdering): LinearIssue[] {
  const sorted = [...issues]
  switch (ordering) {
    case 'priority':
      sorted.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9))
      break
    case 'created':
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      break
    case 'updated':
      sorted.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      break
    case 'title':
      sorted.sort((a, b) => a.title.localeCompare(b.title))
      break
  }
  return sorted
}

export function groupIssues(
  issues: LinearIssue[],
  grouping: IssueGrouping,
  ordering: IssueOrdering,
): IssueGroup[] {
  if (grouping === 'none') {
    return [{ key: '__all__', name: '', issues: orderIssues(issues, ordering) }]
  }

  const map = new Map<string, IssueGroup>()
  for (const issue of issues) {
    let key: string
    let group: IssueGroup
    if (grouping === 'status') {
      key = issue.state.name
      group = map.get(key) ?? { key, name: issue.state.name, issues: [], stateType: issue.state.type, stateColor: issue.state.color }
    } else if (grouping === 'priority') {
      key = String(issue.priority)
      group = map.get(key) ?? { key, name: priorityLabel(issue.priority), issues: [], priority: issue.priority }
    } else { // assignee
      key = issue.assignee?.id ?? '__none__'
      group = map.get(key) ?? {
        key,
        name: issue.assignee?.name ?? 'No assignee',
        issues: [],
        assignee: issue.assignee ? { name: issue.assignee.name, avatarUrl: issue.assignee.avatarUrl } : undefined,
      }
    }
    group.issues.push(issue)
    map.set(key, group)
  }

  const groups = [...map.values()]
  groups.sort((a, b) => {
    if (grouping === 'status') {
      return (STATE_TYPE_ORDER[a.stateType ?? ''] ?? 99) - (STATE_TYPE_ORDER[b.stateType ?? ''] ?? 99)
    }
    if (grouping === 'priority') {
      return (PRIORITY_RANK[a.priority ?? 0] ?? 9) - (PRIORITY_RANK[b.priority ?? 0] ?? 9)
    }
    // assignee: alpha, with "No assignee" last
    if (a.key === '__none__') return 1
    if (b.key === '__none__') return -1
    return a.name.localeCompare(b.name)
  })
  for (const g of groups) g.issues = orderIssues(g.issues, ordering)
  return groups
}
```

- [ ] **Step 2: Fix priority labels in `filter-dropdown.tsx`** — in `generateFilterOptions` (around lines 594-602) the labels are wrong. Replace:

```ts
  const priorities = [
    { value: 0, label: 'No priority' },
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium' },
    { value: 3, label: 'High' },
    { value: 4, label: 'Urgent' },
  ].filter(priority =>
    issues.some(issue => issue.priority === priority.value)
  )
```
with:
```ts
  const priorities = [
    { value: 1, label: 'Urgent' },
    { value: 2, label: 'High' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Low' },
    { value: 0, label: 'No priority' },
  ].filter(priority =>
    issues.some(issue => issue.priority === priority.value)
  )
```
(Now matches `priority-icon.tsx`'s documented schema and Linear; also orders the filter submenu Urgent→None.)

- [ ] **Step 3: Refactor `kanban-board.tsx` to use the shared helpers** — replace the inline `filteredIssues` block (lines ~64-108) with:

```tsx
import { applyFilters, STATE_TYPE_ORDER } from '@/lib/issue-filters'

const filteredIssues = filters
  ? applyFilters(issues, filters, {
      showAssignees,
      showPriorities,
      showLabels,
      showDescriptions,
    })
  : issues
```
and replace the local `stateTypeOrder` map (lines ~125-131) usage with the imported `STATE_TYPE_ORDER` (delete the local const; update the two `stateTypeOrder[...]` references to `STATE_TYPE_ORDER[...]`).

- [ ] **Step 4: Type-check** — `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/issue-filters.ts src/components/filter-dropdown.tsx src/components/kanban-board.tsx
git commit -m "feat: shared issue filter/group/order helpers; fix priority labels"
```

---

## Task 3: `IssueListView` component

**Files:**
- Create: `src/components/issue-list-view.tsx`

Reuses: `StateIcon`, `PriorityIcon`, `EstimateIcon`, `UserAvatar`, `groupIssues`, and the `DisplayOptions`/`ViewFlags` types.

- [ ] **Step 1: Define props**

```tsx
'use client'

import { useState } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import type { LinearIssue } from '@/app/api/linear/issues/route'
import { StateIcon } from '@/components/state-icon'
import { PriorityIcon, EstimateIcon } from '@/components/priority-icon'
import { UserAvatar } from '@/components/user-avatar'
import { groupIssues, type DisplayOptions, type ViewFlags } from '@/lib/issue-filters'

interface IssueListViewProps {
  issues: LinearIssue[]          // already tab+filter reduced by IssuesView
  display: DisplayOptions
  flags: ViewFlags
  allowIssueCreation: boolean
  hasActiveFilters: boolean      // to pick the right empty-state message
  totalCount: number             // unreduced count, for empty-state logic
  onIssueClick: (id: string) => void
  onCreateIssue: (stateName?: string) => void
}
```

- [ ] **Step 2: Implement** the body. Key structure (build the JSX against the live Linear reference; classes use existing tokens):

  - Compute `const groups = groupIssues(issues, display.grouping, display.ordering)`.
  - Empty states (reuse kanban copy): if `issues.length === 0 && totalCount > 0` → "No issues match your filters"; if `totalCount === 0` → "No issues found". Same markup as `kanban-board.tsx:141-160`.
  - Collapse state: `const [collapsed, setCollapsed] = useState<Set<string>>(new Set())`; toggle by group key.
  - Container: `<div className="w-full">`. For each group render a header (unless `display.grouping === 'none'` → skip header) then its rows.
  - **Group header row** (`role="button"`, `onClick` toggles collapse):
    ```
    <div className="group/header flex items-center gap-2 h-9 px-3 bg-muted/30 border-b border-border/50 sticky top-0 z-10">
      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ease-out ${collapsed.has(g.key) ? '' : 'rotate-90'} motion-reduce:transition-none`} />
      {/* icon: status → <StateIcon type={g.stateType!} color={g.stateColor!}/>;
          priority → <PriorityIcon priority={g.priority!} priorityLabel={g.name}/>;
          assignee → <UserAvatar name={g.assignee?.name} avatarUrl={g.assignee?.avatarUrl}/> */}
      <span className="text-sm font-medium text-foreground tracking-tight">{g.name}</span>
      <span className="text-xs text-muted-foreground">{g.issues.length}</span>
      {allowIssueCreation && (
        <button onClick={(e)=>{e.stopPropagation(); onCreateIssue(display.grouping==='status'?g.name:undefined)}}
          className="ml-auto opacity-0 group-hover/header:opacity-100 p-1 rounded hover:bg-accent transition-opacity"
          aria-label="New issue"><Plus className="h-3.5 w-3.5 text-muted-foreground"/></button>
      )}
    </div>
    ```
    For `grouping==='none'`, render no header (so `ml-auto` create button is absent — that path relies on the toolbar New issue button).
  - **Issue row** (when group not collapsed), one per issue, full-width button:
    ```
    <button onClick={()=>onIssueClick(issue.id)}
      className="flex items-center gap-2 w-full h-9 px-3 text-left border-b border-border/40 hover:bg-accent/50 transition-colors">
      {display.properties.priority && flags.showPriorities && (
        <span className="flex-shrink-0"><PriorityIcon priority={issue.priority} priorityLabel={issue.priorityLabel}/></span>
      )}
      <span className="flex-shrink-0 w-[52px] text-xs font-mono text-muted-foreground/80 tracking-wider">{issue.identifier}</span>
      {display.properties.status && (<span className="flex-shrink-0"><StateIcon type={issue.state.type} color={issue.state.color}/></span>)}
      <span className="flex-1 min-w-0 truncate text-sm text-foreground">{issue.title}</span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {display.properties.labels && flags.showLabels && issue.labels.map(l => (
          <span key={l.id} className="hidden sm:flex items-center gap-1 h-[22px] px-1.5 rounded border border-border bg-accent/40 text-xs text-muted-foreground max-w-[140px]">
            <span className="w-2 h-2 rounded-full" style={{backgroundColor:l.color}}/>
            <span className="truncate">{l.name}</span>
          </span>
        ))}
        {display.properties.estimate && flags.showPriorities && issue.estimate!=null && issue.estimate>0 && (
          <span className="hidden sm:flex items-center gap-1 h-[22px] px-1.5 rounded border border-border bg-accent/40 text-xs text-muted-foreground">
            <EstimateIcon/><span>{issue.estimate}</span>
          </span>
        )}
        {display.properties.assignee && flags.showAssignees && (
          issue.assignee
            ? <UserAvatar name={issue.assignee.name} avatarUrl={issue.assignee.avatarUrl}/>
            : <span className="w-5 h-5 rounded-full border border-dashed border-border/70"/>
        )}
        {display.properties.created && (
          <span className="hidden sm:block w-[52px] text-right text-xs text-muted-foreground">{formatDate(issue.createdAt)}</span>
        )}
      </div>
    </button>
    ```
  - `formatDate(iso)` helper (module scope): `new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'})` → e.g. "Jun 16" — month-first to match Linear's list rows exactly (parity over locale here, since it's a cloned UI element, not prose).

- [ ] **Step 3: Type-check** — `npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/issue-list-view.tsx
git commit -m "feat: Linear-style grouped issue list view"
```

---

## Task 4: `DisplayPopover` component

**Files:**
- Create: `src/components/display-popover.tsx`

- [ ] **Step 1: Props + structure**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import type { DisplayOptions, DisplayProperty, IssueGrouping, IssueLayout, IssueOrdering } from '@/lib/issue-filters'

interface DisplayPopoverProps {
  isOpen: boolean
  onClose: () => void
  value: DisplayOptions
  onChange: (next: DisplayOptions) => void
  availableProperties: DisplayProperty[]   // omits any gated off by show_* flags
  triggerRef: React.RefObject<HTMLButtonElement | null>
}
```

- [ ] **Step 2: Implement.** Outside-click + Escape close (copy the pattern from `filter-dropdown.tsx:82-109`). Absolute popover anchored under the trigger (`top:'100%'`, right-aligned: `right:0`), `min-w-[240px]`, `rounded-md border bg-background shadow-md`, open animation `transition` transform from the top-right (`origin-top-right`), `200ms ease-out`, `motion-reduce:transition-none`. Sections, top to bottom:
  - **Layout** — segmented `List | Board`: two buttons; active one `bg-accent text-foreground`, other `text-muted-foreground`; sets `layout`.
  - **Grouping** — a labelled `<select>` (native, styled like `ui/select` or a simple styled select) with options Status/Assignee/Priority/No grouping → sets `grouping` (`'none'` for "No grouping").
  - **Ordering** — `<select>` Priority/Created/Updated/Title → sets `ordering`.
  - **Display properties** — for each `p` in `availableProperties`, a toggle chip: `onClick` flips `properties[p]`; active chip `bg-primary/10 text-primary border-primary/30`, inactive `border-border text-muted-foreground`. Labels: Status, Priority, Assignee, Labels, Estimate, Created.
  - Each change calls `onChange({ ...value, ...patch })`.

- [ ] **Step 3: Type-check** — `npx tsc --noEmit` → clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/display-popover.tsx
git commit -m "feat: display options popover (layout/grouping/ordering/properties)"
```

---

## Task 5: `IssuesView` wrapper

**Files:**
- Create: `src/components/issues-view.tsx`

Owns all presentation state and the toolbar; renders list or board. Moves `getVisibleFilterOptions` here.

- [ ] **Step 1: Props + defaults + persistence**

```tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { LinearIssue } from '@/app/api/linear/issues/route'
import type { PublicView } from '@/lib/supabase'
import { KanbanBoard } from '@/components/kanban-board'
import { IssueListView } from '@/components/issue-list-view'
import { DisplayPopover } from '@/components/display-popover'
import {
  FilterDropdown, generateFilterOptions,
  type FilterState, type FilterOptions,
} from '@/components/filter-dropdown'
import {
  applyFilters, applyTab,
  type DisplayOptions, type DisplayProperty, type IssueTab, type ViewFlags,
} from '@/lib/issue-filters'

interface IssuesViewProps {
  issues: LinearIssue[]
  view: PublicView
  onIssueClick: (id: string) => void
  onCreateIssue: (stateName?: string) => void
}

const ALL_PROPERTIES: DisplayProperty[] = ['status','priority','assignee','labels','estimate','created']

const DEFAULT_DISPLAY: DisplayOptions = {
  layout: 'list',
  grouping: 'status',
  ordering: 'priority',
  properties: { status:true, priority:true, assignee:true, labels:true, estimate:true, created:true },
}

function loadDisplay(slug: string): DisplayOptions {
  try {
    const raw = localStorage.getItem(`linear-view-display:${slug}`)
    if (!raw) return DEFAULT_DISPLAY
    const parsed = JSON.parse(raw)
    return {
      layout: parsed.layout === 'board' ? 'board' : 'list',
      grouping: ['status','assignee','priority','none'].includes(parsed.grouping) ? parsed.grouping : 'status',
      ordering: ['priority','created','updated','title'].includes(parsed.ordering) ? parsed.ordering : 'priority',
      properties: { ...DEFAULT_DISPLAY.properties, ...(parsed.properties ?? {}) },
    }
  } catch { return DEFAULT_DISPLAY }
}
```

- [ ] **Step 2: Move `getVisibleFilterOptions` into this file** (verbatim from `page.tsx:21-31`), and implement state + derived data:

```tsx
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
  const [filters, setFilters] = useState<FilterState>({ search:'', statuses:[], assignees:[], priorities:[], labels:[], creators:[] })
  const [display, setDisplay] = useState<DisplayOptions>(DEFAULT_DISPLAY)
  const [showFilter, setShowFilter] = useState(false)
  const [showDisplay, setShowDisplay] = useState(false)
  const filterBtn = useRef<HTMLButtonElement>(null)
  const displayBtn = useRef<HTMLButtonElement>(null)

  // localStorage read after mount (avoids hydration mismatch); persist on change.
  useEffect(() => { setDisplay(loadDisplay(view.slug)) }, [view.slug])
  useEffect(() => { try { localStorage.setItem(`linear-view-display:${view.slug}`, JSON.stringify(display)) } catch {} }, [display, view.slug])

  const flags: ViewFlags = {
    showAssignees: view.show_assignees !== false,
    showPriorities: view.show_priorities !== false,
    showLabels: view.show_labels !== false,
    showDescriptions: view.show_descriptions !== false,
  }

  const filterOptions = useMemo(() => getVisibleFilterOptions(issues, view), [issues, view])
  // tabIssues: tab applied but NOT filters. The list gets fully-reduced issues;
  // the board gets tabIssues + the filters prop and filters itself once, so it
  // keeps its own correct "No issues match your filters" empty state (and never
  // double-filters).
  const tabIssues = useMemo(() => applyTab(issues, tab), [issues, tab])
  const reduced = useMemo(() => applyFilters(tabIssues, filters, flags),
    [tabIssues, filters, flags.showAssignees, flags.showPriorities, flags.showLabels, flags.showDescriptions])

  const hasActiveFilters = !!filters.search || filters.statuses.length>0 || filters.assignees.length>0 || filters.priorities.length>0 || filters.labels.length>0 || filters.creators.length>0
  const availableProperties = ALL_PROPERTIES.filter(p =>
    (p!=='assignee' || flags.showAssignees) && ((p!=='priority' && p!=='estimate') || flags.showPriorities) && (p!=='labels' || flags.showLabels))
  // ...render below
}
```

- [ ] **Step 3: Render the toolbar + content.** Toolbar (replaces the page's old filter bar markup, ported into this component):
  - **Tabs** (left): three buttons `All issues / Active / Backlog`, active one `bg-accent text-foreground border border-border/50`, others muted; set `tab`.
  - **Filter** button + `<FilterDropdown isOpen={showFilter} ... triggerRef={filterBtn} filters={filters} onFiltersChange={setFilters} filterOptions={filterOptions} />` (reuse exactly as the page does today, including the active dot and the active-filter indicator pills ported from `page.tsx:438-467`).
  - **Right side**: a **Display** button (`ref={displayBtn}`, toggles `showDisplay`) rendering `<DisplayPopover isOpen={showDisplay} onClose={()=>setShowDisplay(false)} value={display} onChange={setDisplay} availableProperties={availableProperties} triggerRef={displayBtn} />`; and the **New issue** button (when `view.allow_issue_creation`) calling `onCreateIssue()` — shown in **both** layouts.
  - **Content**: when `display.layout === 'list'` render `<IssueListView issues={reduced} display={display} flags={flags} allowIssueCreation={!!view.allow_issue_creation} hasActiveFilters={hasActiveFilters} totalCount={issues.length} onIssueClick={onIssueClick} onCreateIssue={onCreateIssue} />`; else render the board with the **tab-reduced** issues and the `filters` prop so it filters itself once and keeps its own empty-state messages: `<KanbanBoard issues={tabIssues} filters={filters} showAssignees={view.show_assignees} showLabels={view.show_labels} showPriorities={view.show_priorities} showDescriptions={view.show_descriptions} onIssueClick={onIssueClick} className="w-full" />`. (List path is fully reduced + `totalCount`; board path is tab-reduced + `filters`. Neither double-filters.)

- [ ] **Step 4: Type-check** — `npx tsc --noEmit` → clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/issues-view.tsx
git commit -m "feat: IssuesView wrapper with tabs, filters, display toggle"
```

---

## Task 6: Wire `IssuesView` into the page

**Files:**
- Modify: `src/app/view/[slug]/page.tsx`

- [ ] **Step 1: Remove now-unused filter state + helpers.** Delete ONLY these: `getVisibleFilterOptions` (moved to IssuesView); the `filters`, `filterOptions`, `showFilterDropdown`, `filterButtonRef` state; the `hasActiveFilters` fn; and the `setFilterOptions(...)` lines inside `loadView`/`handleRefresh`. **Keep everything else in those functions — in particular `lastUpdated`/`setLastUpdated` and the header "Updated …" timestamp (line ~371) stay.** Remove imports of `FilterDropdown/FilterState/FilterOptions/generateFilterOptions` and `KanbanBoard`. Add `import { IssuesView } from '@/components/issues-view'`. After editing, grep the file for `filters`, `filterOptions`, `hasActiveFilters`, `FilterDropdown`, `KanbanBoard` to confirm no dangling references remain.

- [ ] **Step 2: Replace the filter bar + content.** Delete the entire `{/* Filters bar - Linear style */}` block (the `<div className="flex items-center justify-between px-4 sm:px-6 py-2 border-t ...">` … through its close) **and** the `{/* Linear-style Kanban Board */}` block, replacing the content area body with:

```tsx
) : (
  <div className="linear-fade-in">
    <IssuesView
      issues={issues}
      view={view}
      onIssueClick={handleIssueClick}
      onCreateIssue={handleCreateIssue}
    />
  </div>
)
```
Keep the surrounding `<header>` brand row (logo/updates/refresh/insights), the `error` branch, the footer, and all modals exactly as they are. The "New issue" affordance now lives inside `IssuesView`, so the old header New-issue button (if any remained outside the filter bar) is removed; `handleCreateIssue` is passed through.

- [ ] **Step 3: Type-check + lint** — `npx tsc --noEmit` and `npm run lint` → clean (fix any unused-import warnings the removal surfaced).

- [ ] **Step 4: Commit**

```bash
git add src/app/view/[slug]/page.tsx
git commit -m "feat: default public views to the Linear list view"
```

---

## Task 7: Verification (type-check, lint, browser parity)

**Files:** none (verification only)

- [ ] **Step 1:** `npx tsc --noEmit` → no errors.
- [ ] **Step 2:** `npm run lint` → no new errors.
- [ ] **Step 3: Browser parity.** `npm run dev`, open a public view (`/view/<slug>`). Verify against `https://linear.app/digital-nachos/team/DEL/all`:
  - List view is the **default**; rows are grouped by status in workflow order, dense, with priority icon · id · status icon · title · labels · estimate · assignee · date.
  - **List/Board** toggle in the Display popover switches to the existing kanban and back; choice persists on reload (localStorage).
  - **Tabs** All/Active/Backlog reduce correctly (Active = started+unstarted, Backlog = backlog).
  - **Filters** (status/assignee/priority/label) reduce both list and board; priority filter labels read Urgent…No priority with matching icons.
  - **Grouping** (status/assignee/priority/none) and **Ordering** (priority/created/updated/title) behave; group collapse works.
  - **Display property** toggles show/hide columns; toggles for fields the view hides (`show_*` false) are absent.
  - **New issue** (if `allow_issue_creation`) opens the modal from the toolbar in both layouts and from a group-header `+` in the list.
  - Dark/light theme + branding still apply; footer/modals unchanged.
- [ ] **Step 4: Final commit** (if any parity fixups were needed) and update task list.

---

## Self-review notes
- **Spec coverage:** list view default + List/Board toggle (T5/T6), tabs (T2/T5), four filters reused (T2/T5), Display popover with grouping/ordering/properties (T4/T5), shared StateIcon (T1), shared filter helper preventing drift (T2), priority-label fix (T2), localStorage persistence (T5), graceful omission of project/cycle/due-date (T3 — those columns simply absent). All covered.
- **No backend changes:** confirmed — only `src/components/*`, `src/lib/issue-filters.ts`, and `src/app/view/[slug]/page.tsx` are touched.
- **Type consistency:** `DisplayOptions`/`ViewFlags`/`IssueTab`/`DisplayProperty` defined once in `issue-filters.ts` and imported everywhere; `applyFilters(issues, filters, flags)` signature identical across kanban + IssuesView.
