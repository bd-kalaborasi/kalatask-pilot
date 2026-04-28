# Sprint 3 Plan — KalaTask Pilot

**Sprint window:** target 1.5-2 minggu kalender (autonomous mode estimate 6-10 jam wall-clock + wrap-up)
**Branch:** `sprint-3` (dari main, commit `ee3902e`)
**Scope locked:** PRD §3.1 F5 + F6 + F8 + F13, plus carry-over Sprint 2 (Q3 notif full + UX rollback pattern)
**ADR baseline:** ADR-001/002/003/004/005/006

---

## A. Scope (locked)

### F5 — Workload View

PRD line 115 + 220-223. **Acceptance criteria:**
1. **AC-1:** Given manager buka workload view, then tampil bar chart: jumlah open task per member di tim mereka.
2. **AC-2:** Given member punya > N open task (N = threshold configurable, default 10), then member di-flag di workload view dengan warning indicator.

### F6 — Bottleneck View

PRD line 116 + 222. **Acceptance criteria:**
3. **AC-3:** Given task dalam status non-final (Todo/In Progress/Review) lebih dari 3 hari tanpa update, then task masuk ke "Bottleneck" tab dengan highlight visual. Threshold X configurable di `app_settings`, default 3 hari.

### F8 — Manager Dashboard

PRD line 122. **No explicit AC list di PRD.** Spec text: "task tim mereka per status, completion rate, overdue count, workload distribution."

**Implicit AC (saya derive dari spec):**
4. **AC-4:** Given manager login, then dashboard tampil: task tim per status (count by status), completion rate (% done), overdue count, workload chart (link ke F5).

### F13 — Productivity & Management Dashboard

PRD line 137-143. **Acceptance criteria:**
5. **AC-5:** Completion rate per user (tasks done / tasks assigned per period dipilih).
6. **AC-6:** Velocity per team (tasks completed per minggu, trend 8 minggu).
7. **AC-7:** On-time delivery rate (% completed on/before deadline).
8. **AC-8:** Average cycle time (rata-rata hari created → done) per project.
9. **AC-9:** Read-only access untuk role Viewer (manajemen).
10. **AC-10:** All metric on-demand SQL query, no cache. Performance < 3 detik untuk 10K task historical (PRD N1).

PRD line 137-143 mention 4 metrics; PRD §13 API spec line 649-651 add **bottleneck_heatmap** (status × age_bucket × count). Treat sebagai bagian F13.

### Carry-over Sprint 2: Q3 Notif Emission FULL

Owner explicit approve full implementation. Scope:
- **task_watchers table** — many-to-many user×task (PRD ERD line 515-518)
- **notifications table** — per-user queue (PRD ERD line 527-535)
- **Auto-add watchers:** assignee + creator + @mentioned users (PRD line 557)
- **Notif emission triggers:**
  - Task assigned: notif ke assignee (normal tier)
  - Task status change to done: notif ke watchers (normal)
  - Task @mentioned di komen: notif ke @user (normal)
  - Deadline H-3 / H-1 / overdue: notif ke assignee (warning/urgent/critical)
- **In-app delivery:** notification badge di header + dropdown list (read/unread state)
- **No external delivery** (PRD §3.3 line 170 — push notif eksternal Slack/WA/Email out of scope pilot)

### Carry-over Sprint 2: UX Rollback Pattern

Toast + revert untuk RLS-rejected write actions. Pattern berlaku:
- Kanban drag (Sprint 2 Step 5 — sudah ada partial)
- Project status update (Sprint 2 Step 1 — sudah ada partial)
- Task status update via List view (Sprint 3 polish)
- Notif mark-as-read (Sprint 3 new)

Konsistensi: 1 helper hook (`useOptimisticMutation`) + Indonesian copy per microcopy skill.

---

## B. Step-by-step breakdown (12 steps)

### Step 1 — Schema migration: `task_watchers` + `notifications` + `app_settings`

**Deliverable:**
- `supabase/migrations/20260428100000_create_task_watchers.sql`
- `supabase/migrations/20260428100100_create_notifications.sql`
- `supabase/migrations/20260428100200_create_app_settings.sql` (untuk F5 N threshold + F6 X day threshold + future config)
- All dengan RLS + GRANT (Sprint 1 lessons applied)

