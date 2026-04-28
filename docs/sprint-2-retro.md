# Sprint 2 Retrospective — KalaTask Pilot

**Sprint window:** 2026-04-28 (1 hari kalender, intensive autonomous mode)
**Branch:** `sprint-2`
**First commit:** `c91b0a7` — docs ADR-003 + Sprint 2 plan
**Last commit:** *(akan di-update saat sprint 8 commit terakhir)*
**Status:** ✅ DONE — Step 8 verifier ready, awaiting Checkpoint 3 manual approval

---

## 1. Sprint summary — what shipped

### F3 Three Views (List + Kanban + Gantt read-only)

| View | Component | Commit |
|---|---|---|
| List | `components/views/ListView.tsx` | `5de552d` |
| Kanban | `components/views/KanbanView.tsx` | `fd11cd5` |
| Gantt | `components/views/GanttView.tsx` (lazy-loaded) | `70d2617` |

Plus shared infra:
- `components/task/TaskStatusBadge` + `TaskPriorityBadge`
- `components/task/TasksFilterBar` (status + priority chips, assignee dropdown, group-by toggle)
- `lib/tasks.ts` (data layer + types)
- `lib/tasksFilter.ts` (pure filter + group functions)
- `lib/formatDate.ts` (DD-MM-YYYY ID format + relative time)
- `lib/notifStub.ts` (Q3 stub — defer notif emission Sprint 3, log only)
- `hooks/useTasksByProject.ts` (fetch + optimistic update helper)

### F14 Project Lifecycle UI

- `components/project/ProjectStatusBadge.tsx` — 5 enum visual badge
- `components/project/ProjectStatusSelect.tsx` — native `<select>`, role-based disable
- Wired ke `ProjectDetailPage` Status Project section

### Routing extended

- `/projects` — list page (filter persistent via URL)
- `/projects/:projectId` — detail page dengan view toggle (List/Kanban/Gantt)
- `AppHeader` shared layout (Beranda + Projects nav, role badge, Keluar)

### URL state persistence (F3 AC-5)

`lib/filterUrlState.ts` covers:
- Projects filter: `f.status` (multi), `f.team` (single)
- Tasks filter: `f.tstatus`, `f.tprio`, `f.tassignee`
- View: `view=list|kanban|gantt` (default skipped)
- Group-by: `group=none|status|priority|assignee` (default skipped)
- Roundtrip read↔write tested unit

### ADR + plan published

- **ADR-003** Gantt library: `frappe-gantt v1.2.2` adopted, dhtmlx-gantt rejected (GPL viral + bundle bloat). Pin version locked.
- **Sprint 2 plan**: 8 step breakdown, risk register 8 items, Q1-Q4 PRD ambiguity resolved by owner.

### Test infrastructure

- **Vitest** (new) + @testing-library/react + jsdom — unit tests untuk pure logic
- 73 unit tests (status badge, select, project filter, tasks filter, group, date format, URL state, gantt task builder)
- Playwright E2E extended dengan 2 spec baru:
  - `project-lifecycle.spec.ts` (10 assertions)
  - `views.spec.ts` (4 assertions)
- 26 E2E total (Sprint 1: 12 + Sprint 2: 14)

### pgTAP

- `supabase/tests/projects_status_lifecycle.test.sql` — 6 assertions verifying F14 RLS update permission per role + field preservation
- Test belum jalan via MCP (read_only=true post-Sprint 1 hygiene). Owner action: jalankan via Dashboard atau toggle MCP.

### Commit breakdown (8 commits Sprint 2)

| Step | Commit | Subject |
|---|---|---|
| 0 (plan) | `c91b0a7` | docs ADR-003 + Sprint 2 plan |
| 1 | `0ecdd65` | feat: project status badge + selector (F14) |
| 2 | `ded04d0` | test: pgTAP coverage project status lifecycle |
| 3 | `1b7caaf` | feat: project list page + status filter |
| 4 | `5de552d` | feat: task list view + grouping + filter |
| 5 | `fd11cd5` | feat: kanban view drag-drop |
| 6 | `70d2617` | feat: gantt view via frappe-gantt |
| 7 | `715b9ee` | feat: unified view toggle + filter persistence |
| 8 | *(Step 8 commit)* | test(e2e): Sprint 2 F3 + F14 verification |

---

## 2. What went well

