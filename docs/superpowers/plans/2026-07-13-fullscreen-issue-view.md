# Fullscreen Linear-style issue view — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the right-hand drawer issue detail (`IssueDetailModal`) with a dedicated full-page, Linear-style two-column issue view (main column + right properties sidebar) that also surfaces the issue's Created/Updated dates.

**Architecture:** The route stays the single optional catch-all `src/app/view/[slug]/[[...issuePath]]/page.tsx`. When `routeIssueId` is set, the page renders a new `IssueDetailView` full-page component instead of the list shell; the list (`IssuesView`) leaves the DOM. Markdown/state-icon/date renderers move out of the modal into a shared module. No API/GraphQL changes — `createdAt`/`updatedAt` are already returned.

**Tech Stack:** Next.js (App Router, client components), React, Tailwind CSS v4 (semantic tokens in `globals.css`), `react-markdown` + `remark-gfm`, `lucide-react`.

## Global Constraints

- Australian/British spelling in all code comments and UI copy (`colour`, `behaviour`, `licence`).
- No em dashes in copy; no Oxford comma; sentence case for headings.
- UI must match Linear.app and the existing design system; use only semantic Tailwind tokens (`bg-card`, `bg-background`, `border-border`, `text-muted-foreground`, `bg-accent`, `text-primary`) so light and dark themes both work.
- No test runner exists in this repo (scripts are only `dev`/`build`/`lint`). Quality gates per task: `npm run lint` and `npx tsc --noEmit`; pure functions get a throwaway `node` assertion check; components are verified in the real app in the browser. Do not add a test framework.
- Animations: `ease-out`, 0.2–0.3s; respect `prefers-reduced-motion` for any transform.
- Commit only the files each task lists. The working tree already contains unrelated uncommitted changes (`package.json`, `package-lock.json`, `src/app/views/page.tsx`, `src/components/ui/{command,dialog,popover}.tsx`) — never stage them.

---

### Task 1: Shared render module + date helpers

Extract the modal's reusable renderers into a shared module and add the two new date formatters. The modal keeps working by importing from the new module, so the build stays green.

**Files:**
- Create: `src/components/issue-detail-shared.tsx`
- Modify: `src/components/issue-detail-modal.tsx` (replace the moved definitions with an import)

**Interfaces:**
- Produces (all exported from `issue-detail-shared.tsx`):
  - `getStateIcon(stateType: string, color: string): JSX.Element`
  - `LinearMarkdown(props: { children: string; references: Record<string, ReferencedIssue>; className?: string }): JSX.Element`
  - `formatDate(dateString: string): string` (existing relative-under-7-days / absolute-after formatter, moved verbatim)
  - `formatRelativeDate(dateString: string): string` (new)
  - `formatAbsoluteDate(dateString: string): string` (new)
- Consumes: `ReferencedIssue`, `IssueDetail` types from `@/app/api/public-view/[slug]/issue/[issueId]/route`.

- [ ] **Step 1: Create the shared module and move the renderers verbatim**

Create `src/components/issue-detail-shared.tsx` beginning with `'use client'`. Move these, unchanged, out of `issue-detail-modal.tsx` (current line ranges in parentheses) into it, and `export` each top-level one:
- the constants `ISSUE_IDENTIFIER_PATTERN`, `ISSUE_IDENTIFIER_GLOBAL_PATTERN`, `GENERATED_ISSUE_REFERENCE_PREFIX`, `SKIP_ISSUE_REFERENCE_NODE_TYPES` and the `MarkdownNode` type (24–35)
- `remarkIssueReferences` (37–85)
- `getStateIcon` (87–114) — `export`
- `getNodeText`, `findIssueIdentifier`, `isGeneratedIssueReferenceHref` (116–134)
- `IssueReferenceLink` (136–179)
- `LinearMarkdown` (181–285) — `export`
- `formatDate` (287–301) — `export`

