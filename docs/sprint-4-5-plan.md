# Sprint 4.5 Plan — KalaTask Pilot (Comments + @mention + Notification Throttling)

**Sprint window:** target 1-2 minggu kalender (autonomous mode estimate 2-3 jam wall-clock + wrap-up)
**Branch:** `sprint-4-5` (dari main, post Sprint 5 plan-defer merge)
**Scope locked:** Collaboration depth — Comments thread + @mention + Task detail page + Notification throttling
**ADR baseline:** ADR-001/002/003/004/005/006/007/008
**Trigger:** Research finding (high confidence, 26 sources) — Comments + @mention adoption-critical (Recommendation #1, #2)

---

## A. Scope (locked)

### A1 — Comments thread per task (flat, no threading)

**Why now:** Research conclusively says collaboration depth = adoption killer #1. WhatsApp revert risk kalau task tool tidak punya comments.

**Decisions per research:**
- Plain text + Markdown rendering (NO rich-text editor — over-engineered untuk pilot)
- Flat list (NO nested threading — Phase 2 upgrade kalau owner butuh)
- Realtime via Supabase broadcast (per ADR-008)
- Pagination batch 50 oldest-first

**Acceptance criteria:**
1. **AC-1:** Given user open task detail, when render comments, then tampil daftar comment chronological + paginate setelah 50.
2. **AC-2:** Given user post comment, when commit, then comment muncul instant di sender (optimistic) + < 1s di receiver lain (Realtime).
3. **AC-3:** Comments support Markdown — `**bold**`, `*italic*`, `[link](url)`, code fence, lists. NO HTML render (XSS-safe).
4. **AC-4:** Author dapat edit/delete own comment (per Q1).
5. **AC-5:** Empty state Indonesian friendly: "Belum ada komen di task ini. Yuk, mulai diskusi 💬".

### A2 — @mention parsing + notification emission

**Why now:** @mention = primary collaboration signal. Without it, comments thread = monolog.

**Decisions per research:**
- @username pattern matched ke `users.email` prefix atau `users.full_name` (Q2 owner clarify)
- Multi-mention OK dalam 1 comment
- Auto-emit notif type='mentioned' (existing Sprint 3 enum) ke mentioned user
- Auto-add mentioned user ke `task_watchers` (subscriber relationship)

**Acceptance criteria:**
6. **AC-6:** Given comment body contains `@email-prefix` matching `users.email`, when post, then notif emit ke matched user.
7. **AC-7:** Given multi-mention `@andi @sari` di 1 comment, when post, then 2 notif emitted (1 per user).
8. **AC-8:** Mentioned user auto-added ke task_watchers (kalau belum subscribed).
9. **AC-9:** @mention input has autocomplete dropdown — type `@`, dropdown shows matching users.

### A3 — Task detail page

**Why now:** Currently no dedicated task detail route. Comments thread butuh container.

**Decisions:**
- Route: `/projects/:projectId/tasks/:taskId`
- Display: title, description, status, priority, assignee, deadline, comments thread
- Edit field per existing RLS (Sprint 1 field-lock for Member)
- Empty state untuk comments

**Acceptance criteria:**
10. **AC-10:** Click task title di ListView/KanbanView/GanttView → navigate ke task detail page.
11. **AC-11:** Member dapat edit status + description (existing field-lock); Manager+Admin dapat edit semua field per RLS.
12. **AC-12:** Browser back button restore previous list view + filter state (URL preservation).

### A4 — Notification throttling (Recommendation #2)

**Why now:** Research says notif spam adalah adoption killer #2. Throttling = retention factor.

**Decisions per research:**
- Hard limit: max 5 notif per user per jam
- Overflow → bundle ke single "digest" notif type='digest' yang muncul max 1× per hari
- Threshold configurable via `app_settings` (Q4 Sprint 3 pattern reuse)

**Acceptance criteria:**
13. **AC-13:** Notification emission engine (Sprint 3) check rolling 1-hour window per user. Kalau already 5 notif emitted dalam window, skip + queue ke digest.
14. **AC-14:** Daily 09:00 cron (atau on-demand trigger) flush digest queue ke single notif "5 update kemarin yang lewat — buka semua".
15. **AC-15:** Threshold di `app_settings.notif_max_per_hour` (default 5) configurable admin.

---

## B. Step-by-step breakdown (10 steps)

### Step 1 — Schema migration: comments table + RLS

**Deliverable:**
- `supabase/migrations/<ts>_create_comments_table.sql`:
  - `CREATE TABLE comments (id, task_id FK, author_id FK, body text, is_system bool, created_at, updated_at)`
  - RLS: SELECT mengikuti task parent visibility; INSERT/UPDATE/DELETE own comment + admin override
  - Index: `(task_id, created_at)` untuk paginated fetch
  - GRANT authenticated SELECT/INSERT/UPDATE/DELETE
- Realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE public.comments`
- Notifications already supports type='mentioned' (Sprint 3 schema) — no change needed.

**Acceptance criteria:**
- Migration applies via `npx supabase db push` autonomous
- Existing Sprint 1-4 tables not affected (additive only)

**Test strategy:** pgTAP `comments_rls.test.sql` (~8 assertions Step 2).

**Commit:** `feat(db): comments table + RLS + realtime publication`
**Estimate:** 0.5 hari

---

### Step 2 — pgTAP coverage comments RLS

**Deliverable:**
- `supabase/tests/comments_rls.test.sql` (~8 assertions):
  - Comments SELECT mengikuti task parent visibility (Member/Manager/Admin/Viewer matrix)
  - Member INSERT comment di own task ✓
  - Member INSERT comment di others' task ✗
  - Member UPDATE own comment ✓
  - Member UPDATE others' comment ✗
  - Member DELETE own comment ✓
  - Admin DELETE any comment ✓
  - Realtime publication includes comments table

**Commit:** `test(db): pgTAP coverage comments RLS (8 assertions)`
**Estimate:** 0.5 hari

---

### Step 3 — `post_comment` RPC + @mention parser server-side

**Deliverable:**
- `supabase/migrations/<ts>_add_post_comment_rpc.sql`:
  - `post_comment(p_task_id uuid, p_body text) RETURNS uuid` (comment_id)
  - SECURITY INVOKER
  - Validates: body trim non-empty + max 2000 char + task accessible to caller (RLS-checked)
  - Parse @mentions: regex `@([a-zA-Z0-9._-]+)` → match `users.email` prefix
  - Emit notif type='mentioned' per matched user (call existing Sprint 3 emit_notification function)
  - Add mentioned users ke task_watchers (idempotent ON CONFLICT)
  - Apply throttling check (Step 8 logic)
- pgTAP `post_comment_rpc.test.sql` (~6 assertions): RLS, @mention emit, multi-mention, watcher add, body validation

**Commit:** `feat(db): post_comment RPC + @mention parser + notif emission`
**Estimate:** 1 hari

---

### Step 4 — Notification throttling enhancement (Sprint 3 engine)

**Deliverable:**
- `supabase/migrations/<ts>_add_notif_throttling.sql`:
  - INSERT `app_settings ('notif_max_per_hour', 5)` default
  - Modify `emit_notification` (Sprint 3) function — wrap with throttling check:
    - Count notif WHERE user_id=p AND created_at > now() - interval '1 hour'
    - Kalau >= limit: skip emit + INSERT ke `notification_digest_queue` table
  - New `notification_digest_queue` table — buffer overflow notifs untuk digest flush
  - Daily flush function `flush_notification_digest()` — bundle queue → single 'digest' notif. CRON deferred (pg_cron not enabled), manual trigger via admin UI atau owner Dashboard.
- pgTAP `notif_throttling.test.sql` (~5 assertions): threshold respect, digest queue insert, digest flush logic

**Commit:** `feat(db): notification throttling + digest queue + flush function`
**Estimate:** 0.75 hari

---

### Step 5 — Comments client lib + Realtime hook

**Deliverable:**
- `apps/web/src/lib/comments.ts`:
  - `fetchComments(taskId, { limit, offset })` — paginated fetch
  - `postComment(taskId, body)` — wraps RPC + optimistic state hint
  - `updateComment(commentId, body)` + `deleteComment(commentId)`
  - `parseMentions(body): string[]` — client-side preview (mirror server regex)
- `apps/web/src/hooks/useTaskCommentsRealtime.ts`:
  - Per ADR-008 channel design
  - Subscribe `task:${taskId}` channel; cleanup on unmount
  - Optimistic INSERT + Realtime echo dedupe via `id`
- Vitest `comments.test.ts` (~8 assertions): parseMentions edge cases, paginate offset
- Vitest `useTaskCommentsRealtime.test.ts` (~3 assertions): subscribe/unsubscribe lifecycle

**Commit:** `feat(web): comments lib + Realtime hook`
**Estimate:** 1 hari

---

### Step 6 — Task detail page + route

**Deliverable:**
- `apps/web/src/pages/TaskDetailPage.tsx` route `/projects/:projectId/tasks/:taskId`:
  - Header: task title (editable per role), status badge, priority badge
  - Body: description (editable per role), assignee, deadline
  - Comments section: thread component + composer
  - Loading + error states
  - Back button: navigate ke `/projects/:projectId` with prior filter state
- App.tsx route registration + lazy load
- Update ListView / KanbanView / GanttView card click → navigate ke task detail

**Commit:** `feat(web): task detail page + route + view click navigation`
**Estimate:** 1 hari

---

### Step 7 — Comments thread UI + @mention autocomplete

**Deliverable:**
- `apps/web/src/components/comments/CommentsThread.tsx` — list of CommentItem + composer
- `apps/web/src/components/comments/CommentItem.tsx` — author + timestamp + Markdown-rendered body + edit/delete (own only)
- `apps/web/src/components/comments/CommentComposer.tsx` — textarea + @mention autocomplete dropdown
- `apps/web/src/components/comments/MentionAutocomplete.tsx` — popup positioned, fetch users on `@` trigger
- Markdown render: lib choice — `react-markdown` (Q7 owner) atau implement minimal subset hand-rolled
- `EmptyState` reuse untuk "Belum ada komen di task ini"
- BRAND.md microcopy applied

**Commit:** `feat(web): comments thread UI + @mention autocomplete + markdown render`
**Estimate:** 1.25 hari

---

### Step 8 — useNotificationsRealtime + replace polling

**Deliverable:**
- `apps/web/src/hooks/useNotificationsRealtime.ts` per ADR-008
- Update `useNotifications.ts` (Sprint 3) — switch dari 30s polling ke Realtime subscription dengan polling fallback (kalau channel disconnect)
- NotificationDropdown badge update real-time
- Vitest `useNotificationsRealtime.test.ts` (~3 assertions)

**Commit:** `feat(web): notifications Realtime subscription + polling fallback`
**Estimate:** 0.5 hari

---

### Step 9 — E2E + cumulative tests

**Deliverable:**
- `apps/web/tests/e2e/sprint-4-5-comments.spec.ts` (~6 specs):
  - Open task detail → comments empty state visible
  - Post comment → optimistic render + persist
  - Edit own comment
  - Delete own comment
  - Member cannot edit others' comment (button hidden)
  - Comment back nav restore filter URL
- `apps/web/tests/e2e/sprint-4-5-mention.spec.ts` (~3 specs):
  - Type `@` in composer → autocomplete dropdown
  - Post comment with @mention → mentioned user receives notif (verify via API direct or 2nd browser context)
  - Multi-mention → 2 notifs
- Verify cumulative: 94 (Sprint 1-4) + 9 = 103 E2E specs collected
- Vitest cumulative: ~165 unit
- pgTAP cumulative: ~141 assertions

**Commit:** `test(e2e): Sprint 4.5 comments + mention scenarios`
**Estimate:** 0.75 hari

---

### Step 10 — Sprint 4.5 retro + verification + PR

**Deliverable:**
- `docs/sprint-4-5-retro.md` (mirror Sprint 4 format)
- `docs/sprint-4-5-checkpoint-6-instructions.md`
- Verification automation per Sprint 4 pattern (full Playwright + Lighthouse + screenshots)
- `docs/sprint-4-5-verification-report.md`
- PR `sprint-4-5 → main` via gh CLI

**Commit:** `docs(retro): Sprint 4.5 retrospective + verification report`
**Estimate:** 0.5 hari

---

## C. Dependencies & ordering

```
Step 1 (schema + realtime publication)
  → Step 2 (pgTAP RLS)
  → Step 3 (post_comment RPC)
    → Step 4 (notif throttling — depends Sprint 3 engine)
      → Step 5 (client lib + Realtime hook)
        → Step 6 (task detail page)
          → Step 7 (comments UI)
            → Step 8 (notif Realtime swap)
              → Step 9 (E2E)
                → Step 10 (retro + PR)
```

Parallelizable (single-dev sequential): Step 4 dapat parallel dengan Step 3 kalau ada 2 dev.

---

## D. Test strategy

### pgTAP
- Step 2: comments RLS (~8 assertions)
- Step 3: post_comment RPC (~6 assertions)
- Step 4: notif throttling (~5 assertions)
- Cumulative: 122 (Sprint 1-4) + 19 (Sprint 4.5) = **~141**

### Vitest unit
- Step 5: comments lib + parseMentions (~8) + Realtime hook lifecycle (~3)
- Step 8: notif Realtime hook (~3)
- Cumulative: 127 (Sprint 1-4) + ~14 (Sprint 4.5) = **~141**

### Playwright E2E
- Step 9: comments 6 + mention 3 = 9
- Cumulative: 94 (Sprint 1-4) + 9 (Sprint 4.5) = **103**

### Verification (Step 10)
- Mirror Sprint 4: full Playwright + Lighthouse + screenshots + report

---

## E. Risk register (top 8)

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | Realtime subscription memory leak (subscribe without cleanup) | Medium | High | useEffect cleanup mandatory; ESLint exhaustive-deps; Step 5/8 Vitest lifecycle test |
| **R2** | XSS via Markdown render (HTML injection) | Medium | High | Use `react-markdown` (sanitized by default) atau allowlist subset; NEVER `dangerouslySetInnerHTML` raw |
| **R3** | @mention regex false positive (e.g., `@2026` di body) | Low | Low | Regex `@([a-z0-9._-]+)` strict alphanumeric prefix; lookup match wajib (no notif kalau tidak match) |
| **R4** | Notification throttling cap kasih bad UX (legit critical notif di-skip) | Medium | Medium | Default cap 5/hour configurable; admin tweak via app_settings; digest flush 1×/hari ensure no permanent loss |
| **R5** | Sprint 1-4 regression dari schema migration Step 1 | Low | High | Comments table additive only; existing tables not touched. Step 9 cumulative regression check. |
| **R6** | Markdown render bundle size bloat | Medium | Medium | `react-markdown` ~30 KB gzipped; lazy-load di TaskDetailPage route only; verify <500KB initial. |
| **R7** | Realtime free-tier cap 200 concurrent — pilot 30 user fits but monitor | Low | Low | ADR-008 trigger threshold documented |
| **R8** | Optimistic update + Realtime echo race (double render) | Medium | Low | Dedupe via `id` field di reducer; Vitest test |

---

## F. Estimated effort total

| Step | Estimate (hari) |
|---|---|
| 1 — Schema comments + RLS | 0.5 |
| 2 — pgTAP RLS | 0.5 |
| 3 — post_comment RPC + @mention parser | 1.0 |
| 4 — Notif throttling | 0.75 |
| 5 — Client lib + Realtime hook | 1.0 |
| 6 — Task detail page | 1.0 |
| 7 — Comments UI + autocomplete | 1.25 |
| 8 — Notif Realtime swap | 0.5 |
| 9 — E2E + cumulative | 0.75 |
| 10 — Retro + verification + PR | 0.5 |
| **Total** | **7.75 hari** (single dev) |

Per Sprint 1-4 velocity (3.5-4 jam wall-clock), Sprint 4.5 expect 2-3 jam wall-clock.

---

## G. Pertanyaan untuk Owner (PRD ambiguity)

5 keputusan butuh klarifikasi:

### Q1: Comment edit/delete policy

- **(a)** Author dapat edit/delete own comment (anytime). Admin dapat delete any.
- **(b)** Author edit only kalau < 5 menit setelah post (Slack-style). After: read-only.
- **(c)** No edit (only delete). Audit-friendly.

**Rekomendasi:** **(a)** — pilot scale, audit log not Sprint 4.5 scope. Author full control + admin override sufficient.

---

### Q2: @mention match algorithm

- **(a)** Match `users.email` prefix only — `@andi` → match `andi@kalaborasi.com`.
- **(b)** Match `users.full_name` slug — `@andi-pratama` → match user with full_name "Andi Pratama".
- **(c)** Hybrid — try email prefix first, fallback ke full_name slug.

**Rekomendasi:** **(a)** — email prefix simpler, deterministic, no slug logic. Domain locked `@kalaborasi.com` enforced server-side. UX clear.

---

### Q3: Notification preferences UI scope

- **(a)** Sprint 4.5 ship preferences UI — admin per-user toggle "mute @mention", "throttle off", etc.
- **(b)** Sprint 4.5 throttling backend only. Preferences UI defer Sprint 6+.
- **(c)** Hybrid — Sprint 4.5 ship single user toggle "Pause notifications 24h", advanced prefs Sprint 6+.

**Rekomendasi:** **(b)** — scope minimal Sprint 4.5. Throttling defaults adequate; preferences UI = polish.

---

### Q4: Realtime channel scoping

- **(a)** Per-task channel `task:${id}` — subscribe saat task detail open, unsubscribe on leave. Hemat bandwidth.
- **(b)** Per-project channel `project:${id}` — subscribe saat project page open, broadcast all task updates. Lebih banyak event tapi 1 channel per project.
- **(c)** Global channel `comments:all` — single subscription, filter client-side.

**Rekomendasi:** **(a)** — per-task = optimal granularity. ADR-008 default. Memory + bandwidth safe.

---

### Q5: Markdown rendering library

- **(a)** `react-markdown` (~30 KB gzipped) — sanitized by default, GitHub-flavored support.
- **(b)** Hand-rolled subset (`**bold**`, `*italic*`, `[link]`, code fence) — ~3 KB but limited features.
- **(c)** Plain text only — no markdown render. Simplest, no XSS risk.

**Rekomendasi:** **(a)** — `react-markdown` industry-standard, XSS-safe by default. Bundle impact acceptable (lazy-load di TaskDetail route). Phase 2 owner upgrade kalau perlu more features (tables, footnotes, etc).

---

## H. Definition of Done untuk Sprint 4.5

- [ ] All 10 step shipped + commit + push ke `sprint-4-5`
- [ ] All pgTAP tests written (cumulative ~141)
- [ ] All Vitest unit pass (cumulative ~141)
- [ ] All E2E specs collected (cumulative ~103)
- [ ] Bundle size < 500 KB gzipped initial; Sprint 4.5 delta < 50 KB
- [ ] Realtime subscription cleanup verified (no memory leak via Vitest hook lifecycle)
- [ ] @mention end-to-end works (post comment → mentioned user gets notif < 1s)
- [ ] No regression Sprint 1-4
- [ ] Comments XSS-safe (Markdown sanitized)
- [ ] Notification throttling respects 5/hour default cap
- [ ] Sprint 4.5 retro + verification report ready
- [ ] PR `sprint-4-5 → main` created via gh CLI
- [ ] Owner approval + merge

---

## I. Rationale: Sprint 4.5 split rasional

- Sprint 4.5 nomenclature signals "interim sprint" — bukan major scope (Sprint 1-4 average 11 hari estimate). Sprint 4.5 = 7.75 hari = 70% Sprint 4 size.
- Single-purpose: collaboration depth. Cohesive deliverable (comments + mention + detail + throttling all interlock).
- After Sprint 4.5 merge, Sprint 5 plan (Cowork + F16) execute as planned per `docs/sprint-5-plan.md` (already merged main).
- Future Sprint 6 = soft launch + hardening (PRD §11 final sprint).

---

## J. Related

- `docs/research/kalatask-feature-priority-analysis-2026-04-28.md` (owner-side, not in repo) — research findings driving this sprint
- ADR-008 — Realtime architecture decision
- ADR-002 — RLS strategy (comments follows task parent)
- Sprint 3 notification engine (extended via throttling in Step 4)
- PRD §3.1 N1 line 150 — realtime latency target
- PRD §7 line 555 — comments ERD
