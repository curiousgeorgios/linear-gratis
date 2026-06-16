# Linear list view for public views

**Date:** 2026-06-16
**Status:** Approved (design)
**Branch:** `feat/linear-list-view`

## Summary

Public views (`/view/[slug]`) currently render only a kanban board. This change
makes a faithful clone of Linear's **"All issues" list view** the default
presentation, with a **List | Board** toggle that keeps the existing kanban
available as the "Board" option (matching Linear's own toggle).

The work is **frontend-only**: it reuses the `LinearIssue` data already fetched
by the public-view API and the existing four filters (status, assignee,
priority, labels). No GraphQL, database, or redaction changes. Row columns that
depend on un-fetched fields (project, cycle, due date, creator) are intentionally
omitted; this degrades gracefully because Linear rows already render only the
metadata an issue has.

Reference UI: `https://linear.app/digital-nachos/team/DEL/all`

## Goals

- List view is the **default** for public views; kanban remains available via a toggle.
- Visual + interaction parity with Linear's list view for the columns we have:
  grouped rows, dense layout, collapsible group headers, full-row hover, click to
  open the existing issue detail modal.
- `All issues / Active / Backlog` tabs (client-side `state.type` presets).
- A Display popover matching Linear: List|Board, grouping, ordering, and
  show/hide column (display-property) toggles.
- Reuse every existing primitive: `PriorityIcon`, `EstimateIcon`, `UserAvatar`,
  the status-icon SVG, `FilterDropdown`, and the existing modals.

## Non-goals

- No backend / GraphQL / DB / redaction changes.
- No project, cycle, due-date, creator, milestone, sub-issue-progress columns or
  filters (those need fields we don't fetch).
- No sub-grouping, no nested sub-issues, no manual drag ordering, no saved view
  presets, no "show empty groups" beyond what the data implies.

## Architecture (Approach B — encapsulated wrapper)

The public-view page delegates all issue presentation to a new `<IssuesView>`
wrapper. The page keeps only the brand header, branding, data loading, and the
shared modals.

```
view/[slug]/page.tsx
  ├─ <header> brand/logo/refresh/updates           (unchanged)
  ├─ <IssuesView                                    (NEW wrapper)
  │     issues={issues} view={view}
  │     onIssueClick={...} onCreateIssue={...} />
  │     ├─ toolbar: Tabs · Filter(+FilterDropdown) · Display(+DisplayPopover) · New issue
  │     ├─ <IssueListView ...>   when layout === 'list'   (NEW)
  │     └─ <KanbanBoard ...>     when layout === 'board'  (existing)
  ├─ footer                                         (unchanged)
  └─ modals: IssueCreation / IssueDetail / ProjectUpdates  (unchanged)
```

### Component & module inventory

| File | Status | Responsibility |
|------|--------|----------------|
| `src/lib/issue-filters.ts` | NEW | Pure helpers: `applyFilters`, `applyTab`, `groupIssues`, `orderIssues`. Shared by list + board so filtering never drifts. |
| `src/components/state-icon.tsx` | NEW | Extracted `StateIcon` (the status SVG duplicated in `kanban-board.tsx` and `filter-dropdown.tsx`). Both update to import it. |
| `src/components/issue-list-view.tsx` | NEW | The grouped, dense Linear list renderer. |
| `src/components/display-popover.tsx` | NEW | The Display popover (List/Board, grouping, ordering, property toggles). |
| `src/components/issues-view.tsx` | NEW | Wrapper owning filters/tab/layout/display state + the toolbar; renders list or board. |
| `src/components/kanban-board.tsx` | EDIT | Import shared `StateIcon` + `applyFilters` (remove local copies). Behaviour unchanged. |
| `src/components/filter-dropdown.tsx` | EDIT | Import shared `StateIcon` (remove local copy). **Fix the priority-label bug** (see Correctness below). |
| `src/app/view/[slug]/page.tsx` | EDIT | Replace filter bar + `<KanbanBoard>` with `<IssuesView>`; drop now-unused filter/filterOptions state. |

### `IssuesView` props (the only new public interface)

```ts
interface IssuesViewProps {
  issues: LinearIssue[]
  view: PublicView            // show_* flags, allow_issue_creation, slug
  onIssueClick: (issueId: string) => void
  onCreateIssue: (stateName?: string) => void
}
```

Everything else (filters, layout, tab, display, `filterOptions`) is internal
state. `filterOptions` is derived from `issues` + `view` via the existing
`getVisibleFilterOptions` helper, memoised. The helper currently lives in the
page; it moves into `issues-view.tsx` (or a small shared module) since the page
no longer needs it. It keeps gating `creators` behind `show_assignees`; the
`creators` field stays in `FilterState` (a no-op filter, as today) so the
existing "Clear all filters" flow is unaffected.

The page's existing **active-filter indicator pills** (currently rendered in the
filter bar) move into the `IssuesView` toolbar alongside the Filter button.

## State & types

```ts
type IssueLayout   = 'list' | 'board'
type IssueTab      = 'all' | 'active' | 'backlog'
type IssueGrouping = 'status' | 'assignee' | 'priority' | 'none'
type IssueOrdering = 'priority' | 'created' | 'updated' | 'title'
type DisplayProperty = 'status' | 'priority' | 'assignee' | 'labels' | 'estimate' | 'created'

interface DisplayOptions {
  layout: IssueLayout
  grouping: IssueGrouping
  ordering: IssueOrdering
  properties: Record<DisplayProperty, boolean>
}
```

**Defaults** (mirroring Linear): `layout:'list'`, `grouping:'status'`,
`ordering:'priority'`, all properties on. Persisted to
`localStorage['linear-view-display:'+slug]` so a viewer's choices stick per view;
parsed defensively (fall back to defaults on any malformed value), and gated so a
property is never effectively shown when the view's `show_*` flag is false.

## Behaviour details

### Tabs (`applyTab`)
- **All issues** — no state filter.
- **Active** — `state.type ∈ { 'started', 'unstarted' }`.
- **Backlog** — `state.type === 'backlog'`.

Verified against the live Linear UI on 2026-06-16: the Active tab shows the
Started-category states (In Review, With client, In Progress) **and** Todo
(`unstarted`); the Backlog tab shows only the `backlog` group. `completed` and
`canceled` issues appear only under "All issues". Tabs compose with (run before)
the filter dropdown and grouping.

### Filtering (`applyFilters`)
Identical semantics to today's kanban filter block, extracted verbatim into
`applyFilters(issues, filters, flags)` where
`flags = { showAssignees, showPriorities, showLabels, showDescriptions }`:
search (title/identifier, plus description **only when `showDescriptions`** —
preserving the existing gate at `kanban-board.tsx:71`), statuses, assignees
(gated by `showAssignees`), priorities (gated by `showPriorities`), labels
(gated by `showLabels`). Creator stays a no-op (no data), as today. The board
and list both call this helper with the view's flags, so behaviour can't drift.
`description` is otherwise not rendered as a list column (per non-goals); it is
only consulted by search.

### Grouping (`groupIssues`)
- `status` — group by `state.name`; order groups by workflow type
  (backlog→unstarted→started→completed→canceled). The `stateTypeOrder` map is
  **exported from `issue-filters.ts`** and imported by both the kanban (which
  currently defines it locally) and the list. Group header icon =
  `StateIcon(type,color)`.
- `assignee` — group by assignee (`No assignee` bucket last). Header icon = `UserAvatar`.
- `priority` — group by priority; order urgent→high→med→low→none (see schema
  below). Bucket label = `issue.priorityLabel` (server-provided, authoritative).
  Header icon = `PriorityIcon`.
- `none` — single flat list, no group header.

### Priority schema (Correctness — resolves a pre-existing bug)
`priority-icon.tsx` documents Linear's real schema:
**0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low**.
`generateFilterOptions` in `filter-dropdown.tsx:594-599` mislabels these
(`1='Low' … 4='Urgent'`), so today the filter shows the Urgent icon next to the
text "Low". This change **corrects those labels** to match the schema (and
Linear). All new code uses the authoritative schema: for display prefer the
per-issue `issue.priorityLabel`; for static labels use the corrected mapping.

### Ordering (`orderIssues`, within each group)
- `priority` — Urgent → Low → No priority. Implement as: sort ascending by
  `issue.priority`, but treat `0` (No priority) as last. With the schema above
  this yields `1,2,3,4,0` = Urgent, High, Medium, Low, No priority.
- `created` — `createdAt` desc.
- `updated` — `updatedAt` desc.
- `title` — locale alpha asc.

### Row layout (Linear order, left → right)
Left cluster: `PriorityIcon` · `identifier` (mono, muted) · `StateIcon` · title (truncate, single line).
Right cluster (`justify-end`, gap-2): label chips · estimate chip · assignee avatar · created date (`MMM d`).
Each metadata item is gated by **both** its `DisplayProperty` toggle and the
view's `show_*` gate:
- leading `StateIcon` → `status` property (genuinely toggleable, matching Linear)
- `PriorityIcon` → `priority` property + `show_priorities`
- label chips → `labels` property + `show_labels`
- estimate chip → `estimate` property + `show_priorities` (estimate is redacted with priority)
- assignee avatar → `assignee` property + `show_assignees`
- created date → `created` property

Identifier and title are always shown. Full-row button; hover `bg-accent/50`;
row height ~36px; rows separated by `border-b border-border/40`.
Click → `onIssueClick(issue.id)`.

### Group header
Chevron (rotates on collapse) · group icon · name · count pill · trailing `+`
(visible on hover, only when `view.allow_issue_creation`; for **status** grouping
it calls `onCreateIssue(stateName)`, otherwise `onCreateIssue()` with no state).
Collapsed group keys held in a local `Set`. The group-header `+` is a list-only
affordance; the kanban has none. The always-visible toolbar **New issue** button
(rendered by `IssuesView` in both layouts when `allow_issue_creation`) calls
`onCreateIssue()` and is the create path for board mode. `KanbanBoard`'s props
are unchanged — it gains no `onCreateIssue`.

### Empty states
Reuse the kanban's two messages: "No issues match your filters" (filters active,
0 results) and "No issues found" (0 issues at all).

