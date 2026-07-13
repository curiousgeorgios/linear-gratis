# Fullscreen Linear-style issue view

**Date:** 2026-07-13
**Status:** Approved design, pending implementation plan

## Problem

The public view currently shows an issue's detail in a narrow right-hand drawer
(`IssueDetailModal`, `max-w-2xl`, slides in over a dimmed issue list). This does
not match how Linear.app presents an issue. Two gaps:

1. **Layout.** Real Linear uses a full-page, two-column layout: a centred main
   column (title -> description -> activity) with a sticky right-hand properties
   sidebar (status, priority, assignee, labels, project). The drawer stacks
   everything vertically in a cramped column.
2. **Missing dates.** The drawer never shows the issue's created / updated dates,
   even though the API already returns them.

## Goals

- Replace the drawer with a dedicated full-page issue view that reads like
  Linear's issue page, adapted for a minimal read-only public UI.
- Surface the issue's Created and Updated dates, following Linear's own
  presentation (relative text with an absolute-timestamp tooltip).
- Reuse existing data fetching, the password gate, branding and the `show_*`
  display toggles without duplicating them.

## Non-goals

- No changes to the GraphQL query or API routes. `createdAt` and `updatedAt` are
  already fetched and returned by
  `src/app/api/public-view/[slug]/issue/[issueId]/route.ts`.
- No edit affordances (add label, add to project, subscribe, comment box). This
  is a read-only public view.
- No new date fields beyond Created / Updated (the query does not fetch
  `startedAt` / `completedAt`, and adding them is out of scope).

## Current architecture (relevant facts)

- Route is a single optional catch-all: `src/app/view/[slug]/[[...issuePath]]/page.tsx`.
  The list and the issue detail are served by the same client component.
- `issuePath[0]` is the issue identifier. `routeIssueId` state mirrors it and is
  kept in sync with the URL via `pushState` (list click), `replaceState` (close)
  and a `popstate` listener.
- `loadView()` runs once per slug and:
  - handles the password gate (`requiresPassword` -> password form),
  - handles loading / error / 404 states,
  - loads the `view` object (all `show_*` flags, `view_title`, branding hooks)
    and the full `issues` array, held in component state.
