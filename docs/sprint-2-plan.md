# Sprint 2 Plan — KalaTask Pilot

**Sprint window:** target 1-2 minggu setelah owner approve plan ini
**Branch:** `sprint-2` (dari main, commit `25f570c`)
**Scope locked:** PRD §3.1 F3 + F14, PRD §11 Sprint 2 mapping
**ADR baseline:** ADR-001/002/003/005/006

---

## A. Scope (locked dari PRD)

### F3 — Three Views (List + Kanban + Gantt read-only)

PRD §3.1 line 113 + PRD §11 line 792. Acceptance criteria PRD line 202-205:

1. **AC-1:** Given list of task, when user klik view "Kanban", then task ter-group by status dalam kolom (Todo / In Progress / Review / Done).
2. **AC-2:** Given Kanban view, when user drag task dari kolom "Todo" ke "In Progress", then status di DB update dan notif ke watchers.
3. **AC-3:** Given Gantt view, when task punya deadline + estimasi durasi, then bar muncul di timeline. Task tanpa estimasi muncul sebagai milestone (titik).

**Implicit AC dari PRD line 113:**
- AC-4: List view dengan grouping by project / assignee / status (toggle-able).
- AC-5: Filter persistent saat switch view (PRD §3.1 F3 deskripsi line 200).