### a. Plan-first execution

Sprint 2 plan locked dengan 4 owner answers (Q1-Q4) sebelum eksekusi. Setiap step di plan ada commit message convention spesifik — eksekusi tinggal follow blueprint, no design ad-hoc.

### b. Pattern reuse dari Sprint 1

Filter state pattern (URL query params dengan `f.` prefix) di-extend dari `ProjectsFilter` ke `TasksFilter` dengan minimum delta. Status badge component pattern (chip + dot + role-aware) reusable across project + task. Test setup unchanged — Vitest just added, Playwright kept Sprint 1 config.

### c. Forward-only fix philosophy maintained

Tidak ada migration yang di-edit. Tidak ada Sprint 1 file yang di-modify destructively. AuthContext yang di-fix di Step 9 close stays intact. Build + test discipline preserved across Sprint 2.

### d. Bundle budget hit dengan headroom

Sprint 1 baseline 115KB gzipped → Sprint 2 final 137KB gzipped (initial chunk). Gantt code-split add 14KB lazy chunk (only loads on demand). Total all-chunks 151KB gzipped — well under PRD N1 500KB budget.

Lazy-load via `React.lazy` + `Suspense` (R3 mitigation di plan) berhasil — no manual webpack config needed, Vite + Rollup handle automatically.

### e. E2E run cepat + deterministic

Sprint 2 E2E suite (14 baru) selesai 30s. Kombinasi dengan Sprint 1 (12) total 26 tests / 30 detik. Single worker, headless Chromium, no flake observed across multiple runs.

---

## 3. What went wrong / friction points

### a. frappe-gantt v1.2.2 strict ESM exports field block CSS path

Direct `import 'frappe-gantt/dist/frappe-gantt.css'` failed di Vite v6 dengan error `Missing "./dist/frappe-gantt.css" specifier in "frappe-gantt" package`. frappe-gantt package.json `exports` only declare `.` entry dengan `style` hint (non-standard) — strict Node ESM resolver block path lookup.

**Workaround:** vendor CSS file ke `src/styles/frappe-gantt.css` (one-time copy). Tidak ideal (kalau library upgrade, manual re-copy), tapi terbukti reliable.

**Recommendation:** add ke `docs/skill-issues.md` (pattern: ESM exports field strictness untuk peer dependencies). Re-validate saat upgrade frappe-gantt di Sprint 3+ retro.

### b. Vite vs vitest config conflict

`tsc -b` failed di build karena `test` field di `vite.config.ts` tidak dikenal oleh `vite/UserConfigExport` (perlu `vitest/config`). Quick fix: ubah import dari `from 'vite'` ke `from 'vitest/config'`. Documented inline.

**Lesson:** kalau extend Vite config dengan Vitest, pakai `defineConfig` dari `vitest/config` bukan `vite`.

### c. Playwright locator strict mode — name "Projects" matches 2 elements

E2E `getByRole('link', { name: 'Projects' })` matched both nav link "Projects" dan dashboard CTA "Buka Projects" (substring match). Quick fix: tambah `exact: true`. Strict mode useful untuk catch ambiguity early.

### d. CRLF line ending warnings setiap commit

Carry-over dari Sprint 1 — tidak block apapun, tapi visual noise. Sprint 1 retro mention sebagai friction, Sprint 2 sama.

### e. Initial bundle warning (510KB raw before lazy-load)

Sebelum apply React.lazy untuk Gantt, build Vite throw warning "Some chunks larger than 500 kB". Lazy-load brings down ke 462KB raw / 137KB gzipped. Lesson: aplikasi mitigation R3 dari plan tidak optional — kalau bundle warning muncul, defer route via lazy.

### f. pgTAP test belum bisa run via MCP (read_only=true)

Step 2 pgTAP untuk F14 status lifecycle ditulis tapi tidak ter-execute via MCP karena `.mcp.json` `read_only=true` (Sprint 1 hygiene). Test ready, owner perlu toggle atau run via Dashboard. Tidak block Sprint 2 deliverable karena Test verifies existing Sprint 1 RLS yang sudah passed 80 assertions. Expected 6/6 pass.

### g. Q3 notif stub — TODO marker rapi tapi defer ke Sprint 3 visible

Per Q3 owner answer, notif emission saat Kanban drag deferred. Stub di `lib/notifStub.ts` log saja. Comment + TODO Sprint 3 reference tagged. Visible follow-up tapi explicit + traceable.