Keep the imports these need at the top of the new file:
```tsx
'use client'

import { isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { IssueDetail, ReferencedIssue } from '@/app/api/public-view/[slug]/issue/[issueId]/route'
```
(`IssueDetail` is re-exported for convenience so consumers can import both types from one place.)

- [ ] **Step 2: Add the two new date helpers to the shared module**

Append to `src/components/issue-detail-shared.tsx`:
```tsx
// Relative label that continues past a week (Linear shows e.g. "5mo ago").
// The existing formatDate only goes up to days, so dates like "created" —
// almost always older than a week — need this wider scale.
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const min = Math.floor(diffMs / 60000)
  const hour = Math.floor(diffMs / 3600000)
  const day = Math.floor(diffMs / 86400000)

  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  if (hour < 24) return `${hour}h ago`
  if (day < 7) return `${day}d ago`
  if (day < 30) return `${Math.floor(day / 7)}w ago`
  if (day < 365) return `${Math.floor(day / 30)}mo ago`
  return `${Math.floor(day / 365)}y ago`
}

// Full timestamp for the hover tooltip, British day-month-year order,
// e.g. "Thu, 19 Feb 2026, 20:31:31".
export function formatAbsoluteDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}
```

- [ ] **Step 3: Sanity-check the date helpers (throwaway assertion script)**

Write `/tmp/date-check.mjs`:
```js
import assert from 'node:assert'
const min = 60000, hour = 3600000, day = 86400000
// Re-declare the pure logic to check the branch boundaries.
function formatRelativeDate(ms) {
  const diffMs = ms
  const m = Math.floor(diffMs / min), h = Math.floor(diffMs / hour), d = Math.floor(diffMs / day)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${Math.floor(d / 365)}y ago`
}
assert.equal(formatRelativeDate(30 * 1000), 'just now')
assert.equal(formatRelativeDate(5 * min), '5m ago')
assert.equal(formatRelativeDate(3 * hour), '3h ago')
assert.equal(formatRelativeDate(3 * day), '3d ago')
assert.equal(formatRelativeDate(14 * day), '2w ago')
assert.equal(formatRelativeDate(150 * day), '5mo ago')
assert.equal(formatRelativeDate(400 * day), '1y ago')
console.log('OK')
```
Run: `node /tmp/date-check.mjs`
Expected: prints `OK` (no assertion error). Then `rm /tmp/date-check.mjs`.

- [ ] **Step 4: Point the modal at the shared module**

In `src/components/issue-detail-modal.tsx`, delete the now-moved definitions and replace them with:
```tsx
import { getStateIcon, LinearMarkdown, formatDate } from '@/components/issue-detail-shared'
```
Remove the now-unused imports (`isValidElement`, `ReactMarkdown`, `remarkGfm`, and the `ReactNode` type if only the moved code used it — keep `useEffect`/`useState`; keep the `ReferencedIssue`/`IssueDetail` route import since the component body still references `IssueDetail`). Leave the rest of the modal unchanged.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no new errors/warnings for the two touched files.

- [ ] **Step 6: Commit**

```bash
git add src/components/issue-detail-shared.tsx src/components/issue-detail-modal.tsx
git commit -m "refactor: extract issue detail renderers into shared module, add date helpers"
```

---

### Task 2: `IssueDetailView` full-page component

The full-page, two-column view plus its `IssueProperties` sidebar/mobile block. Not yet wired into the page (that is Task 3), so nothing renders it yet — this task ends green on typecheck/lint.

**Files:**
- Create: `src/components/issue-detail-view.tsx`

**Interfaces:**
- Consumes: `getStateIcon`, `LinearMarkdown`, `formatDate`, `formatRelativeDate`, `formatAbsoluteDate` from `@/components/issue-detail-shared`; `PriorityIcon`, `EstimateIcon` from `@/components/priority-icon`; `UserAvatar` from `@/components/user-avatar`; `IssueDetail` type from the route.
- Produces:
  - `IssueDetailView(props: IssueDetailViewProps): JSX.Element`, where
    ```ts
    interface IssueDetailViewProps {
      issueId: string
      viewSlug: string
      backHref: string
      backLabel: string
      brandName?: string
      logoUrl?: string
      onBack: () => void
      showComments?: boolean
      showActivity?: boolean
      showDescriptions?: boolean
      showAssignees?: boolean
      showLabels?: boolean
      showPriorities?: boolean
    }
    ```

- [ ] **Step 1: Scaffold the component file, props, state and effects**

Create `src/components/issue-detail-view.tsx`:
```tsx
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import type { IssueDetail } from '@/app/api/public-view/[slug]/issue/[issueId]/route'
import {
  getStateIcon,
  LinearMarkdown,
  formatDate,
  formatRelativeDate,
  formatAbsoluteDate,
} from '@/components/issue-detail-shared'
import { PriorityIcon, EstimateIcon } from '@/components/priority-icon'
import { UserAvatar } from '@/components/user-avatar'