### Display popover
Anchored under the Display button, Linear-styled: **List | Board** segmented
control at top; **Grouping** and **Ordering** dropdowns; **Display properties**
as toggleable chips (a property whose `show_*` gate is off is hidden from the
panel entirely). Origin-aware open animation, closes on outside-click / Escape
(same pattern as `FilterDropdown`).

## Design / styling

- Match Linear.app and the existing design system (per repo CLAUDE.md). Use only
  existing CSS tokens (`--background/foreground/muted/accent/border/primary`,
  priority tokens) so branding overrides keep working.
- Dense list: compact row height, tabular alignment of trailing metadata, subtle
  row dividers, full-width hover. Sentence case throughout.
- Animations per the global guidelines: `ease`/200ms for hover colour changes;
  the chevron rotate and popover open use `200ms` `ease-out-quad`
  (`cubic-bezier(.25,.46,.45,.94)`), `transform`-only, guarded by
  `prefers-reduced-motion`. Popover `transform-origin` set from the trigger.

## Testing & verification

- Extract the pure helpers (`applyFilters/applyTab/groupIssues/orderIssues`) so
  they're unit-testable. If the repo has a test runner, add focused tests
  (grouping order, ordering, tab presets, filter gating) — TDD where practical.
  Confirm the runner during planning; otherwise rely on type-check + browser.
- `tsc --noEmit` (or the project's type-check script) and `eslint` clean.
- Browser parity: run the app, open a public view, and compare against Linear's
  all-issues view — verify List default, List/Board toggle, tabs, the four
  filters, grouping, ordering, column toggles, collapse, and click-to-open.
- Regression: Board view and all existing public-view behaviour unchanged.

## Risks & mitigations

- **Two `LinearIssue` types** exist (`app/api/linear/issues/route.ts` and
  `lib/linear`). The list view uses the same one the kanban already consumes —
  no new type surface.
- **`localStorage` on first render** (SSR/hydration): read inside `useEffect`
  after mount, seed with defaults, to avoid hydration mismatch. `IssuesView` is
  only mounted in the page's non-loading/non-error branch, so `view` (and hence
  `view.slug` for the storage key) is guaranteed non-null at mount.
- **Filter drift** between list and board: eliminated by the shared
  `applyFilters` helper used by both.
```
