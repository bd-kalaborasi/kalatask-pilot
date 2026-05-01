# Sprint 6 Patch R2 — Honest Audit vs Brief

**Date:** 2026-04-30
**Method:** Concrete grep-counted vs brief targets. No "comprehensive coverage achieved" hand-waving.

---

## Verdict (TL;DR)

**Brief target hit-rate: ~45%.** Big gaps in Phase F (E2E coverage + data factory) + Phase A (no side-by-side comparison generated). Phases C/D/E shipped at or near spec. Owner brief asked for 80-150 E2E scenarios; delivered 18 new specs.

---

## 1. Phase F E2E Coverage — actual vs target

**Brief target:** 80-150 scenarios across 12 domains. Each scenario: real login per scenario, realistic data.
**Final report claimed:** "18-scenario E2E spec".

### File: `apps/web/tests/e2e/sprint-6-patch-r2.spec.ts`

`grep -c "test(" sprint-6-patch-r2.spec.ts` → **18**

### Per-domain breakdown

| Domain | Brief target | Actual NEW (R2 spec only) | Existing E2E (pre-R2) | Total accessible | Gap vs brief |
|---|---:|---:|---:|---:|---:|
| Auth | 8 | 0 | 12 (auth.spec.ts) | 12 | +4 over |
| Dashboard | 12 | 0 | ~5 (dashboards.spec.ts) | 5 | **−7 short** |
| Tasks | 15 | 4 (R2 /tasks) | 0 | 4 | **−11 short** |
| Projects | 10 | 0 | ~10 (project-lifecycle.spec.ts) | 10 | match |
| MoM Import | 10 | 1 (legacy compat) | ~7 (mom-import + revision) | 8 | **−2 short** |
| CSV Import | 5 | 0 | ~3 (csv-import.spec.ts) | 3 | **−2 short** |
| Admin Usage | 6 | 0 | ~3 (mom-import.spec.ts §F16) | 3 | **−3 short** |
| Workload | 5 | 0 | ~2 (dashboards.spec.ts) | 2 | **−3 short** |
| Bottleneck | 5 | 0 | ~2 (dashboards.spec.ts) | 2 | **−3 short** |
| Productivity | 8 | 0 | ~4 (dashboards.spec.ts) | 4 | **−4 short** |
| Onboarding | 5 | 0 | ~6 (sprint-4-onboarding.spec.ts) | 6 | match |
| Settings + Admin | 8 | 5 (R2 /settings) | 0 | 5 | **−3 short** |
| `/admin/import` (R2 new) | n/a | 6 | n/a | 6 | bonus |
| Gantt scroll | n/a | 2 | n/a | 2 | bonus |
| Copy lock | n/a | 1 | n/a | 1 | bonus |
| **Edge cases** | 10+ | 0 | 0 | 0 | **−10 short ❌** |
| **TOTAL** | **80-150** | **18** | **~54** | **~72** | **8-78 short** |

### Honest read

- New R2-specific spec: 18 tests. Most cover the 3 new routes + Gantt + copy.
- Existing 144-pass E2E suite covers most of Auth/Projects/MoM/CSV/Onboarding domains adequately.
- **Edge cases entirely missing** (network offline, session expired, concurrent edit, permission denied, long content overflow). Brief required 10+. Delivered 0.
- Tasks domain (15 brief): only 4 R2 scenarios. No coverage for create/edit/delete/comment/mention flows post-Stitch refactor.
- Productivity (8 brief): existing covers ~4. KPI hover/drill-down/insights click — none tested.

---

## 2. Phase F.1 Data Factory — actual vs target

**File:** `apps/web/tests/e2e/fixtures/seed-comprehensive.ts`

| Entity | Brief target | Actual in code | Gap | Status |
|---|---:|---:|---:|---|
| Users | 24 | **24** (counted via `grep -c "id: '00000000"` → 24) | 0 | ✅ matches |
| Projects | 8 | **8** (counted via `grep -c "id: '10000000"` → 8) | 0 | ✅ matches |
| Tasks | 120 | **84** (sum of `taskCount: N` per project: 12+18+16+14+10+8+6+0 = 84) | **−36 short** | ❌ ~30% short |
| Comments | 300 | **~150 estimated** (sample 40% × 84 = ~34 tasks × 1-6 each = 34-200, mid ~120) | **−150 to −180 short** | ❌ ~half short |
| Notifications | 50 | **0** (`notificationsInserted: 0` in summary, comment "deferred") | **−50 entirely** | ❌ DEFERRED |
| MoM imports | 3 | **0** (`momImportsInserted: 0` in summary, comment "deferred") | **−3 entirely** | ❌ DEFERRED |
| Activity log (30 day) | 30 days | **0** (no activity log generation in factory) | **−30 days** | ❌ NOT IMPLEMENTED |

### Honest read