interface IssueDetailViewProps {
  issueId: string
  viewSlug: string
  backHref: string
  backLabel: string
  brandName?: string
  logoUrl?: string
  onBack: () => void
  showComments?: boolean
  showActivity?: boolean
  showDescriptions?: boolean
  showAssignees?: boolean
  showLabels?: boolean
  showPriorities?: boolean
}

export function IssueDetailView({
  issueId,
  viewSlug,
  backHref,
  backLabel,
  brandName,
  logoUrl,
  onBack,
  showComments = false,
  showActivity = false,
  showDescriptions = true,
  showAssignees = true,
  showLabels = true,
  showPriorities = true,
}: IssueDetailViewProps) {
  const [issue, setIssue] = useState<IssueDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>(showActivity ? 'activity' : 'comments')

  // Load the issue detail (same endpoint the old modal used).
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/public-view/${viewSlug}/issue/${issueId}`)
        const data = await response.json() as { success?: boolean; issue?: IssueDetail; error?: string }
        if (!response.ok || !data.success) throw new Error(data.error || 'Failed to load issue details')
        if (!cancelled) setIssue(data.issue || null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load issue details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [issueId, viewSlug])

  // Escape returns to the list (Linear behaviour). No body scroll lock: a full
  // page should scroll normally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onBack() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onBack])

  // Reflect the open issue in the tab title, restoring the list's title on exit.
  const previousTitle = useRef<string>('')
  useEffect(() => { previousTitle.current = document.title }, [])
  useEffect(() => {
    if (!issue) return
    const suffix = brandName ? ` - ${brandName}` : ''
    document.title = `${issue.identifier} ${issue.title}${suffix}`
  }, [issue, brandName])
  useEffect(() => () => { if (previousTitle.current) document.title = previousTitle.current }, [])

  return (
    <div className="min-h-screen bg-background linear-gradient-bg">
      {/* top bar, body — added in the next steps */}
    </div>
  )
}
```

- [ ] **Step 2: Add the sticky top bar**

Replace the placeholder `<div className="min-h-screen ...">` body with the top bar followed by a `{/* body */}` placeholder:
```tsx
    <div className="min-h-screen bg-background linear-gradient-bg">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 sm:px-6 py-3">
          <a
            href={backHref}
            onClick={(e) => { e.preventDefault(); onBack() }}
            aria-label={`Back to ${backLabel}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-0"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- user-provided URL, host not known at build time
              <img src={logoUrl} alt={brandName || 'Logo'} className="h-5 w-auto object-contain" />
            ) : (
              <span className="truncate">{backLabel}</span>
            )}
          </a>
          {issue && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-mono text-muted-foreground shrink-0">/</span>
              <span className="text-sm font-mono text-muted-foreground font-semibold shrink-0">{issue.identifier}</span>
              <span className="flex items-center gap-1.5 shrink-0">
                {getStateIcon(issue.state.type, issue.state.color)}
                <span className="text-sm text-muted-foreground">{issue.state.name}</span>
              </span>
            </div>
          )}
        </div>
      </header>

      {/* body */}
    </div>