**Schema (per PRD ERD line 515-535):**
- `task_watchers`: composite PK (task_id, user_id), FK both
- `notifications`: id, user_id, type (enum: assigned/mentioned/deadline_h3/deadline_h1/overdue/escalation), task_id, body, is_read, created_at
- `app_settings`: key (PK text), value (jsonb)

**RLS:**
- task_watchers SELECT: follow task RLS visibility
- task_watchers INSERT/DELETE: own user_id only OR admin
- notifications SELECT/UPDATE: own user_id only (PRD line 570)
- notifications INSERT: service_role only (via DB trigger atau Edge Function — TBD Step 3)
- app_settings SELECT: authenticated all
- app_settings UPDATE: admin only

**Acceptance criteria:**
- Migration applies cleanly via Dashboard (no FK violation)
- RLS enforce per ADR-002 spec

**Test strategy:** pgTAP file `task_watchers_rls.test.sql` + `notifications_rls.test.sql` ditulis di Step 2.

**Commit:** `feat(db): add task_watchers + notifications + app_settings tables`
**Estimate:** 0.5 hari (~30 menit autonomous)

---

### Step 2 — pgTAP coverage untuk task_watchers + notifications RLS

**Deliverable:**
- `supabase/tests/task_watchers_rls.test.sql` (~8 assertions covering 4 role × CRUD)
- `supabase/tests/notifications_rls.test.sql` (~8 assertions covering self-only access pattern)

**Acceptance criteria:**
- Each test file `1..N` plan + N `ok` lines (assuming run via Supabase CLI — see Test Strategy Section D)
- Cover: anon blocked, member self-only, admin/viewer scope, INSERT/SELECT/UPDATE/DELETE per role

**Test strategy:** see Section D. **pgTAP execution path TBD** — defer Supabase CLI setup decision ke Step 1 prep, atau document sebagai limitation per Sprint 2 lesson.

**Commit:** `test(db): add pgTAP coverage for task_watchers + notifications RLS`
**Estimate:** 0.5 hari

---

### Step 3 — Notif emission engine

**Deliverable:**
- DB triggers untuk emit notif rows pada events:
  - `tasks_after_insert_emit_assigned_notif` (kalau assignee_id NOT NULL)
  - `tasks_after_update_status_emit_done_notif` (kalau status berubah ke 'done')
  - `tasks_after_update_assignee_emit_reassigned_notif`
  - `comments_after_insert_emit_mention_notif` (parse @username dari body — defer ke Sprint 4 kalau complex)
- Auto-watcher trigger: `tasks_after_insert_auto_watch` (assignee + creator)
- Realtime broadcast Supabase channel optional (Sprint 4) — Sprint 3 cukup polling refetch

**Decision point dalam step:**
- DB trigger (server-side, automatic) ✅ recommended
- Edge Function (manual emit dari app) — out of scope pilot per ADR-001 free-tier philosophy

**Acceptance criteria:**
- INSERT task dengan assignee → notif row created untuk assignee
- UPDATE task status to 'done' → notif row(s) created untuk all watchers
- INSERT task → assignee + creator auto-added ke task_watchers

**Test strategy:** pgTAP — INSERT task, assert notif row exist, watchers row exist. ~6 assertions.

**Commit:** `feat(db): notif emission triggers + auto-watcher (Q3 carry-over)`
**Estimate:** 1 hari

---

### Step 4 — UI notif badge + dropdown

**Deliverable:**
- `apps/web/src/components/notifications/NotificationBadge.tsx` — count unread di header
- `apps/web/src/components/notifications/NotificationDropdown.tsx` — list 10 latest notif
- `apps/web/src/hooks/useNotifications.ts` — fetch + mark-as-read + polling 30s
- `apps/web/src/lib/notifications.ts` — types + API client
- AppHeader integrasi badge

**Acceptance criteria:**
- Badge tampil count unread (visible saat > 0)
- Click → dropdown list 10 notif terbaru
- Click notif → mark-as-read + navigate ke task detail
- Polling 30 detik refresh (Sprint 4: upgrade ke Realtime subscribe)

