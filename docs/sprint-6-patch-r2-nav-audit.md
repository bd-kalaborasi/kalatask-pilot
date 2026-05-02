# Sprint 6 Patch R2 — Navigation Audit

**Date:** 2026-04-30
**Scope:** All interactive elements (`<Button>`, `<Link>`, onClick handlers) in `apps/web/src/`

---

## Method

1. Grep all `to=` Link targets — verify resolves to real route in `App.tsx`
2. Grep `onClick=` handlers — verify implementation exists (not placeholder)
3. Grep `disabled\|TODO\|coming soon` markers — categorize

---

## Findings

### ✅ Routing — all targets valid

All `<Link to=...>` targets cross-reference to routes registered in `apps/web/src/App.tsx`:

| Target | Route in App.tsx | Status |
|---|---|---|
| `/` | DashboardPage | ✅ |
| `/login` | LoginPage | ✅ |
| `/projects` | ProjectsPage | ✅ |
| `/projects/:id` | ProjectDetailPage | ✅ |
| `/projects/:id/tasks/:id` | TaskDetailPage | ✅ |
| `/tasks` | TasksPage | ✅ (R2 Phase A new) |
| `/dashboard/manager` | ManagerDashboardPage | ✅ |
| `/dashboard/productivity` | ProductivityDashboardPage | ✅ |
| `/workload` | WorkloadPage | ✅ |
| `/bottleneck` | BottleneckPage | ✅ |
| `/admin/import` | ImportPage | ✅ (R2 Phase B new — unified) |
| `/admin/mom-import` | AdminMoMImportPage | ✅ (legacy, kept) |
| `/admin/csv-import` | AdminCsvImportPage | ✅ (legacy, kept) |
| `/admin/mom-import/:id` | AdminMoMReviewPage | ✅ |
| `/admin/usage` | AdminUsagePage | ✅ |
| `/settings` | SettingsPage | ✅ (R2 Phase A new) |

### ✅ Permissions — RLS-aware

All admin routes guarded with `profile.role !== 'admin'` redirect. Manager + Member + Viewer scoped via RLS at DB layer (per ADR-002).

### ⚠️ Known disabled / placeholder elements

| Location | Element | Status | Notes |
|---|---|---|---|
| `SettingsPage.tsx:381` | "Undang anggota" button | `disabled` + tooltip "Segera tersedia" | MVP — invite flow deferred to Sprint 7 |
| `SettingsPage.tsx:131-133` | Workspace nav: Umum / Roles / Integrasi | `NavItemDisabled` + tooltip | MVP scope — these sections empty |
| `SettingsPage.tsx:233` | NotificationsSection | EmptyState placeholder | Preferences toggle deferred to Sprint 7 |
| `SettingsPage.tsx:248` | Profile edit form | Read-only with note | Profile edit + password change deferred |
| `NotificationDropdown.tsx:69` | TODO Sprint 4 deeplink | TODO comment | Notification → task deeplink not yet wired |

All placeholder UIs use proper `<EmptyState />` component or labeled "Segera tersedia" tooltip — no broken navigation. Users see honest "coming soon" rather than dead clicks.

### ✅ Active onClick handlers — verified functional

| Page | Handlers | Status |
|---|---|---|
| DashboardPage | createProject + reopenWizard | ✅ wired |
| ProjectsPage | toggleStatusPill + resetFilter + setCreateOpen + select | ✅ wired |
| ProjectDetailPage | setCreateTaskOpen + handleStatusChange + ViewToggle | ✅ wired |
| TaskDetailPage | (just navigation) | ✅ |
| TasksPage | setActiveTab + setSearch | ✅ wired (R2 new) |
| AdminMoMImportPage | handleFile + drag-drop + navigate | ✅ wired |
| AdminMoMReviewPage | handleApprove + setItemDecision + setItemPic + setActiveTab | ✅ wired |
| AdminCsvImportPage | parsing + commit + reset | ✅ wired |
| AdminUsagePage | refresh button | ✅ wired |
| ImportPage | tab toggle | ✅ wired (R2 new) |
| SettingsPage | navigateSection + role filter + search | ✅ wired (R2 new) |
| ManagerDashboardPage | (just nav links) | ✅ |
| ProductivityDashboardPage | setPeriod | ✅ |
| WorkloadPage | refetch | ✅ |
| BottleneckPage | (just navigation) | ✅ |

---

## Recommendations

1. **Sprint 7 priority:** wire NotificationDropdown deeplink (TODO Sprint 4 carryover) — user clicks notif row, navigates to task detail
2. **Sprint 7 features:** Settings invite flow + profile edit + notification preferences toggles (all marked "Segera tersedia" — visible to users so honest expectation set)
3. **No broken navigation found in audit** — every Link target resolves, every onClick has implementation. Disabled buttons are explicit, not silent.

---

## Future-proofing rule

**Any new interactive element WAJIB:**
- `<Link to="...">` target must register in App.tsx routes
- `onClick=` handler must implement, not placeholder. If feature not ready, use `disabled={true}` + tooltip "Segera tersedia" pattern (per SettingsPage example)
