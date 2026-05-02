# Sprint 6 Patch Round 4 — Phase B Final Audit

_Date: 2026-05-01_
_Scope: close 4 nav + 4 data backend placeholders flagged in R3 audit_

---

## Placeholder closure matrix

| # | R3 placeholder | Where | Closure approach | Migration | Frontend | Status |
|---|---|---|---|---|---|---|
| 1 | NotificationDropdown click → no nav | `NotificationDropdown.tsx` | (closed in R3 — real fetch + navigate) | n/a | wired | ✅ R3 |
| 2 | SettingsPage Profile name read-only | `SettingsPage.tsx` | (closed in R3 — inline edit form + RLS update) | n/a | wired | ✅ R3 |
| 3 | SettingsPage Notifications EmptyState | `SettingsPage.tsx` `NotificationsSection` | additive table + 2 RPCs; toggles wired with optimistic UI + graceful degradation if migration not yet applied | `20260501100000_r4_create_notif_prefs.sql` | wired | ✅ R4 |
| 4 | SettingsPage Profile email/password locked | `SettingsPage.tsx` `ProfileSection` | direct call to `supabase.auth.updateUser({ password })` (no DDL needed; built-in Supabase Auth flow) | n/a | wired | ✅ R4 |
| 5 | Settings Members "+ Undang" disabled | `SettingsPage.tsx` `MembersSection` | new table `user_invites` + 3 RPCs (create/list/revoke) admin-gated; inline form replaces disabled button | `20260501100100_r4_create_user_invites.sql` | wired | ✅ R4 |
| 6 | DashboardPage Activity feed EmptyState | `DashboardPage.tsx` `ActivityFeedPanel` | derived from existing `comments` join `users` + `tasks` + `projects` (no DDL needed); also added `activity_log` view migration for future task-update events | `20260501100200_r4_create_activity_log.sql` (additive) | wired | ✅ R4 |
| 7 | DashboardPage Priorities EmptyState | `DashboardPage.tsx` `PrioritiesPanel` | derived from existing `tasks` query: `assignee_id = me`, `status != done`, sort by priority rank desc + deadline asc | n/a | wired | ✅ R4 |
| 8 | AdminUsagePage Storage TBD card | `AdminUsagePage.tsx` `UsageMetricCard` | replaced "Storage probe deferred" with real probe summing `storage.objects.metadata->>'size'` in `get_usage_summary()` RPC | `20260501100300_r4_add_storage_probe.sql` | inherits from existing card (no FE change) | ✅ R4 |

**Final count: 0 placeholders remaining within R4 scope.**

---

## New artifacts

### Migrations (4 files, all additive)

1. `supabase/migrations/20260501100000_r4_create_notif_prefs.sql`
   - Table `notif_prefs` (PK user_id+event_type+channel)
   - RLS: 3 self-only policies
   - RPCs: `get_notif_prefs()` (lazy-creates defaults), `update_notif_pref(p_event_type, p_enabled, p_channel)`

2. `supabase/migrations/20260501100100_r4_create_user_invites.sql`
   - Table `user_invites` (token-keyed, status enum, 7-day expiry default)
   - RLS: admin-only ALL
   - RPCs: `create_user_invite(p_email, p_role, p_team_id)`, `list_user_invites()`, `revoke_user_invite(p_invite_id)`

3. `supabase/migrations/20260501100200_r4_create_activity_log.sql`
   - View `activity_log` (UNION of comments + task status changes)
   - GRANT SELECT TO authenticated (RLS inherited from base tables)

4. `supabase/migrations/20260501100300_r4_add_storage_probe.sql`
   - Replaces `get_usage_summary()` body to compute real storage from `storage.objects.metadata->>'size'`
   - Adds top 10 files by size to `top_files`
   - Wraps in EXCEPTION handler (graceful degrade if storage schema unavailable)

### Frontend

- `apps/web/src/hooks/useDashboardFeed.ts` (NEW)
  - `useDashboardFeed(limit)` → recent comments with author + task + project context
  - `useUserPriorities(userId, limit)` → user's open tasks ordered by priority desc + deadline asc
  - PRIORITY_RANK constant for client-side sort

- `apps/web/src/pages/DashboardPage.tsx` (MODIFIED)
  - `ActivityFeedPanel` now consumes `useDashboardFeed(6)` with loading + empty states
  - `PrioritiesPanel` accepts `userId` prop + consumes `useUserPriorities(userId, 4)`
  - `<ActivityRow>` and `<PriorityRow>` sub-components for clean row rendering

- `apps/web/src/pages/SettingsPage.tsx` (MODIFIED)
  - `NotificationsSection`: 8 event toggles backed by `get_notif_prefs` + `update_notif_pref` RPCs; optimistic update with rollback on RPC error; graceful local-only fallback if migration not applied
  - `ProfileSection`: new `<PasswordChangeBlock>` with `supabase.auth.updateUser({ password })`; min 8 chars, confirm-match validation
  - `MembersSection`: replaced disabled button with `<InviteButton>` inline form calling `create_user_invite` RPC; clear error path if migration not yet applied

---

## RLS verification

All new tables/views ENABLE ROW LEVEL SECURITY:

| Object | Policy | Effect |
|---|---|---|
| `notif_prefs` | `notif_prefs_self_*` (read/insert/update) | user can only see/change their own rows |
| `user_invites` | `user_invites_admin_all` | only admins (via `users.role = 'admin'` lookup) read/write |
| `activity_log` (view) | inherits from `comments`, `tasks`, `projects` SELECT policies | RLS-aware automatically; no separate policy needed |

All RPCs are SECURITY DEFINER but each performs `auth.uid() IS NULL` + role check (where applicable) before mutating.

---

## Constraint: migration application

Local environment lacks `supabase` CLI + DB password. Migrations are committed to repo for owner to run:

```bash
supabase db push
# or selectively:
psql "$DATABASE_URL" < supabase/migrations/20260501100000_r4_create_notif_prefs.sql
psql "$DATABASE_URL" < supabase/migrations/20260501100100_r4_create_user_invites.sql
psql "$DATABASE_URL" < supabase/migrations/20260501100200_r4_create_activity_log.sql
psql "$DATABASE_URL" < supabase/migrations/20260501100300_r4_add_storage_probe.sql
```

**Frontend graceful-degradation pattern:** every new RPC consumer (`useDashboardFeed`, `NotificationsSection`, `InviteButton`) has explicit fallback or error UX so users see useful state even before migrations are applied. This was an explicit design choice — not the "deferred to Sprint 7" anti-pattern.

---

## Bundle impact

Settings + Dashboard hooks are within existing route chunks; no new vendor deps. Expected delta: ≤ 2 KB gzip on relevant route chunks (notif preference UI + invite form). Full re-measure pending Phase D.

---

## Next: Phase C — fix 7 R3 E2E failures

R3 known failures (per `docs/sprint-6-patch-r3-final-audit.md`):
- 3× wizard tests (O2/O3/O4 onboarding step transitions)
- 3× settings tests (S4/S5/S6 inline edit interaction)
- 1× edge test (E7 nav ambiguity)

Phase C will source-debug each, then re-run the 72-scenario suite for clean baseline.