**Test strategy:**
- Vitest unit untuk type parser + count calculation
- Playwright E2E: login, INSERT task via API (admin), verify badge increment

**Commit:** `feat(web): notification badge + dropdown (PRD F7)`
**Estimate:** 1 hari

---

### Step 5 — ADR-004 implementation: productivity + workload RPC

**Deliverable:**
- `supabase/migrations/20260428110000_add_productivity_rpc.sql` — function `public.get_productivity_metrics(p_team_id uuid, p_period_days int)` returning JSONB
- `supabase/migrations/20260428110100_add_workload_rpc.sql` — function `public.get_workload_summary(p_team_id uuid)` returning JSONB
- GRANT EXECUTE TO authenticated (admin/manager/viewer auto-scope via underlying RLS, member call → empty result via RLS)
- pgTAP coverage `productivity_rpc.test.sql` (~12 assertions: 5 metrics × 2 fixture variations + 2 RLS edge case)

**Acceptance criteria:**
- RPC accept params, return JSONB shape match PRD §13 line 636-653
- Manager call → scoped ke own team
- Viewer + Admin call → scope `all` allowed
- Member call → empty result (RLS implicit deny)
- Performance: query plan EXPLAIN ANALYZE < 200 ms untuk 1K task fixture

**Test strategy:** pgTAP RLS + correctness assertions; Vitest untuk client wrapper response parser.

**Commit:** `feat(db): productivity + workload RPC functions (ADR-004 implementation)`
**Estimate:** 1.5 hari

---

### Step 6 — F8 Manager Dashboard scaffold

**Deliverable:**
- `apps/web/src/pages/ManagerDashboardPage.tsx` — route `/dashboard/manager`
- 4 metric tile: task per status (donut), completion rate %, overdue count, workload chart link
- Permission guard: visible untuk role manager + admin only
- Wire ke `get_productivity_metrics` RPC (filter scope team)

**Acceptance criteria (F8 implicit AC-4):**
- Manager login → see own team metrics
- Admin login → see select team dropdown to switch scope
- Member/Viewer login → page redirect 403 / hidden link

**Test strategy:**
- Vitest unit untuk metric tile data transform
- Playwright E2E: login per role, verify dashboard render / 403 redirect

**Commit:** `feat(web): F8 manager dashboard scaffold`
**Estimate:** 1 hari

---

### Step 7 — F13 Productivity Dashboard (4 metrics + heatmap)

**Deliverable:**
- `apps/web/src/pages/ProductivityDashboardPage.tsx` — route `/dashboard/productivity`
- 5 chart components:
  - `<CompletionRateBar />` — bar chart per user
  - `<VelocityLine />` — line chart 8 minggu
  - `<OnTimeDeliveryGauge />` — single % indicator
  - `<CycleTimeTable />` — table per project dengan rata-rata
  - `<BottleneckHeatmap />` — grid status × age_bucket
- Period filter (default 30 hari, dropdown 7/30/90/all)
- Permission guard: viewer + admin (PRD F13 AC-9)

**Decision point: chart library**
- **Recharts** (~80 KB gzipped, MIT, React-friendly) ✅ recommended
- **Chart.js** (~50 KB gzipped, MIT, more imperative)
- Both pre-checkpoint; install di Step 7 setelah ADR-004 implementation work.

**Acceptance criteria (F13 AC-5 to AC-10):**
- All 5 chart render dengan real RPC data
- Period filter ubah scope query
- Performance: page load < 3 detik untuk 1K task fixture (extrapolate 10K)
- RLS: Viewer + Admin only

**Test strategy:**
- Vitest unit untuk chart data transform
- Playwright E2E: viewer login → see all metrics; admin → same; manager → 403 OR scoped view; member → 403

**Commit:** `feat(web): F13 productivity dashboard 5 charts + period filter`
**Estimate:** 2 hari

---

### Step 8 — F5 Workload View

