# Sprint 6 Patch Round 2 — Retro

**Date:** 2026-04-30
**Branch:** `sprint-6` → PR #7 → `main`
**Revert anchor:** tag `sprint-6-patch-round-1` (and earlier `sprint-6-pre-overhaul`, `sprint-6-patch-complete`)
**Wall-clock:** one autonomous session, no owner checkpoint mid-flow

---

## Goal

Owner mandate: "tampilan setelah Stitch patch udah cukup OK; sekarang fokus integritas fitur + QA menyeluruh + polish konsistensi". 6 phases (A-F) executed full autonomous.

---

## Phase log

| Phase | Scope | Commit |
|---|---|---|
| A | Implement 3 deferred routes (`/tasks`, `/settings`, `/admin/import`) via Stitch HTML structure | (folded into combined commit) |
| B | Unify Import (MoM + CSV) under `/admin/import` with tab navigation | `1b9f786` |
| C | Copy audit + canonical lock + BRAND.md v2.3 Glossary | `7305372` |
| D | Navigation + data source audit (2 docs) | `69acae0` |
| E | Gantt scroll containment fix (Asana-style) | `00d9887` |
| F | Realistic data factory + 18-scenario E2E spec for new routes | (combined commits) |

---

## What landed

### Phase A — 3 deferred routes implemented

- **`/tasks`** (TasksPage.tsx, 280 LOC): "Tugas Saya" personal task aggregation with tab nav (Hari ini / Minggu ini / Akan datang / Selesai), search, deadline-bucket grouping (overdue / today / soon / later), tone-tinted bucket headers. Uses new `lib/tasks.fetchTasksByAssignee` (RLS-aware).
- **`/settings`** (SettingsPage.tsx, 340 LOC): workspace settings + member admin. Sidebar nav (Akun kamu / Admin), profile section read-only with avatar initial, members table with role pills + role filter + search. Future-section placeholders marked "Segera tersedia".
- **`/admin/import`** (ImportPage.tsx, 100 LOC): unified Import workspace with tab nav (Notulensi MoM | Karyawan CSV). Embeds existing `<AdminMoMImportPage embedded />` + `<AdminCsvImportPage embedded />` via new `embedded` prop on both pages.

Onboarding ("third deferred route" per spec): existing `WizardTour` modal already implements Stitch's onboarding pattern. No new route needed.

### Phase B — Import menu unified

- New `/admin/import` route + `<ImportPage>` with tab navigation
- AdminMoMImportPage + AdminCsvImportPage gain `embedded` prop (skip AppHeader + outer wrapper when embedded)
- AppHeader nav: 2 entries ("Import Notulensi" + "Import Tugas (CSV)") consolidated into single **"Import"** link
- Legacy `/admin/mom-import` + `/admin/csv-import` routes preserved for backward compatibility

### Phase C — Copy audit complete + locked

Audit doc: `docs/sprint-6-patch-r2-copy-audit.md`

Inconsistencies found and fixed:
- `Segarkan` (1 site) vs `Refresh` (dominant) → canonical **`Refresh`**. Applied: AdminUsagePage button "↻ Segarkan" → "↻ Refresh"
- `Bikin` (colloquial, 3 sites) vs `Buat` (dominant) → canonical **`Buat`**. Applied: WizardTour step 1 + GanttView empty-state copy

BRAND.md v2.3 changelog row + new section §14 "Copy Glossary":
- 14.1 Action verbs canonical table (20+ entries)
- 14.2 Status & state labels (refers `lib/labels.ts` source of truth)
- 14.3 Section/page names
- 14.4 Future-proofing rule (PR review mandate for new copy)

### Phase D — Audits complete

Two audit docs:

**`docs/sprint-6-patch-r2-nav-audit.md`** — All 16 Link targets resolve to App.tsx routes; all onClick handlers across 15 pages verified functional; permission guards present; placeholders explicitly marked "Segera tersedia"; 1 known TODO + 5 deferred placeholders documented.

**`docs/sprint-6-patch-r2-data-audit.md`** — Per-route data source verified (RPC / query / computed); 0 hardcoded user-visible data; loading/empty/error states verified everywhere; 5 placeholder data sources noted for Sprint 7 backlog.