- Users + projects match exactly.
- Tasks: 30% short of brief.
- Comments: estimated ~half delivered (Math.random-based count makes exact count vary per run).
- Notifications, MoM imports, activity log: **0 of brief targets shipped**. Code comment: "needs schema migration coordination".
- Factory **not run autonomously**. Brief implied factory ready for E2E to use; code still requires owner manual run with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. No tests actually consume this factory yet.

---

## 3. Phase C Copy Audit — depth verify

**File:** `docs/sprint-6-patch-r2-copy-audit.md`

| Metric | Count | Notes |
|---|---:|---|
| Semantic groups identified (table headers) | 14 (`grep -cE "^### \|^- \*\*[A-Z]"` → 14) | grouped Action/State/Section/Future |
| Audit table rows | 42 | Shows ~12 inconsistent + 14 consistent + 16 glossary entries |
| Inconsistencies flagged | **3 substantive** | Refresh/Segarkan; Bikin/Buat; Edit/Ubah (latter documented as context-specific not fixed) |
| Actual code fixes applied | **4 file edits** | 1 AdminUsagePage button + 3 files for Bikin → Buat (WizardTour + GanttView empty-state) |
| BRAND.md v2.3 §14 added | ✅ | 4 sub-sections (action verbs, state labels, section names, future-proofing rule) |

### Honest read

- Audit doc itself is solid — table format matches brief request.
- Actual code fixes: **only 4 edits across 3 files**. Brief implied "comprehensive copy unification" — delivered minimal high-impact fixes only. No mechanical sweep across all components.
- Edit/Ubah documented as "context-specific keep both" — punt rather than canonical pick.
- Glossary lock in BRAND.md: ✅ shipped.

---

## 4. Phase D Nav Audit — depth verify

**File:** `docs/sprint-6-patch-r2-nav-audit.md`

| Metric | Count | Notes |
|---|---:|---|
| Audit table rows | 42 | Routing table + handler table + placeholders table |
| Routes verified | 16 | All Link `to=` targets cross-referenced to App.tsx |
| onClick handlers verified | 15 pages | One row per page in handler table — high-level "wired" check, NOT per-handler |
| Broken/placeholder flagged | **1 TODO + 5 disabled placeholders** | Settings invite, workspace nav future sections, Notification preferences, Profile edit, NotificationDropdown deeplink |
| Actual code fixes applied | **0** | All flagged items moved to "Sprint 7 backlog" — none fixed in R2 |

### Honest read

- Coverage: route-level audit yes, but per-`onClick` handler walkthrough not performed (one row per page, not per element).
- "0 broken nav" claim: correct — all targets resolve.
- 5 placeholders flagged but **0 actually fixed** in this round. Audit was descriptive, not corrective.

---

## 5. Phase D Data Audit — depth verify

**File:** `docs/sprint-6-patch-r2-data-audit.md`

| Metric | Count | Notes |
|---|---:|---|
| Audit table rows | 79 | One row per data point per route |
| Pages audited | 14 routes | Each page has 4-8 data points table |
| Hardcoded user-visible data found | **0** | Audit confirms 0 hardcoded |
| Placeholder data sources | **5** | Activity feed, priorities panel, notif prefs, invite flow, profile edit |
| Actual code fixes applied | **0** | All placeholders kept as EmptyState — explicitly marked "Segera tersedia" — no replacement done in R2 |

### Honest read

- Audit doc: solid coverage, 79 data points across 14 routes.
- Discovery: no hardcoded values to replace (existing v2.x work already clean).
- The 5 placeholders identified are **same items already documented in Nav audit** (Sprint 7 backlog). No new code work on data sources happened in R2.

---

## 6. Phase A 3 Routes — implementation depth

| Route | LOC actual | New file? | Stitch HTML used? | Side-by-side comparison generated? |
|---|---:|---|---|---|
| `/tasks` (TasksPage.tsx) | **357** | NEW | Read `04-tasks.html` (~440 lines), adapted DOM hierarchy: tab nav + table + buckets. No SideNavBar (Stitch had vertical 64-wide sidebar) — used existing AppHeader horizontal | ❌ NOT GENERATED |
| `/settings` (SettingsPage.tsx) | **473** | NEW | Read `13-settings-team.html`, adapted: sidebar nav (240w col) + sections + members table. Stitch 3-section nav (Akun/Workspace/Admin) preserved; future-section disabled state added | ❌ NOT GENERATED |
| `/admin/import` (ImportPage.tsx) | **101** | NEW (wrapper) | Did NOT use Stitch HTML — composed existing AdminMoMImportPage + AdminCsvImportPage with new `embedded` prop. Tab nav matches /productivity tab pill style. | ❌ NOT GENERATED |
| `/onboarding` | n/a | NOT NEW | Read `12-onboarding.html` but **did not implement** — claimed existing WizardTour modal "covers spec". Visual diff between Stitch onboarding modal and current WizardTour NOT verified. | ❌ NOT VERIFIED |

### Honest read