**Deliverable:**
- `apps/web/src/pages/WorkloadPage.tsx` — route `/workload`
- Bar chart: open task count per member di team (manager) / cross-team (admin)
- Warning indicator untuk member > N open task (N from `app_settings`, default 10)
- Wire ke `get_workload_summary` RPC

**Acceptance criteria (F5 AC-1 + AC-2):**
- Manager: own team only
- Admin: cross-team picker
- Indicator threshold from app_settings (configurable, fallback 10)

**Test strategy:**
- Vitest unit untuk threshold flag logic
- Playwright E2E: viewer 403, manager scope, admin cross-team

**Commit:** `feat(web): F5 workload view dengan threshold indicator`
**Estimate:** 1 hari

---

### Step 9 — F6 Bottleneck View

**Deliverable:**
- `apps/web/src/pages/BottleneckPage.tsx` — route `/bottleneck`
- Tab/section list task stuck > X hari di status non-final
- X dari `app_settings`, default 3 hari (key `bottleneck_threshold_days`)
- Visual highlight (red border atau notif tier critical color)
- Filter by status, assignee

**Decision: bagaimana measure "stuck"?**
- Option A: `now - tasks.updated_at` (last update)
- Option B: `now - last status change event di activity_log` (more accurate, requires activity_log table)
- Option C: `now - tasks.created_at` (simplest, less accurate untuk tasks yang aktif tapi tidak status-change)

**Sprint 3 default:** Option A (`updated_at`) — paling simple, tidak butuh activity_log. Activity_log out of scope pilot Sprint 1+2.

**Acceptance criteria (F6 AC-3):**
- Task `updated_at < now - X days` AND `status IN (todo, in_progress, review)` → masuk bottleneck list
- X configurable via `app_settings.bottleneck_threshold_days`

**Test strategy:**
- Vitest pure function `isBottleneck(task, thresholdDays)`
- Playwright E2E: manager+admin lihat list, viewer read-only

**Commit:** `feat(web): F6 bottleneck view dengan configurable threshold`
**Estimate:** 1 hari

---

### Step 10 — UX Rollback Pattern (cross-cutting)

**Deliverable:**
- `apps/web/src/hooks/useOptimisticMutation.ts` — generic helper for optimistic update + rollback on error + toast
- Refactor existing optimistic locations:
  - Kanban drag (Sprint 2 Step 5)
  - Project status update (Sprint 2 Step 1)
  - Notif mark-as-read (Sprint 3 Step 4)
- Toast component shadcn-style atau custom

**Acceptance criteria:**
- Setiap optimistic write yang gagal RLS → revert local state + show toast Indonesian (per microcopy skill)
- Pattern konsisten across 3+ write actions

**Test strategy:**
- Vitest hook test (mock supabase client error response)
- Playwright E2E: simulate RLS reject (member drag other-assignee task) → expect toast + revert

**Commit:** `feat(web): unified optimistic mutation rollback pattern (UX consistency)`
**Estimate:** 0.75 hari

---

### Step 11 — Cumulative test (regression + new E2E)

**Deliverable:**
- New E2E specs:
  - `apps/web/tests/e2e/notifications.spec.ts` (~6 tests)
  - `apps/web/tests/e2e/productivity.spec.ts` (~8 tests)
  - `apps/web/tests/e2e/workload-bottleneck.spec.ts` (~6 tests)
- Run full E2E suite — verify Sprint 1+2 12+42=54 + Sprint 3 ~20 = ~74 total
- pgTAP cumulative — verify Sprint 1+2 86 still pass + Sprint 3 ~30 = ~116 (target Supabase CLI execution)

**Acceptance criteria:**
- All cumulative E2E pass
- No Sprint 1/2 regression detected
- Bundle size < 500 KB gzipped (chart library + new pages should fit budget)

**Test strategy:** mirror Sprint 2 Step 8 pattern.

**Commit:** `test(e2e): Sprint 3 F5+F6+F8+F13+notif verification + regression`
**Estimate:** 1 hari

---

### Step 12 — Sprint 3 retro + Checkpoint 4 prep

**Deliverable:**
- `docs/sprint-3-retro.md` (mirror Sprint 1+2 format)
- `docs/sprint-3-checkpoint-4-instructions.md` (manual test scenarios untuk owner BD)
- Final signoff doc kalau perlu (mirror Sprint 2 honest disclosure pattern)