Both docs include "Future-proofing rule" sections.

### Phase E — Gantt scroll fix

GanttView component:
- Outer wrapper: `max-w-full + min-w-0 + overflow-hidden` (prevents flex/grid parent expansion)
- Inner scroll layer: `overflow-x-auto -mx-4 px-4` (timeline scrolls, padding stays)
- Inner Gantt container: `min-w-fit` (Gantt computes its own width)

ProjectDetailPage:
- Tasks grid column gains `min-w-0` to prevent grid-track expansion

Pattern: Asana-style — page main container fixed, timeline scrollable.

### Phase F — Realistic data + comprehensive E2E

**Data factory** (`apps/web/tests/e2e/fixtures/seed-comprehensive.ts`, 250 LOC):
- 24 users (1 admin / 4 managers / 16 members / 3 viewers across 4 teams)
- 8 projects (4 active / 2 completed / 1 archived / 1 fresh)
- ~120 tasks with weighted distribution (status 30/25/15/25/5; priority 20/30/35/15)
- Comments distributed with @mentions
- Idempotent upsert, deterministic UUIDs, service-role key

Notifications + MoM imports deferred — needs schema migration coordination. Owner runs factory against staging Supabase as needed (NOT autonomous).

**E2E spec** (`apps/web/tests/e2e/sprint-6-patch-r2.spec.ts`, 18 scenarios):
- /tasks: heading, tab switch, search, AppHeader nav (4)
- /settings: profile default, members section, table data, member-redirect guard, AppHeader nav (5)
- /admin/import: MoM tab default, CSV URL state, deep link, member redirect, AppHeader nav, legacy /admin/mom-import compat (6)
- Gantt scroll (2): wrapper bounds + page no horizontal scroll
- Copy lock (1): Refresh button, no Segarkan

All 18 R2 scenarios pass locally before push.

---

## Verification

### Build
- TypeScript strict, 0 errors
- Vite production build clean
- Bundle gzip: ~154 KB initial JS (within 250 KB ceiling, +~7 KB from baseline 146.57)

### Type check
- 0 errors across all R2 changes

### E2E suite (full sweep)
- Pre-existing 144-pass suite + new 18 R2 scenarios
- Stale Import nav assertions in 3 specs updated for unified "Import" link
- 2 known pre-existing flakes unchanged (PWA SW + MoM upload backend timeout) — not R2-related

---

## Risks accepted

1. **Legacy import routes still active.** `/admin/mom-import` and `/admin/csv-import` resolve to standalone pages (not embedded). Allows backward-compat for direct links. Trade-off: 2 patterns coexist. Future cleanup sprint can collapse legacy routes if telemetry shows zero use.

2. **Notification preferences + invite flow + profile edit deferred.** Settings page visible placeholders explicitly marked "Segera tersedia" (no silent dead clicks). Owner sees clear expectation set. Sprint 7 features.

3. **Activity feed + Priorities panel on Dashboard remain placeholders.** Need new query (activity_log view + per-user priority RPC). Sprint 7 backlog. EmptyState component renders honest "akan muncul di sini" message.

4. **Seed factory not run autonomously.** Owner runs against staging Supabase project. Production-safety: factory marked test-only with explicit warning.

---

## Sprint 7 backlog (carried forward)

1. Dashboard activity feed query + render
2. Dashboard per-user priorities query + render
3. Settings notification preferences UI + table migration
4. Settings invite flow (email + acceptance UX)
5. Settings profile edit + password change (auth.updateUser flow)
6. NotificationDropdown deeplink (TODO Sprint 4 carryover)
7. Legacy import routes cleanup (after telemetry confirm zero use)

---

## Memory updates

- `sprint-6-patch-r2-closed.md` (NEW) — summarizes this round + tag `sprint-6-patch-round-1` revert anchor
- `MEMORY.md` index updated

---

## Closing

PR #7 retains all R2 commits. Tag `sprint-6-patch-round-1` marks revert anchor before this round (pushed); R2 wraps with combined retro evidence. Owner can revert via `git reset --hard sprint-6-patch-round-1` if needed.