- 2 of 3 routes used Stitch HTML reference and adapted DOM hierarchy.
- `/admin/import` didn't use Stitch HTML — it's a wrapper page.
- `/onboarding` not implemented — claim "existing covers it" not visually verified.
- **`docs/sprint-6-patch-r2-comparison/` directory does NOT exist.** Brief required side-by-side screenshots per route. **Delivered 0 of 3 expected.**

---

## 7. Phase F.3 Real Login Verify

**File:** `apps/web/tests/e2e/sprint-6-patch-r2.spec.ts`

| Metric | Count | Notes |
|---|---:|---|
| Tests with `await login(page, ...)` | 18 / 18 | Every test has its own login call |
| Tests with `beforeEach` login shortcut | 0 | None |
| Tests with `storageState` bypass | 0 | None — playwright config does NOT preset storage |
| Tests with `localStorage` manipulation | 0 | None |
| Tests with `supabase.auth.setSession` mock | 0 | None |

### Sample 3 test bodies (first 3 tests in file)

```ts
// 1. /tasks renders heading
test('admin: /tasks renders heading + tab navigation', async ({ page }) => {
  await login(page, ADMIN);                    // ← real login flow
  await page.goto('/tasks');
  await expect(
    page.getByRole('heading', { name: 'Tugas Saya', exact: true }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole('tab', { name: /Hari ini/ })).toBeVisible();
  // ...
});

// 2. /tasks tab switch
test('admin: tab switch updates active state', async ({ page }) => {
  await login(page, ADMIN);                    // ← real login flow
  await page.goto('/tasks');
  const upcomingTab = page.getByRole('tab', { name: /Akan datang/ });
  await upcomingTab.click();
  await expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
});

// 3. /tasks search
test('admin: search input filters tasks', async ({ page }) => {
  await login(page, ADMIN);                    // ← real login flow
  await page.goto('/tasks');
  const searchInput = page.getByPlaceholder('Cari tugas atau project...');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('xxxnonexistentxxx');
});
```

`login()` helper definition:

```ts
async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}
```

### Honest read

✅ **Real login pattern verified.** No anti-patterns found:
- No `setStorageState` shortcut
- No `beforeEach` login once
- No localStorage / Supabase auth mock

---

## Summary — gap accounting

| Brief deliverable | Status | Gap |
|---|---|---|
| 3 deferred routes implemented | ✅ 2 of 3 (/onboarding skipped) | −1 |
| Stitch HTML reference per route | ✅ 2 of 3 used (Import didn't) | partial |
| Side-by-side comparison screenshots | ❌ 0 generated | −3 of 3 |
| Import unify + tab nav | ✅ shipped | 0 |
| Copy audit doc | ✅ shipped | 0 |
| Copy code fixes (mechanical sweep) | ⚠️ minimal (4 edits) | partial |
| BRAND.md v2.3 Glossary | ✅ shipped | 0 |
| Nav audit doc | ✅ shipped | 0 |
| Nav placeholder fixes | ❌ 0 fixed (all deferred) | −5 backlog |
| Data audit doc | ✅ shipped | 0 |
| Data placeholder replacements | ❌ 0 (no hardcoded data found, but 5 placeholders unfilled) | −5 backlog |
| Gantt scroll fix | ✅ shipped + verified | 0 |
| Data factory entity counts | ⚠️ users + projects exact, tasks 30% short, comments ~half short | −106 entities |
| Notifications + MoM + activity log seed | ❌ 0 implemented | entirely deferred |
| 80-150 E2E scenarios | ❌ 18 new (existing 144 baseline kept) | −62 to −132 short |
| Edge cases coverage | ❌ 0 of 10+ | −10 short |
| Real login per scenario | ✅ 18/18 verified | 0 |
| Retro doc | ✅ shipped | 0 |
| PR comment + tag + memory | ✅ all shipped | 0 |

**Honest delivery: ~45% of brief.** Phases A (Stitch routes), C (copy), D (audits), E (Gantt) at-or-near spec. Phase F (data + E2E) substantially short of brief targets. Phase A side-by-side comparisons missed entirely.

---

## What would close the gap

1. **Phase F E2E (62-132 short):** add Tasks domain (15 scenarios for create/edit/delete/comment/mention), Edge cases (10+), Productivity hover/drill-down (4 missing), Workload reassign flow (3 missing), Bottleneck detail (3 missing).
2. **Phase F.1 Data factory:** add 36 more tasks, ~150 more comments, 50 notifications, 3 MoM imports, 30-day activity log backfill.
3. **Phase A side-by-side:** generate `docs/sprint-6-patch-r2-comparison/` with 3 paired screenshots (/tasks, /settings, /admin/import) + Stitch references.
4. **Phase C mechanical sweep:** Edit/Ubah context audit not deferred — pick canonical and apply.
5. **Phase D actually fix placeholders:** wire NotificationDropdown deeplink + at least dashboard activity feed query.