```

- [ ] **Step 3: Add the loading / error / body layout**

Replace `{/* body */}` with the two-column body. Port the `activityItems` computation and the Activity/Comments tab panels **verbatim** from `issue-detail-modal.tsx` (the `activityItems` array at lines 368–401, and the tabbed section at lines 521–664) into the marked place — they are unchanged behaviour, using `issue`, `activeTab`, `setActiveTab`, `formatDate`, `LinearMarkdown`, `UserAvatar` and `showActivity`/`showComments` which all exist here.
```tsx
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-24">
            <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}

        {error && !loading && (
          <div className="max-w-md mx-auto mt-12 p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {issue && !loading && (
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
            {/* Main column */}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold tracking-tight mb-4">{issue.title}</h1>

              {/* Mobile-only properties block, under the title */}
              <div className="lg:hidden mb-6">
                <IssueProperties
                  issue={issue}
                  showAssignees={showAssignees}
                  showLabels={showLabels}
                  showPriorities={showPriorities}
                />
              </div>

              {showDescriptions && issue.description && (
                <div className="mb-8">
                  <LinearMarkdown references={issue.referencedIssues}>{issue.description}</LinearMarkdown>
                </div>
              )}

              {/* PORT: activityItems computation + Activity/Comments tabbed section
                  verbatim from issue-detail-modal.tsx (lines 368-401 and 521-664).
                  Wrap the tabbed section in <div className="border-t border-border pt-6"> as in the modal. */}
            </div>

            {/* Desktop sidebar */}
            <aside className="hidden lg:block w-[260px] shrink-0">
              <div className="sticky top-20">
                <IssueProperties
                  issue={issue}
                  showAssignees={showAssignees}
                  showLabels={showLabels}
                  showPriorities={showPriorities}
                />
              </div>
            </aside>
          </div>
        )}
      </main>
```

- [ ] **Step 4: Add the `IssueProperties` sub-component**

Append to the file (below `IssueDetailView`). Note the grouped Linear-style cards, and dates always render so the panel is never empty:
```tsx
function PropertyGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-3">
      <h3 className="text-xs font-medium text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-foreground min-w-0">{children}</span>
    </div>
  )
}

function IssueProperties({
  issue,
  showAssignees,
  showLabels,
  showPriorities,
}: {
  issue: IssueDetail
  showAssignees: boolean
  showLabels: boolean
  showPriorities: boolean
}) {
  return (
    <div className="space-y-3">
      <PropertyGroup title="Properties">
        <PropertyRow label="Status">
          {getStateIcon(issue.state.type, issue.state.color)}
          <span className="truncate">{issue.state.name}</span>
        </PropertyRow>
        {showPriorities && (
          <PropertyRow label="Priority">
            <PriorityIcon priority={issue.priority} priorityLabel={issue.priorityLabel} className="w-4 h-4" />
            <span className="truncate">{issue.priorityLabel}</span>
          </PropertyRow>
        )}
        {showPriorities && issue.estimate != null && issue.estimate > 0 && (
          <PropertyRow label="Estimate">
            <EstimateIcon className="w-4 h-4" />
            <span>{issue.estimate}</span>
          </PropertyRow>
        )}
        {showAssignees && issue.assignee && (
          <PropertyRow label="Assignee">
            <UserAvatar name={issue.assignee.name} avatarUrl={issue.assignee.avatarUrl} />
            <span className="truncate">{issue.assignee.name}</span>
          </PropertyRow>
        )}
      </PropertyGroup>

      {showLabels && issue.labels.length > 0 && (
        <PropertyGroup title="Labels">
          <div className="flex flex-wrap gap-1.5">
            {issue.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/50 px-2 py-0.5 text-xs text-foreground"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </span>
            ))}
          </div>
        </PropertyGroup>
      )}

      <PropertyGroup title="Dates">
        <PropertyRow label="Created">
          <span title={formatAbsoluteDate(issue.createdAt)}>{formatRelativeDate(issue.createdAt)}</span>
        </PropertyRow>
        <PropertyRow label="Updated">
          <span title={formatAbsoluteDate(issue.updatedAt)}>{formatRelativeDate(issue.updatedAt)}</span>
        </PropertyRow>
      </PropertyGroup>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors. If tsc complains that `IssueProperties`/`PropertyGroup` are used before defined, that is fine for hoisted function declarations; only fix real type errors.