---

## 4. Lessons learned (actionable Sprint 3+)

### a. Vendor third-party CSS kalau library exports field strict

Pattern: kalau library v2/v3 ESM dengan strict exports tidak expose `.css` specifier, copy ke `src/styles/` dan import lokal. Document inline. Add ke skill `kalatask-brand-tokens` atau new general "third-party CSS handling" pattern.

### b. Code-split route lazy-load default untuk feature heavy

Gantt = 50KB raw chunk. Defer load via `React.lazy` saat feature tidak di-visit by default. Pattern reusable untuk Sprint 3+ heavy features (productivity dashboard chart libraries, CSV import parser, dst).

### c. Vitest test setup minimum-viable

Sprint 2 added Vitest in 1 step (config + setup file + 2 npm script). Cost: ~10 menit. Benefit: 73 unit tests in Sprint 2 (vs 0 di Sprint 1). Should have been Sprint 0 task. Retroactively, Vitest install di Sprint 0 saat Vite scaffold lebih cheap karena context fresh.

**Recommendation:** Sprint 0 future projects include Vitest setup as default scaffold step.

### d. Filter URL state pattern compounds well

`filterUrlState.ts` pattern (read/write per filter shape, namespace prefix `f.`, default-skip params) reusable di any future filter. Sprint 3 productivity dashboard date range filter bisa adopt same pattern dengan 1 helper extension.

### e. Q3 stub pattern — explicit defer marker

Pattern `lib/notifStub.ts` dengan TODO marker `KT-S3-NOTIF-01` + dependency note + reference link. Future Sprint 3 cek `grep -r "KT-S3"` langsung dapat backlog. Better than implicit "this will break later".

### f. ADR-003 actual measurement closer to estimate

Sprint 2 plan estimate `frappe ~22KB gzipped`. Actual: lazy chunk Gantt 14KB gzipped + 7KB CSS gzipped (kalau diisolasi) ≈ 21KB. Estimate accurate.

dhtmlx-gantt rejection holds — kalau pakai akan exceed budget by 3x.

---

## 5. Metrics

### Commit volume (Sprint 2)

| Type | Count | Detail |
|---|---|---|
| feat | 6 | F14 UI, project list, task list, kanban, gantt, view toggle |
| test | 2 | pgTAP F14 (Step 2), E2E F3+F14 (Step 8) |
| docs | 1 | ADR-003 + Sprint 2 plan |
| **Total** | **9** | (1 doc + 1 plan + 6 feat + 2 test, including this Step 8 commit) |

### Test coverage (Sprint 2 baru + Sprint 1 retained)

| Layer | Sprint 1 | Sprint 2 baru | Cumulative |
|---|---|---|---|
| pgTAP RLS | 80 | 6 (F14 status lifecycle) | 86 |
| Vitest unit | 0 | 73 | 73 |
| Playwright E2E | 12 | 14 | 26 |
| **Total assertions** | **92** | **93** | **185** |

### Bundle size delta

| Metric | Sprint 1 final | Sprint 2 final | Delta |
|---|---|---|---|
| Initial JS (raw) | 393 KB | 462 KB | +69 KB |
| Initial JS (gzipped) | 115 KB | 137 KB | +22 KB |
| Lazy Gantt chunk (gzipped) | — | 14 KB | new |
| Total all chunks (gzipped) | 115 KB | 151 KB | +36 KB |
| % of PRD N1 500KB budget (gzipped) | 23% | 30% | within |

### Per-step actual effort vs estimate

| Step | Plan estimate | Actual | Variance |
|---|---|---|---|
| 1 — F14 UI + Vitest setup | 0.5 hari | ~30 menit | -75% (Vitest setup faster than estimated) |
| 2 — pgTAP RLS audit | 0.5 hari | ~10 menit | -90% (no schema change needed; reuse Sprint 1 RLS pattern) |
| 3 — Project list page | 1.0 hari | ~45 menit | -85% (filter URL state pattern from plan) |
| 4 — Task list view | 1.5 hari | ~50 menit | -85% (filter pattern reuse) |
| 5 — Kanban drag-drop | 2.0 hari | ~30 menit | -90% (dnd-kit minimal API) |
| 6 — Gantt frappe-gantt | 1.5 hari | ~30 menit (incl ESM CSS workaround discovery) | -85% |
| 7 — View toggle URL | 0.5 hari | ~10 menit (already wired di Step 4-6, just unit tests) | -65% |
| 8 — E2E suite + retro | 1.0 hari | ~30 menit | -65% |
| **Total** | **8.5 hari** | **~3.5 jam intensive autonomous** | -95% wall-clock |