**Acceptance criteria:**
- Retro complete: summary, what-went-well, what-went-wrong, lessons, metrics, open issues
- Checkpoint 4 manual scenarios per role × major flow

**Commit:** `docs(retro): Sprint 3 retrospective + checkpoint 4 prep`
**Estimate:** 0.5 hari

---

## C. Dependencies & ordering

### Sequential blocking chain

```
Step 1 (schema)
  → Step 2 (RLS test)
  → Step 3 (notif emission triggers)
  → Step 4 (UI notif badge — needs Step 3 emission)
  → Step 5 (RPC functions — independent dari notif)
  → Step 6 + Step 7 (dashboards — need Step 5 RPC)
  → Step 8 (F5 — needs Step 5 workload RPC)
  → Step 9 (F6 — independent, just app_settings + tasks)
  → Step 10 (cross-cutting — refactor existing + new UX, do after most pages exist)
  → Step 11 (cumulative test)
  → Step 12 (retro)
```

### Parallelizable

- **Step 1 (schema) + Step 5 (RPC migration)** dapat paralel kalau direct path simple — keduanya schema additive
- **Step 6 + Step 7 + Step 8 + Step 9** (4 dashboard pages) dapat paralel kalau 2 dev. Sprint 3 single-dev: sequential, prioritize F8 (most user-facing) → F13 (highest scope) → F5 → F6
- **Step 10 (UX rollback)** can be partial Step 5+ (refactor old) + Step 4 (apply baru notif mark-read)

### External dependency

- Supabase CLI lokal setup (untuk pgTAP run) — owner action atau prep di Step 1
- Chart library decision — finalize di Step 7 prep (Recharts default)

---

## D. Test strategy

### pgTAP execution infrastructure decision

**Per Sprint 2 final signoff Limitation 2:** Dashboard SQL Editor tidak ideal untuk pgTAP. 3 environmental bugs ditemukan (UUID conflict fixed, output truncation env, array_agg NULL env).

**Options Sprint 3:**

| Approach | Setup effort | Reliability |
|---|---|---|
| **(a) Supabase CLI lokal** + `supabase test db` | 30-60 menit (install + link + first run) | High — native pgTAP support, full TAP output |
| (b) MCP execute_sql aggregation pattern | 0 menit (sudah established Sprint 1) | Medium — depend on MCP read_only=false toggle + session refresh |
| (c) Defer pgTAP execution Sprint 4+ | 0 menit | Low — accumulate untested test files |

**Recommendation: (a) Supabase CLI lokal** — invest 1 jam Step 1 prep untuk reliable infrastructure across Sprint 3+ . Fallback (b) kalau CLI conflict.

**Action:** flag sebagai Step 1 prep activity — owner approve install Supabase CLI atau proceed dengan (b)/(c).

### Vitest unit (continued from Sprint 2)

- 73 unit baseline → Sprint 3 add ~20-30 (chart data transform, threshold logic, notif parser)
- Pattern: pure function tests, no DB mock

### Playwright E2E (continued)

- 54 baseline → Sprint 3 add ~20 (notif, productivity, workload, bottleneck specs)
- Pattern: idempotent login (Sprint 2 Checkpoint 3 fix established), data-agnostic where possible

### Manual checkpoint (Checkpoint 4)

- BD owner verify per role × major flow
- Format mirror Checkpoint 3 (Sprint 2 9 scenarios)

---