Run: `npm run lint`
Expected: no new errors. Resolve any unused-import warnings.

- [ ] **Step 6: Commit**

```bash
git add src/components/issue-detail-view.tsx
git commit -m "feat: add fullscreen IssueDetailView with properties sidebar and dates"
```

---

### Task 3: Wire the view into the page, remove the modal

Branch the page to render `IssueDetailView`, delete the modal, prune the modal-only state, and add list scroll restoration.

**Files:**
- Modify: `src/app/view/[slug]/[[...issuePath]]/page.tsx`
- Delete: `src/components/issue-detail-modal.tsx`

**Interfaces:**
- Consumes: `IssueDetailView` from Task 2.

- [ ] **Step 1: Swap the import**

In `page.tsx`, replace:
```tsx
import { IssueDetailModal } from '@/components/issue-detail-modal'
```
with:
```tsx
import { IssueDetailView } from '@/components/issue-detail-view'
```

- [ ] **Step 2: Prune modal-only state and add a scroll ref**

Remove these two state declarations (lines ~70, ~72) and the mirroring effect (lines ~98–101):
```tsx
const [showIssueDetail, setShowIssueDetail] = useState(false)   // remove
const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)  // remove
useEffect(() => {                                    // remove whole effect
  setSelectedIssueId(routeIssueId)
  setShowIssueDetail(Boolean(routeIssueId))
}, [routeIssueId])
```
Add a scroll ref near the other `useState` calls:
```tsx
const listScrollY = useRef(0)
```
Add `useRef` to the React import at the top: `import { useState, useEffect, useRef } from 'react'`.

- [ ] **Step 3: Update the click/close handlers to drop the removed state and save/restore scroll**

Replace `handleIssueClick` and `handleCloseIssueDetail` with:
```tsx
const handleIssueClick = (issueId: string) => {
  if (slug && routeIssueId !== issueId) {
    listScrollY.current = window.scrollY
    setRouteIssueId(issueId)
    updateBrowserPath(getIssuePath(slug, issueId), 'push')
  }
}

const handleCloseIssueDetail = () => {
  if (slug) {
    setRouteIssueId(null)
    updateBrowserPath(getViewPath(slug), 'replace')
  }
}
```

- [ ] **Step 4: Restore list scroll when returning to the list**

Add this effect alongside the others (after the `popstate` effect):
```tsx
// When we return to the list (routeIssueId cleared) restore the scroll
// position captured when the issue was opened. The list unmounts while an
// issue is open, so without this it would remount at the top.
useEffect(() => {
  if (!routeIssueId && listScrollY.current) {
    window.scrollTo(0, listScrollY.current)
  }
}, [routeIssueId])
```

- [ ] **Step 5: Branch the render to the full-page issue view**

Immediately after the `if (!view) { notFound(); return null }` guard (currently ~line 353), add:
```tsx
if (routeIssueId) {
  return (
    <div style={getBrandingStyles(branding)}>
      <IssueDetailView
        issueId={routeIssueId}
        viewSlug={slug}
        backHref={`/view/${encodeURIComponent(slug)}`}
        backLabel={branding?.brand_name || view.view_title || view.project_name || view.team_name || 'Back'}
        brandName={branding?.brand_name || undefined}
        logoUrl={branding?.logo_url || undefined}
        onBack={handleCloseIssueDetail}
        showComments={view.show_comments}
        showActivity={view.show_activity}
        showDescriptions={view.show_descriptions}
        showAssignees={view.show_assignees}
        showLabels={view.show_labels}
        showPriorities={view.show_priorities}
      />
    </div>
  )
}
```
(`getBrandingStyles` is already imported in `page.tsx`. The wrapper carries the branding CSS-variable styles that the list shell applied via `style={getBrandingStyles(branding)}`; `IssueDetailView` supplies its own `min-h-screen bg-background linear-gradient-bg`.)