- The issue detail is fetched separately by the detail component from
  `/api/public-view/{slug}/issue/{issueId}` (already returns everything needed,
  respecting the view's flags server-side).
- Branding is applied via `applyBrandingToPage(branding, view?.view_title)`.

## Target design

### Interaction model

When `routeIssueId` is set, the page renders the full-page issue view **instead
of** the header + `IssuesView` + footer shell. `IssuesView` is not in the DOM
while an issue is open.

- List click -> `pushState` to `/view/{slug}/{id}` (browser back returns to list).
- In-view back control -> `handleCloseIssueDetail` (clears `routeIssueId`,
  `replaceState` to the list path).
- `popstate` continues to drive `routeIssueId`, so browser back/forward works.
- Pressing `Escape` on the issue view also triggers the back path (Linear
  behaviour). The modal's body-scroll-lock is intentionally dropped: a full page
  should scroll.
- The loaded `issues` array stays cached in state, so returning to the list is
  instant (no re-fetch). This is an intentional improvement over re-fetching.

**Branch placement.** The `routeIssueId` decision sits **after** the existing
loading / password-gate / `!view -> notFound()` guards in `page.tsx` (these all
`return` before the main render, so a cold deep-link reuses them). The page-level
`error` state is only reachable via a failed manual refresh (a cold load failure
leaves `view` null and hits `notFound()` first), so it does not pre-empt the
issue view; the issue view surfaces its own fetch errors instead.

**Scroll restoration.** Because `IssuesView` unmounts while an issue is open,
returning would otherwise remount the list at `scrollTop: 0` (a regression from
the drawer, which kept the list mounted). Mitigation: capture `window.scrollY`
into a ref when navigating into an issue, and restore it in an effect once the
list re-renders (`routeIssueId` back to null). Keep it minimal; no full history
stack needed.

**Two sequential spinners (accepted).** On a cold deep-link, `loadView` shows the
list-level "Loading public view..." spinner first; once `view` loads, the issue
view mounts and shows its own spinner while it fetches the issue. This is
acceptable and not optimised here.

### Layout (desktop, `lg` and up)

- **Slim top bar** (sticky): back breadcrumb showing `<-` + brand/view name,
  then the issue identifier and a status pill with the state icon. Branding logo
  preserved. List-only actions (refresh, insights, project updates) are omitted.
  - The back control is a real `<a href="/view/{slug}">` (with `aria-label` and
    an `onClick` that `preventDefault`s and calls `onBack` for SPA nav), so
    middle-click / cmd-click / "open in new tab" work like Linear's.
- The whole issue view is wrapped in its own
  `min-h-screen bg-background linear-gradient-bg` root (the list shell's wrapper
  is not rendered on this branch, so the background, gradient and full height
  must be re-created here). Branding **colours** still cascade because
  `applyBrandingToPage` sets the CSS variables on `document.documentElement`
  globally; only the background container needs re-creating.
- **Two-column body**, centred, `max-w-5xl`:
  - **Main column** (`flex-1`, `min-w-0`): title (`text-2xl`+ semibold) ->
    description via the shared markdown renderer -> activity/comments section.
    The activity/comments section keeps the current tabbed toggle: `activeTab`
    state defaulting to `showActivity ? 'activity' : 'comments'`, the same
    Activity / Comments buttons, and the same per-item rendering and filtering
    as the modal. It is rendered only when `show_activity` / `show_comments`
    are enabled (unchanged from today).
  - **Right sidebar** (`hidden lg:block`, sticky, ~260px): grouped property
    cards.

### Properties sidebar content

Rendered by a single `IssueProperties` component so desktop and mobile share one
implementation. Each row respects the existing toggles:

- **Status** — state icon + name (always).
- **Priority** — priority icon + label, gated by `show_priorities`.
- **Estimate** — estimate icon + points, gated by `show_priorities`, only when
  `estimate > 0`.
- **Assignee** — avatar + name, gated by `show_assignees`, only when present.
- **Labels** — colour dot + name per label, gated by `show_labels`.
- **Created / Updated** — always shown (see below).

Group headings ("Properties", "Labels", "Dates") mirror Linear's card grouping.

### Dates

A dates block at the bottom of the properties panel:

- `Created` row and `Updated` row.
- Inline text is relative (`5mo ago`). **This needs a new formatter**, not the
  existing `formatDate`: `formatDate` (`issue-detail-modal.tsx:287`) only returns
  relative strings under 7 days and falls back to an absolute date
  (`19 Feb 2026`) beyond that, so it cannot render `5mo ago`. Add a
  `formatRelativeDate` helper that continues the scale into weeks / months /
  years (`Xw ago`, `Xmo ago`, `Xy ago`) to match Linear's inline text. (The
  existing `formatDate` stays as-is for the activity/comment timestamps, which
  are usually recent.)
- `title` attribute holds the full absolute timestamp in Linear's format, e.g.
  `Thu Feb 19, 2026, 20:31:31`, produced by a new `formatAbsoluteDate` helper
  using `toLocaleString` with `weekday: 'short', month: 'short', day: 'numeric',
  year: 'numeric'` plus a 24-hour time.

### Responsive (below `lg`)

- The sidebar column is hidden; the same `IssueProperties` block is rendered
  inline in the main column directly under the title (`lg:hidden`), so status,
  assignee and dates are visible without scrolling past a long description.
- Body switches from two columns to a single column.
- Hiding uses Tailwind `hidden` / `lg:hidden` (`display: none`), which removes
  the off-breakpoint copy from the accessibility tree, so the duplicated block is
  not double-announced. The extra (hidden) DOM copy is an accepted, negligible
  cost; a single `IssueProperties` implementation is shared by both placements.

## Code changes