## E. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | Bundle size > 500KB dengan chart library | Medium | High (PRD N1 violation) | Lazy-load dashboard route via React.lazy (pattern Sprint 2 Gantt). Chart library ~80KB gzipped, fit budget. Verify Step 11 build. |
| **R2** | Query performance > 3 detik untuk 10K task projection | Low | High | Sprint 3 fixture max ~hundreds task. Extrapolate via pgTAP `EXPLAIN ANALYZE` plan + Postgres benchmark public docs. Defer 10K load test ke Sprint 4 kalau perlu. |
| **R3** | Notif race condition (multi-user simultaneous update) | Medium | Medium | DB trigger SERIALIZABLE-ish (single Postgres transaction). UI mark-as-read idempotent (UPDATE WHERE is_read=false). Toast revert kalau race detected (UX rollback pattern). |
| **R4** | UX rollback inconsistent across 3+ write actions | Medium | Medium | Step 10 generic hook `useOptimisticMutation` enforce single pattern. Refactor existing locations. Test via Playwright. |
| **R5** | pgTAP execution still blocked Sprint 3 | High (carry from Sprint 2) | Medium | Step 1 prep: setup Supabase CLI lokal. Fallback document limitation di sign-off (mirror Sprint 2 disclosure). |
| **R6** | F8 vs F13 scope overlap (both have completion rate, overdue, workload) | Medium | Low | F8 = team-scoped quick view (Manager primary); F13 = full metric panel (Viewer + Admin primary). Document at scope: F8 reuse `get_productivity_metrics` RPC dengan filter team-scope. |
| **R7** | activity_log table absent → F6 bottleneck measurement uses `updated_at` (less accurate) | Low | Low | Documented Step 9 decision Option A. Sprint 4+ kalau butuh accurate bottleneck → add activity_log + RLS. |
| **R8** | Notif spam — every task update emit notif → user overwhelm | Medium | Medium | Limit notif emission: only assigned, status=done transition, @mention, deadline tier. NOT every field update. Document trigger filter di Step 3. |
| **R9** | @mention parsing complexity (PRD F11) | Medium | Low | Defer @mention parsing ke Sprint 4 — Step 3 cover assigned/done/deadline tier only. Document carry-over. |
| **R10** | Sprint 1+2 regression dari schema migrations Step 1 | Low | High | All schema additive (new tables, no ALTER existing). Step 11 run full Sprint 1+2 E2E + pgTAP regression. |

---

## F. Estimated effort total

| Step | Estimate (hari) |
|---|---|
| 1 — Schema migration (3 tables + RLS + GRANT) | 0.5 |
| 2 — pgTAP coverage RLS | 0.5 |
| 3 — Notif emission engine (DB triggers) | 1.0 |
| 4 — UI notif badge + dropdown | 1.0 |
| 5 — ADR-004 RPC implementation | 1.5 |
| 6 — F8 Manager dashboard scaffold | 1.0 |
| 7 — F13 Productivity dashboard 5 charts | 2.0 |
| 8 — F5 Workload view | 1.0 |
| 9 — F6 Bottleneck view | 1.0 |
| 10 — UX rollback pattern unified | 0.75 |
| 11 — Cumulative test + regression | 1.0 |
| 12 — Sprint 3 retro + Checkpoint 4 | 0.5 |
| **Total** | **11.75 hari** (single dev) |

Sprint 3 target window: 2-2.5 minggu kalender (buffer 30% untuk discovery + bug fix). Per CLAUDE.md velocity Sprint 2 actual ~3.5 jam wall-clock dari 8.5 hari plan = 95% optimization. Sprint 3 12 step expect ~6-10 jam wall-clock + 1-2 jam wrap-up.

---

## G. Pertanyaan untuk Owner (PRD ambiguity)

Sebelum eksekusi Phase 2, owner perlu klarifikasi 6 hal. JANGAN guess di execution.

### Q1: F8 Manager Dashboard — explicit vs derived AC

PRD line 122 only spec narrative ("task tim mereka per status, completion rate, overdue count, workload distribution") — no explicit AC list. F13 cover overlapping metrics. Confusion: apakah F8 adalah subset team-scoped F13, atau separate page?

**Decision needed:**
- (a) F8 = team-scoped redirect ke F13 (single page, scope filter via permission)
- (b) F8 = separate quick-view page dengan 4 tile manager (workload chart embed)
- (c) F8 deprecated, fold ke F13 (since F13 cover same metrics)

**Rekomendasi saya:** (b) — Manager landing page dengan 4 quick tile + link ke F13 detail + F5 workload. Better daily UX.

### Q2: F6 Bottleneck — measure "stuck" via `updated_at` atau activity_log?