**Catatan scope:**
- Status enum di Kanban: PRD line 203 list 4 (Todo / In Progress / Review / Done). Tasks table CHECK constraint punya 5 (todo/in_progress/review/done/blocked). **Gap PRD ↔ schema**: kolom 'Blocked' di Kanban tidak di-spec eksplisit di AC-1. Lihat "Pertanyaan untuk Owner" bagian akhir.
- Notif di AC-2: PRD F7 (line 117) sudah lock tier, tapi `notifications` table belum ter-create. **Dependency:** notif emission di-defer ke Sprint 3+ atau di-stub di Sprint 2. Lihat Risk Register.
- Watchers di AC-2: `task_watchers` table belum exist (deferred dari Sprint 1, Step 8 design decision #6). Notif ke watchers butuh table ini. **Dependency unresolved.**

### F14 — Project Lifecycle

PRD §3.1 line 144 + PRD §11 line 793.

**Spec:** project punya status `planning / active / on_hold / completed / archived`. Hanya `active` dihitung di productivity dashboard (Sprint 3 concern).

**Status existing di Sprint 1:** kolom `projects.status` sudah ada dengan CHECK constraint 5 enum (lihat migration `20260427140000_create_projects_table.sql`). Schema F14 sudah selesai.

**Missing untuk F14:**
- UI untuk Manager/Admin ubah project status (lifecycle transition).
- Visual indicator di project list untuk status non-active.
- Filter list view by project status.
- (Optional, Sprint 3 concern) Trigger DB validation transition rules — e.g., archived → tidak bisa balik ke active. Lihat "Pertanyaan untuk Owner".

---

## B. Step-by-step breakdown (8 steps)

Pattern naming + commit convention konsisten dengan Sprint 1 (lihat `docs/sprint-1-retro.md`).

### Step 1 — F14 UI: project status lifecycle controls

**Deliverable:**
- New component: `apps/web/src/components/project/ProjectStatusBadge.tsx` — visual badge per status (5 enum).
- New component: `apps/web/src/components/project/ProjectStatusSelect.tsx` — dropdown untuk Manager/Admin update status (RLS sudah enforce role di Sprint 1).
- Wire ke nascent project detail page (Sprint 2 Step 5).

**Acceptance criteria:**
- 5 status badge variants (planning/active/on_hold/completed/archived) dengan brand colors dari `theme.css`.
- Dropdown disabled untuk Member + Viewer (RLS + UI guard).
- Update status optimistic UI + revert on error.

**Test strategy:** unit test (Vitest, propose install — see section D), 1 E2E flow Playwright (admin update status from active → on_hold, verify DB row).

**Commit:** `feat(web): project status badge + selector (F14)`
**Estimate:** 0.5 hari

---

### Step 2 — RLS audit: project status update permission verification

**Deliverable:**
- pgTAP test new file `supabase/tests/projects_status_lifecycle.test.sql` — 6 assertions:
  - Manager dapat UPDATE own project status
  - Manager TIDAK dapat UPDATE other project status (cross-team blocked)
  - Member TIDAK dapat UPDATE project status
  - Viewer TIDAK dapat UPDATE project status
  - Admin dapat UPDATE any project status
  - Status update preserves other field values (no field lock issue di projects)

**Acceptance criteria:**
- 6/6 pgTAP assertion pass
- No new migration needed (Sprint 1 RLS sudah cover); kalau test fail → migration fix follow-up

**Test strategy:** pgTAP via MCP execute_sql aggregation pattern (Sprint 1 established).

**Commit:** `test(db): add pgTAP coverage untuk project status lifecycle`
**Estimate:** 0.5 hari (test only, no schema change kecuali test reveals bug)

---

### Step 3 — Project list page + filter persistence

**Deliverable:**
- `apps/web/src/pages/ProjectsPage.tsx` — list semua project visible ke current user.
- Filter UI: status (multi-select), team (admin/viewer cross-team only).
- Filter state di URL query string (persist on refresh + share link).

**Acceptance criteria:**
- Admin/Viewer lihat semua project. Manager lihat own + team. Member lihat via assigned task transitive (Sprint 1 RLS).
- Filter chip visible. Reset filter button.
- Empty state copy per microcopy skill section A.

**Test strategy:** unit test render logic (filter pure fn), E2E test Playwright untuk admin filter flow.

**Commit:** `feat(web): project list page dengan status filter (F3)`
**Estimate:** 1 hari

---

### Step 4 — Task list page (List view di F3)

**Deliverable:**
- `apps/web/src/pages/TasksPage.tsx` (atau nested di ProjectDetailPage) — list task dengan grouping by project / assignee / status (toggle).
- Filter: assignee, project, status, priority, deadline range, source (PRD F11.b line 134).
- View toggle: List | Kanban | Gantt (toggle state persist via query param).

**Acceptance criteria (F3 AC-4 + AC-5):**
- Grouping toggle berfungsi tanpa refetch (re-group from local state).
- Filter persist saat switch view (List → Kanban → Gantt).
- Empty state per microcopy skill.

**Test strategy:** unit test grouping fn + filter fn pure. E2E flow: login member → see only assigned tasks.

**Commit:** `feat(web): task list view dengan grouping + filter (F3)`
**Estimate:** 1.5 hari

---

### Step 5 — Kanban view (F3 AC-1 + AC-2)

**Deliverable:**
- `apps/web/src/components/views/KanbanView.tsx` — 4 atau 5 column (lihat Pertanyaan untuk Owner: include 'blocked' atau tidak).
- Drag-drop pakai `@dnd-kit/core` (recommend, smaller than react-beautiful-dnd, A11y-friendly).
- Optimistic update + rollback on RLS error.

**Acceptance criteria (F3 AC-1 + AC-2):**
- Task ter-group ke column berdasarkan status.
- Drag task antar column → status update DB (RLS Member field-lock allows status — Sprint 1 trigger).
- Notif ke watchers: **deferred Sprint 3** kalau task_watchers table belum ada. Stub no-op + log untuk Sprint 2. Lihat Risk Register R1.

**Test strategy:** unit test drag handler logic. E2E flow: member drag own task Todo → In Progress, verify DB update via Supabase RPC inspect.

**Commit:** `feat(web): kanban view dengan drag-drop (F3 AC-1 AC-2)`
**Estimate:** 2 hari

---

### Step 6 — Gantt view (F3 AC-3) — frappe-gantt integration

**Deliverable:**
- Install `frappe-gantt@1.2.2` (locked version per ADR-003).
- TypeScript declaration file `apps/web/src/types/frappe-gantt.d.ts` kalau community types tidak available.
- `apps/web/src/components/views/GanttView.tsx` — render task dengan deadline + estimated_hours. Milestone (titik) untuk task tanpa estimated_hours.
- Read-only mode enforced (frappe-gantt config).
- Scope CSS frappe ke wrapper div untuk avoid Tailwind specificity clash (mitigation per ADR-003).

**Acceptance criteria (F3 AC-3):**
- Bar muncul untuk task dengan deadline + estimated_hours.
- Milestone (titik) untuk task tanpa estimated_hours.
- Read-only — no drag-resize (Phase 2).
- Bundle size cek: total initial JS gzipped < 500KB (PRD N1).

**Test strategy:** visual regression test (manual screenshot di Playwright), bundle size check via `npm run build` output.

**Commit:** `feat(web): gantt view via frappe-gantt (F3 AC-3, ADR-003)`
**Estimate:** 1.5 hari

---

### Step 7 — View toggle integration + filter persistence E2E

**Deliverable:**
- Wire 3 view (List/Kanban/Gantt) di task page dengan toggle UI.
- Filter state shared antar view (persist saat switch).
- URL state sync (deep linking).

**Acceptance criteria (F3 AC-5):**
- Switch view tanpa lose filter.
- Refresh halaman preserve view + filter via query param.
- Back/forward browser button work correctly.

**Test strategy:** E2E flow Playwright: load /tasks?view=kanban&status=todo → switch ke Gantt → verify filter persist + URL updated.

**Commit:** `feat(web): unified view toggle + filter persistence (F3 AC-5)`
**Estimate:** 0.5 hari

---

### Step 8 — Sprint 2 E2E suite + checkpoint 3 prep

**Deliverable:**
- Extend `apps/web/tests/e2e/` dengan 2 file baru:
  - `project-lifecycle.spec.ts` — F14 status update flow per role (4 role × 2 actions = 8 assertions).
  - `views.spec.ts` — F3 acceptance criteria coverage (~10-12 assertions).
- Update Sprint 2 checkpoint report doc.

**Acceptance criteria:**
- All E2E pass.
- Bundle size verified < 500KB gzipped via `npm run build` log capture di report.
- Owner manual screenshot test per role (Checkpoint 3).

**Test strategy:** Playwright headless, single worker (Sprint 1 pattern).

**Commit:** `test(e2e): add Sprint 2 F3 + F14 verification`
**Estimate:** 1 hari

---

## C. Dependencies & ordering

### Blocking chain (must be sequential)

```
Step 1 (F14 UI)  →  Step 3 (Project list)  →  Step 4 (Task list)  →  Step 5/6 (Kanban + Gantt)  →  Step 7 (toggle)  →  Step 8 (E2E)
                                                              ↘
                                                         Step 5 + 6 dapat parallel kalau 2 dev
                                                         (1 dev: Step 5 sebelum Step 6)
```

### Parallelizable

- **Step 2 (pgTAP RLS audit)** dapat run paralel dengan Step 1/3 — tidak block UI work.
- **Step 5 (Kanban) + Step 6 (Gantt)** dapat paralel kalau ada 2 dev. Sprint 2 single-dev: sequential, Step 5 dulu (lebih kompleks, drag-drop interaction).

### External dependency tidak ada di Sprint 2

- Tidak butuh Supabase Auth config change.
- Tidak butuh service role key.
- Tidak butuh Cowork agent (Sprint 5).

---

## D. Test strategy

### pgTAP (schema + RLS)

**Existing pattern:** Sprint 1 established TEMP table aggregation di MCP execute_sql.

**Sprint 2 scope:** Step 2 saja (project status lifecycle 6 assertions). No new migration kecuali test reveals bug.

### Unit test (component logic)

**Recommended: Vitest.** Reasons:
- Native Vite integration (zero config setup, share `vite.config.ts`).
- ESM-first, kompatibel dengan TS strict + `@vitejs/plugin-react`.
- Fast (Vite-style HMR).
- API mostly Jest-compatible (familiar).
- Aktif maintained, popular di stack Vite + React + TS.

Alternative: Jest. **Rejected** karena ESM/TS config friction untuk Vite-based project.

**Setup di Step 1 prep:**
```
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

**Coverage target Sprint 2:** filter functions, grouping functions, date formatter (existing `indonesian-format` skill output). Minimal ~15-20 unit tests.

### E2E (Playwright)

**Existing setup di Sprint 1.** Sprint 2 add 2 file baru di `tests/e2e/` (Step 8).

**Pattern:** mirror Sprint 1 — single worker, Chromium headless, deterministic.

**Coverage target Sprint 2:** ~20 assertions (10-12 F3 + 8 F14).

### Manual checkpoint test

**Checkpoint 3 di end of Sprint 2:** owner verify visual + interaction per role (4 user). Mirror pattern Checkpoint 2.

---

## E. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | F3 AC-2 menyebut "notif ke watchers" tapi `task_watchers` + `notifications` table belum exist | High | Medium | Stub notif emission Sprint 2, defer real implementation Sprint 3+. Document explicit di code comment + report. Acceptance criteria partial-match diterima dengan owner approval. |
| **R2** | frappe-gantt v1.x recent rewrite, API breaking dari v0.x community examples | Medium | Medium | Pin v1.2.2 (ADR-003). Source of truth: official repo README, bukan blog post outdated. Step 6 estimate 1.5 hari include buffer untuk API discovery. |
| **R3** | Bundle size bloat — initial JS > 500KB setelah Step 6 (frappe + dnd-kit + view code) | Medium | High (PRD N1 violation) | Calculate after each step. Step 8 verify final via `npm run build` log. Mitigation kalau bloat: code-split Gantt route lazy-load (`React.lazy`). |
| **R4** | frappe-gantt CSS conflict dengan Tailwind utilities (specificity clash) | Medium | Low | Scope frappe styles ke wrapper component dengan `<style scoped>` analog atau CSS Module. Visual audit Step 6. |
| **R5** | dnd-kit drag-drop A11y atau touch event regression | Low | Medium | dnd-kit official Pakai keyboard handlers. Manual A11y test Step 5. |
| **R6** | Optimistic update di Kanban gagal rollback saat RLS error (mis. Member drag task assigned to other) | Low | Medium | RLS Sprint 1 sudah enforce — Member tidak bisa drag task assigned to other (USING fail, 0 rowcount). Catch error in mutation handler, revert optimistic state, toast error per microcopy skill. |
| **R7** | Existing Sprint 1 deliverable regression (auth flow, RLS) | Low | High | Sprint 1 E2E suite + pgTAP suite jadi regression tests. Run full suite di Step 8. |
| **R8** | Filter URL state kompatibilitas dengan Supabase query params (klash) | Low | Low | Namespace filter params dengan prefix `f.` (e.g., `?f.status=todo&f.assignee=...`). |

---

## F. Estimated effort total

| Step | Estimate (hari) |
|---|---|
| 1 — F14 UI status badge + selector | 0.5 |
| 2 — pgTAP RLS audit | 0.5 |
| 3 — Project list page + filter | 1.0 |
| 4 — Task list view + grouping | 1.5 |
| 5 — Kanban view drag-drop | 2.0 |
| 6 — Gantt view (frappe-gantt) | 1.5 |
| 7 — View toggle + URL persist | 0.5 |
| 8 — E2E suite + Checkpoint 3 prep | 1.0 |
| **Total** | **8.5 hari** |

Sprint 2 target window: 1.5-2 minggu kalender (buffer 30-40% untuk discovery + bug fix). Konsisten dengan PRD §11 line 786 "6-8 minggu development total" budget (Sprint 2 = ~2 minggu chunk).

---

## G. Pertanyaan untuk Owner (PRD ambiguity flagged)

Sebelum eksekusi Phase 2, owner perlu klarifikasi 4 hal berikut. JANGAN guess di execution.

### Q1: Kanban kolom — include 'blocked'?

PRD F3 AC-1 line 203 list 4 kolom: **Todo / In Progress / Review / Done**. Schema task CHECK constraint punya 5 enum: `todo, in_progress, review, done, blocked`.

**Decision needed:**
- (a) Kanban 4 kolom (per PRD literal) — task status='blocked' invisible/diluar kanban (where to show?)
- (b) Kanban 5 kolom (extend PRD, include Blocked column)
- (c) Kanban 4 kolom + filter "include blocked" toggle (intermediate)

**Rekomendasi saya:** (b) include Blocked sebagai kolom paling kanan dengan visual urgency (notif tier critical color). Workflow realistis butuh visibility blocker, bukan hidden.

### Q2: F14 status transition rules

PRD §3.1 F14 line 144 hanya list 5 status enum, tidak spec transition rules (e.g., bisa archive directly dari planning, atau wajib lewat completed dulu?).

**Decision needed:**
- (a) Free transition — UI dropdown allow any → any (simple).
- (b) Constrained transition — DB trigger enforce rules (e.g., archived → no transition out, atau hanya admin yang bisa archive).
- (c) UI hint only — frontend disable invalid options, DB allow all (lenient).

**Rekomendasi saya:** (c) untuk pilot — UI guide flow, DB lenient. Add ADR-008 atau ADR di Sprint 3 kalau ada compliance need untuk strict transitions.

### Q3: Notif emission untuk Kanban drag (F3 AC-2)

`task_watchers` + `notifications` table tidak ada di Sprint 1. PRD F3 AC-2 menyebut "notif ke watchers".

**Decision needed:**
- (a) Defer ke Sprint 3+ — Sprint 2 ship Kanban tanpa notif (stub). AC-2 partial-match accepted.
- (b) Tambah `task_watchers` + `notifications` migration di Sprint 2 (scope creep).
- (c) Notif via Supabase Realtime channel only (no persisted notif), defer table sampai Sprint 3.

**Rekomendasi saya:** (a) defer. Sprint 2 fokus 3 view + lifecycle. Notif dependency tabel multiple — better Sprint 3 dedicated step.

### Q4: F11 Search & filter — apa termasuk Sprint 2?

PRD §11 Sprint 2 line 791-793 list F3 + F14. PRD §3.1 F11 (Search & filter) di-mapping ke Sprint 1 line 789 ("Sprint 1: F1, F2, F4, F11, F12 + N1, N3, N4, N7, N8"). Tapi Sprint 1 closed tanpa implement F11 frontend (cuma RLS-level filter via DB query). 

**Decision needed:**
- (a) F11 implementasi UI di Sprint 2 (extend scope — global search bar, saved filter, dst).
- (b) F11 UI tetap defer ke Sprint 3+ — Sprint 2 cuma per-view filter (subset F11.b).
- (c) Sprint 2 ship F11.b only (per-view filter — yang sudah ada di plan Step 3 + Step 4), defer F11.a (global search) + F11.c (saved filter).

**Rekomendasi saya:** (c) — partial F11 yang fit natural di view filter. Global search bar dan saved filter butuh dedicated UI scope.

---

## H. Definition of Done untuk Sprint 2

- [ ] All 8 step shipped + commit + push ke `sprint-2`
- [ ] All pgTAP tests pass (Sprint 1 80 + Sprint 2 ~6 = 86 assertions)
- [ ] All E2E tests pass (Sprint 1 12 + Sprint 2 ~20 = 32 assertions)
- [ ] Bundle size < 500KB gzipped initial JS (PRD N1)
- [ ] No regression Sprint 1 (auth flow, RLS still work)
- [ ] Checkpoint 3 manual test approved oleh owner
- [ ] ADR-003 status verified Accepted + frappe-gantt successfully integrated
- [ ] Sprint 2 retro doc (mirror Sprint 1 retro)
- [ ] Sprint 2 closed, merge `sprint-2` ke main via PR