1. **Extract shared renderers.** Move `getStateIcon`, `remarkIssueReferences`,
   `IssueReferenceLink`, `LinearMarkdown`, `formatDate` and the markdown helper
   functions out of `issue-detail-modal.tsx` into a shared module
   (`src/components/issue-detail-shared.tsx`, `'use client'` — named "shared"
   rather than "content" since it holds state-icon + date + markdown helpers, not
   a content component). Add `formatRelativeDate` and `formatAbsoluteDate` there.
   Move the interdependent helpers together (`IssueReferenceLink` calls
   `getStateIcon`; `LinearMarkdown` uses both) and import the
   `ReferencedIssue` / `IssueDetail` types from the route. Since the modal is
   being deleted, the new view becomes the sole importer.

2. **New `src/components/issue-detail-view.tsx`** (`'use client'`): the full-page
   layout. Props mirror the current modal's data props plus `view`/branding bits
   needed for the top bar and an `onBack` callback:
   - `issueId`, `viewSlug`, the six `show_*` flags,
   - `brandName` / `logoUrl` (for the top bar), `backLabel` (view title),
     `backHref` (`/view/{slug}`), `onBack`.
   - Renders its own `min-h-screen bg-background linear-gradient-bg` root.
   - Binds `Escape -> onBack` (mirrors the modal's Escape handler) but does NOT
     lock body scroll.
   - Fetches the issue from `/api/public-view/{slug}/issue/{issueId}` (same call
     the modal makes today), with the same loading / error handling, and sets
     `document.title` from the loaded issue.
   - Contains the `IssueProperties` sub-component (co-located; small enough).

3. **`page.tsx`:** when `routeIssueId` is set (after the `!view` guard), return
   `<IssueDetailView .../>` instead of the list shell. Pass
   `onBack={handleCloseIssueDetail}` and the branding/view fields. Remove the
   `IssueDetailModal` import and its JSX block. Keep `IssueCreationModal` and
   `ProjectUpdatesModal` as list-only (not rendered on the issue view). Prune the
   state that only existed for the modal: `showIssueDetail`, `selectedIssueId`
   and the mirroring effect (`page.tsx:98-101`). The render branch and
   `handleIssueClick` / `handleCloseIssueDetail` should key off `routeIssueId`
   alone.

4. **Document title.** When the issue view has loaded its issue, set
   `document.title` to the issue (e.g. `{identifier} {title}` optionally suffixed
   with the brand), so the tab and shared deep-link title reflect the issue like
   Linear, instead of staying the view title that `applyBrandingToPage` set.
   Restore/leave the view title when returning to the list. (No server
   `generateMetadata` is added; this route is a client component and OG/meta for
   deep links stays as the generic view for now.)

5. **Delete `src/components/issue-detail-modal.tsx`** once its helpers have moved
   (only `page.tsx` imports it — confirmed by grep).

## Edge cases

- **Cold deep-link to an issue in a password-protected view.** `loadView` runs
  first and shows the password form; only after auth does `view` load and the
  issue view render. No change needed.
- **Issue fetch fails / 404 from the detail endpoint.** The view shows the same
  inline error block the modal used; the back breadcrumb still returns to the
  list.
- **Toggles all off.** With activity/comments disabled and priorities/assignee/
  labels hidden, the sidebar still shows Status + Created/Updated, so it is never
  empty.
- **Missing avatar / actor.** Reuse `UserAvatar` initials fallback and the
  existing activity-item filtering (items without a user are dropped).

## Testing / verification

- Deep-link directly to an issue URL: full-page view renders, list not in DOM.
- Click an issue from the list: URL pushes, full-page view renders; browser back
  returns to the list instantly.
- Back control returns to the list and restores the list URL; it is a real link
  (cmd/middle-click opens the list in a new tab).
- `Escape` on the issue view returns to the list.
- List scroll position is restored after returning from an issue.
- `document.title` reflects the open issue, then reverts on return to the list.
- Dates show relative text (`Xmo ago` / `Xy ago`) with an absolute tooltip
  (`Thu Feb 19, 2026, 20:31:31`) on hover.
- Each `show_*` toggle hides its property row / section; sidebar never empty
  (Status + dates always present).
- Narrow viewport: properties appear under the title, single column.
- Both light and dark themes render correctly (semantic tokens only).
- Compare side by side against `linear.app` issue PER-18 and the current
  `linear.gratis` DEL-423 to confirm fidelity.