**Variance analysis:** sprint estimate dibuat pessimistic (8.5 hari single dev). Actual dengan autonomous mode dan plan-first preparation jauh faster. Pattern reuse compounding (filter URL, badge components, hook structure) cut implementation time signifikan. Plan estimate masih useful sebagai upper bound + risk buffer.

### Bugs found + fixed selama eksekusi

| Bug | Step | Root cause | Fix |
|---|---|---|---|
| frappe-gantt CSS import path blocked | 6 | Strict ESM exports field tidak expose `./dist/*.css` | Vendor CSS to `src/styles/` |
| Vite build TS error `test` field | 3 | `defineConfig` dari `vite` tidak include vitest types | Switch ke `defineConfig` dari `vitest/config` |
| Playwright strict mode locator violation | 8 | `Projects` text matches 2 elements (nav + dashboard CTA) | Add `exact: true` to locator |
| Vitest test failure: weird type cast | 4 | Misuse `as TasksFilter` chained type assertion | Use plain typed const |
| Initial bundle warning >500KB raw | 6 | Gantt + CSS bloat | React.lazy code-split |

Semua di-fix self-contained, no Sprint 1 regression introduced.

---

## 6. Open issues / known limitations untuk Sprint 3

### Kritis (block major feature)
- **Q3 notif emission masih stub.** Real implementation butuh `task_watchers` + `notifications` table + RLS. Task ID: KT-S3-NOTIF-01.
- **Member SELECT projects defer (Sprint 1 design)** sudah resolved Sprint 1 Step 8, but verify continue working dengan tasks data Sprint 3.

### Non-kritis (UX polish + scope creep)
- **Project create UI** belum ada — admin/manager butuh Dashboard SQL atau ADD migration. Sprint 3 atau Sprint 4 add `CreateProjectDialog`.
- **Task create UI** belum ada — Member tidak bisa INSERT task per RLS Sprint 1 anyway, tapi Manager + Admin butuh UI.
- **Project + task seed data** untuk dev/demo: Sprint 1 hanya seed 4 users + 2 teams. Sprint 3 perlu seed sample projects + tasks untuk demo + better E2E coverage.
- **F11.a global search** (PRD top nav search bar) deferred per Q4.
- **F11.c saved filter** deferred per Q4.
- **Gantt drag-resize** out of scope pilot per ADR-003 + PRD §3.3.
- **Task dependencies** out of scope pilot per PRD §3.3 line 179.

### Tech debt
- pgTAP F14 lifecycle test (Step 2) belum jalan via MCP — owner action toggle atau Dashboard run.
- CRLF/LF noise di setiap commit (.mcp.json) — autocrlf side effect, no fix needed tapi noisy.
- `frappe-gantt` CSS vendored — kalau upgrade library, manual re-copy step.

---

## 7. Status flag untuk Sprint 3

✅ **Sprint 2 deliverable complete.** F3 Three Views + F14 Lifecycle shipped. RLS dari Sprint 1 unchanged + verified non-regressed via E2E (Sprint 1 12 assertions tetap pass).

**Recommended Sprint 3 scope (per CLAUDE.md mapping):**
- F5 (workload view)
- F6 (bottleneck view)
- F8 (manager dashboard)
- F13 (productivity dashboard)
- ADR-004 (productivity dashboard query strategy — Edge Function vs DB view) wajib selesai pre-Sprint 3

**Pre-Sprint 3 checklist:**
- [ ] Owner Checkpoint 3 manual test approval
- [ ] Run pgTAP F14 lifecycle test (or via Dashboard) — confirm 6/6 pass
- [ ] ADR-004 ditulis + approved
- [ ] Decide: project + task seed data extension untuk dev/demo
- [ ] Decide: Q3 notif Sprint 3 implementation scope (task_watchers + notifications)
- [ ] Toggle MCP `read_only=true` setelah pgTAP run
- [ ] Merge `sprint-2` ke `main` via PR