- [ ] **Step 6: Delete the modal JSX block from the list shell**

Remove the whole `{/* Issue Detail Modal */}` block (currently lines ~519–533):
```tsx
{selectedIssueId && (
  <IssueDetailModal ... />
)}
```

- [ ] **Step 7: Delete the modal file**

```bash
git rm src/components/issue-detail-modal.tsx
```

- [ ] **Step 8: Typecheck, lint, build**

Run: `npx tsc --noEmit`
Expected: no errors (in particular, no remaining references to `IssueDetailModal`, `showIssueDetail`, `selectedIssueId`).
Run: `npm run lint`
Expected: clean.
Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/app/view/[slug]/[[...issuePath]]/page.tsx
git commit -m "feat: render issues as fullscreen page view, remove issue detail drawer"
```

---

### Task 4: Browser verification and visual polish

No unit tests exist for UI, so verify against the running app and the real Linear reference. Fix any fidelity gaps found (spacing, sidebar width, card treatment) with small commits.

**Files:**
- Modify (only if fixes needed): `src/components/issue-detail-view.tsx`

- [ ] **Step 1: Run the app**

Run: `npm run dev`
Open a public view that has issues (e.g. the `usual-suspects` view) in the browser.

- [ ] **Step 2: Verify the interaction model**

- [ ] Click an issue in the list -> URL becomes `/view/{slug}/{ID}`, the list leaves the DOM, the full-page two-column view renders.
- [ ] Browser back -> returns to the list at the **same scroll position**.
- [ ] The back control (top-left) returns to the list; cmd/middle-click opens the list in a new tab.
- [ ] Press `Escape` on the issue view -> returns to the list.
- [ ] Deep-link directly to `/view/{slug}/{ID}` in a fresh tab -> loads straight into the full-page view.
- [ ] The browser tab title shows the issue identifier + title, and reverts to the view title on return.

- [ ] **Step 3: Verify content and dates**

- [ ] Title, description markdown, referenced-issue links and (if enabled) the Activity/Comments tabs all render as before.
- [ ] Properties sidebar shows Status, Priority, Estimate (when > 0), Assignee, Labels.
- [ ] Created and Updated rows show relative text (e.g. `5mo ago`); hovering shows the full timestamp tooltip.

- [ ] **Step 4: Verify toggles, responsive and theme**

- [ ] With a view that has priorities/assignees/labels/comments disabled, those rows/sections disappear and the sidebar still shows Status + dates.
- [ ] Narrow the window below `lg`: the layout becomes a single column and properties appear directly under the title.
- [ ] Toggle dark/light: all surfaces, borders and text use the theme correctly (no hard-coded colours).

- [ ] **Step 5: Side-by-side fidelity check**

Compare against `https://linear.app/digital-nachos/issue/PER-18`. Adjust sidebar width, card background (`bg-card/40`), gaps and typographic scale until the layout reads like Linear's issue page. Keep changes to `issue-detail-view.tsx`.

- [ ] **Step 6: Commit any fixes**

```bash
git add src/components/issue-detail-view.tsx
git commit -m "polish: match issue view spacing and treatment to Linear"
```

---

## Notes for the implementer

- The `activityItems` computation and the Activity/Comments JSX are ported unchanged from the old modal (Task 2, Step 3). If you cannot see the modal because Task 3 deleted it, retrieve it from git: `git show HEAD~2:src/components/issue-detail-modal.tsx` (adjust the ref to the commit before its deletion).
- Do not touch the pre-existing uncommitted changes in the working tree; stage only the files each task names.