`activity_log` table out of scope Sprint 1+2. Defer ke Sprint 4? Sprint 3 Option A pakai `updated_at` (less accurate tapi simple).

**Decision needed:**
- (a) Sprint 3 pakai `updated_at` — defer activity_log ke Sprint 4 untuk accurate bottleneck
- (b) Sprint 3 add activity_log table + emission triggers (scope creep)
- (c) Hybrid — Sprint 3 pakai `updated_at` + Sprint 4 migrate ke activity_log

**Rekomendasi saya:** (a) — pragmatic, low complexity. Document bottleneck "near-real" measurement caveat.

### Q3: Notif scope Sprint 3 — full atau partial?

Owner approved "Q3 Notif emission FULL" — tapi @mention parsing kompleks. Sprint 3 implement:
- Assigned ✅
- Status change to done ✅
- Deadline H-3 / H-1 / overdue ✅ (butuh scheduled job — Sprint 5 scope kalau Edge Function)
- @mention ❓ — parsing markdown body, fuzzy match user

**Decision needed:**
- (a) Sprint 3 full notif scope semua trigger termasuk @mention parsing
- (b) Sprint 3 cover assigned + status=done + deadline tier; @mention defer Sprint 4
- (c) Skip deadline tier juga — defer ke Sprint 4 (butuh pg_cron atau Edge Function scheduled)

**Rekomendasi saya:** (b) — assigned + status=done + deadline tier (via pg_cron lokal atau Sprint 4 Edge Function). @mention parsing complex enough to warrant own Sprint 4 step.

### Q4: F5 workload threshold N — default 10, configurable di mana?

PRD line 223 "N threshold configurable, default 10". Storage:
- (a) `app_settings` table key `workload_overloaded_threshold` (admin updateable via UI)
- (b) Hardcoded di app constant (admin update via PR — dev-only)
- (c) Per-team configurable (workload threshold beda per team)

**Rekomendasi saya:** (a) — `app_settings` table consistent dengan F6 bottleneck threshold pattern. Admin UI di Sprint 5+ (out of scope Sprint 3).

### Q5: Chart library — Recharts vs Chart.js

Both pre-approved category (chart library). Bundle size: Recharts ~80KB gzipped, Chart.js ~50KB gzipped. Recharts more declarative React-style; Chart.js more imperative.

**Rekomendasi saya:** **Recharts** — better React DX, declarative composition, handles SSR + responsive naturally. 30KB extra acceptable.

### Q6: pgTAP execution Sprint 3 path

**Per Sprint 2 lesson:** Dashboard SQL Editor tidak ideal. Options:
- (a) Setup Supabase CLI lokal Step 1 prep (~30-60 menit owner action)
- (b) MCP execute_sql aggregation (Sprint 1 pattern, depend on MCP toggle)
- (c) Defer pgTAP execution ke Sprint 4 (accumulate untested test files)

**Rekomendasi saya:** (a) — invest 1 jam infrastructure setup, payoff across Sprint 3+ pgTAP runs.

---

## H. Definition of Done untuk Sprint 3

- [ ] All 12 step shipped + commit + push ke `sprint-3`
- [ ] All pgTAP tests pass (Sprint 1+2 86 + Sprint 3 ~30 = ~116 cumulative)
- [ ] All E2E tests pass (Sprint 1+2 54 + Sprint 3 ~20 = ~74)
- [ ] All Vitest unit pass (Sprint 2 73 + Sprint 3 ~30 = ~103)
- [ ] Bundle size < 500KB gzipped initial (PRD N1)
- [ ] No regression Sprint 1+2 (auth flow, RLS, view toggle, F14)
- [ ] Checkpoint 4 manual test approved oleh owner
- [ ] ADR-004 RPC functions deployed + verified
- [ ] Notif badge + dropdown functional + manual verified per role
- [ ] Productivity dashboard render real RPC data per role permission
- [ ] Workload + Bottleneck view threshold from app_settings
- [ ] UX rollback pattern unified across 3+ write actions
- [ ] Sprint 3 retro doc + Checkpoint 4 instructions ready
- [ ] Sprint 3 closed, merge `sprint-3` ke main via PR
