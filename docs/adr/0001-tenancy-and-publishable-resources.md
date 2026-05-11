# ADR 0001: Tenancy boundary, Linear connections, public URL namespace

Date: 2026-05-11
Status: Accepted

## Context

Migration 015 introduced `organisations` and `organisation_members` as the access-control boundary for the five resource tables (`public_views`, `customer_request_forms`, `branding_settings`, `custom_domains`, `roadmaps`). The org rollout was a partial retrofit. Several questions about what an "organisation" actually means in this product remained undecided after 015 shipped, and downstream invariants depend on the answers.

The product is a Linear integration. Customers connect a Linear workspace, then publish data from that Linear workspace to the public web as forms, roadmaps and public views, optionally branded and routed via custom domains.

Three questions needed deciding before the next round of model work:

1. What is the relationship between an organisation and a Linear workspace?
2. Should the public URL namespace (`/view/<slug>`, `/form/<slug>`, `/roadmap/<slug>`) permit cross-type slug collisions?
3. Should `handle_new_user` continue to auto-create a personal organisation on signup?

Two further questions surfaced during review and are documented here for completeness:

4. Should external-system identifiers (Linear project IDs, Linear issue IDs) be namespaced in column names now, or wait for a second integration?
5. What is the Phase 2 shape of `org_role`?

## Decision

### 1. Organisation has N Linear workspaces

An organisation may connect zero or more Linear workspaces. Connections are first-class: `organisation_linear_connections (id, organisation_id, linear_workspace_id, ...)`, with `UNIQUE (organisation_id, linear_workspace_id)`.

Every resource that consumes Linear data (`roadmaps`, `customer_request_forms`, `public_views`) carries a `linear_connection_id` that disambiguates which Linear workspace its IDs come from. The schema enforces same-org consistency via a composite foreign key: `(organisation_id, linear_connection_id)` references `organisation_linear_connections(organisation_id, id)`. This makes it impossible to write a resource that points at another org's Linear workspace.

Rejected alternatives:

- *Org = Linear workspace 1:1.* Simpler but inadequate for agency customers who manage multiple client Linear workspaces under one Linear-Gratis tenant. Agency demand is real.
- *Org has at most one Linear workspace, but a Linear workspace can belong to multiple orgs.* Awkward middle ground that doesn't solve the agency case and complicates token storage.

### 2. Forbid cross-type slug collisions in the public URL namespace

Today `/view/foo`, `/form/foo` and `/roadmap/foo` can all coexist. This is a phishing-adjacent UX hazard and ambiguates custom-domain routing where `target_type` is a discriminator but `slug` is not.

The public URL namespace is single: every slug is unique across all publishable resource types. Enforced at the schema level via a single `UNIQUE` on `public_resources.slug` (see Fix F), not at the application layer.

### 3. Keep `handle_new_user` auto-org for solo signups; make conditional for invited users

Most signups today are solo users connecting their personal Linear workspace. Auto-creating a personal org on signup is appropriate for that path.

Once invitations exist (the user signs up because they were invited to an existing org), the trigger must skip the auto-org for invited users. This is a conditional update to `handle_new_user`, not a removal of the auto-org behaviour.

Until invitations ship, the current behaviour stays.

### 4. Namespace external-system identifiers now

Columns currently named `project_id`, `project_name`, `project_ids`, `issue_id` are renamed to `linear_project_id`, `linear_project_name`, `linear_project_ids`, `linear_issue_id`. The cost is small now, large later. Doing it before E (organisation_linear_connections) also makes the relationship between an external ID and a connection legible.

### 5. Defer Phase 2 role model

`org_role` remains `('owner', 'member')`. No concrete user request yet for `admin`, `viewer` or per-resource permissions. Revisit when one of these is requested.

## Consequences

### Positive

- The tenancy boundary has a single, defensible answer: the organisation, with the Linear connection lifted up to live inside it.
- Agency customers can be supported without a second tenant concept.
- Public URL namespace conflicts become a schema-level impossibility, not a documentation requirement.
- External-system vocabulary stops leaking into core entity names.

### Negative

- Adding `linear_connection_id` to three resource tables is a schema change with a composite-FK invariant that future writers must respect. The composite FK is non-obvious to readers; it must be documented at the table level.
- The `public_resources` promotion (Fix F) is a substantial refactor of how the application reads slugs, passwords and expiry. Every public-facing route handler changes shape.
- Token migration from `profiles.linear_api_token` to `organisation_linear_connections` requires careful sequencing: existing solo orgs backfill their owner's token; multi-member orgs (none yet, but the shape supports them) need an explicit reconnect.

### Neutral

- `org_role` is stubbed at owner/member. Migrating to a roles table later costs one migration and a small RLS rewrite. Acceptable.

## Migration plan

This ADR motivates six fixes, executed in order:

| # | Fix | Migration |
|---|---|---|
| A | This ADR | (none) |
| B | Org-scope `roadmap_comments` and `roadmap_votes` | 019 |
| C | Namespace external Linear IDs | 020 |
| D | Rename `user_id` → `created_by`, FK to `profiles` | 021 |
| E | `organisation_linear_connections` (N per org) | 022 |
| F | Promote `public_resources` to real table; cross-type slug `UNIQUE` | 023 |

Each fix follows expand-migrate-contract. Contract phases (dropping `user_id`, dropping `profiles.linear_api_token`, dropping duplicated columns on resource tables) ship as separate migrations at least one release after the corresponding expand phase, with a committed contract date in the migration file header.

## References

- Migration 015: introduced organisations and memberships.
- Migration 017: hardened roadmap writes and added profile `WITH CHECK`.
- Domain modelling skill at `/Users/curiousgeorge/.claude/skills/domain-modelling`: the procedure used to derive this set of fixes.
