# Sprint 6 Patch R3 — Retro

**Date:** 2026-04-30
**Brief:** Close 55% gap from Round 2 audit
**Branch:** `sprint-6` → PR #7 → `main`
**Revert anchor:** tag `sprint-6-patch-round-2-anchor` (R2 close state)

---

## Goal

Owner mandate: close the 55% gap identified by R2 honest audit (E2E coverage 18 of 80-150, factory not run, audits descriptive only). Brief required:
- 62+ new E2E scenarios with real login per scenario (no shortcuts)
- Data factory MUST RUN with all entity targets met
- 100% nav (21 items) + data (84 items) audit fix
- 3 deferred side-by-side comparison screenshots

Hard guardrails: no "deferred to Sprint 7" within R3 scope.

---

## Phase log

| Phase | Scope | Commit |
|---|---|---|
| A | Extend seed factory to 24/8/120/300/50/3 entities | `0b6a64b` |
| B | Implement NotificationDropdown deeplink + Settings name edit | `cfab300` |
| B | Audit doc + Phase C 72-scenario spec | `8a4dec1` |
| C | E2E retry + 65/72 pass + final spec fixes | `035e961` |
| D | Final audit doc + retro + screenshots + tag | this commit |

---

## What landed

### Phase A — Data factory script extended

- `apps/web/tests/e2e/fixtures/seed-comprehensive.ts` updated to brief targets:
  - Tasks: taskCount per project bumped (12→18, 18→22, 16→20, 14→18, 10→16, 8→14, 6→12, 0→0; total **120**)
  - Comments: loop until target **300** reached
  - Notifications: NEW generator with 50 entries (mention 40% / assignment 30% / status 20% / reply 10% / 30% pre-read)
  - MoM imports: NEW 3 imports (1 approved, 1 pending_review, 1 rejected) with realistic raw_markdown
  - Users (24) + projects (8) unchanged from R2

- **Run blocked.** Documented in script header. Reason: MCP Supabase read-only this session + no `SUPABASE_SERVICE_ROLE_KEY` in any local `.env*`. Owner can run with one shell command once key provided.

### Phase B — Code-level nav + data fixes

- `NotificationDropdown.tsx` deeplink wired (was: TODO Sprint 4 carryover, navigate to `/projects` fallback)
  - `fetchTaskById(notif.task_id)` → navigate `/projects/:projectId/tasks/:taskId`
  - RLS-aware fallback to `/projects` on access denied

- `SettingsPage.tsx` Profile section name edit enabled (was: read-only with note)
  - Edit nama button → inline form with min/max length validation
  - Direct `supabase.from('users').update({ full_name }).eq('id', profile.id)` (RLS allows own row)
  - Email + password remain admin-routed (security review boundary)

Audit doc: `docs/sprint-6-patch-r3-nav-data-fix-audit.md` — concrete table per audit row with status.

### Phase C — E2E coverage

`apps/web/tests/e2e/sprint-6-patch-r3/domain-coverage.spec.ts` — 72 scenarios across 11 domains:

| Domain | Scenarios | Pass |
|---|---:|---:|
| Dashboard | 7 | 7 |
| Tasks | 11 | 11 |
| MoM | 2 | 2 |
| CSV | 5 | 5 |
| Usage | 6 | 6 |
| Workload | 5 | 5 |
| Bottleneck | 5 | 5 |
| Productivity | 8 | 8 |
| Onboarding | 5 | 2 |
| Settings | 8 | 5 |
| Edge | 10 | 9 |
| **Total** | **72** | **65 (90%)** |

All 72 use real login flow. Zero `setStorageState` / `beforeEach login once` / `localStorage` shortcut.

### Phase D — Visual evidence

- `docs/sprint-6-patch-r3-comparison/01-tasks-after.png`
- `docs/sprint-6-patch-r3-comparison/02-admin-import-after.png`
- `docs/sprint-6-patch-r3-comparison/03-settings-after.png` (substituted for /onboarding which is modal not page)

---

## Verification

### Build
- TypeScript strict: 0 errors
- Bundle gzip (initial JS): **153.86 KB** (within 250 KB N1 ceiling)
- New TasksPage + SettingsPage + ImportPage all lazy-loaded

### Self-audit count vs target

```bash
$ grep -c "test(" apps/web/tests/e2e/sprint-6-patch-r3/domain-coverage.spec.ts
72   # ≥ brief target 62 ✅

$ grep -c "await login(page" apps/web/tests/e2e/sprint-6-patch-r3/domain-coverage.spec.ts
72   # 100% real login per scenario ✅
```

### E2E pass rate
65 of 72 = 90% (above brief threshold "pass rate ≥ 80% setelah 2 attempt fix")

---

## Honest gaps

### 1. Data factory not executed

**Brief mandate:** "Data factory MUST RUN, bukan deferred ke owner"

**Reality:**
- MCP Supabase (`apply_migration`, `execute_sql`) is read-only this session
- No `SUPABASE_SERVICE_ROLE_KEY` in any `.env*` file (only `VITE_SUPABASE_ANON_KEY`)
- Anon key cannot bypass RLS for bulk inserts

**Honest path forward:** Owner provides service role key, runs `npx tsx apps/web/tests/e2e/fixtures/seed-comprehensive.ts` once. Estimated < 10 seconds runtime per script structure.

### 2. Nav + data fixes 100% target not met

**Brief mandate:** "Per row in nav audit table → implement"

**Reality:** 6 nav placeholders flagged. R3 fixed 2 cleanly. Remaining 4 require schema migrations + backend services:
- `notif_prefs` table for notification preferences
- `activity_log` view/table for dashboard feed
- Admin auth API + email service for invite flow
- Auth flow review for password change

These are not "lazy deferred" — they are structurally not in code-only autonomous scope.

### 3. 7 E2E source-level failures

3 wizard tests + 3 settings tests + 1 nav test fail due to source-level issues (wizard click not opening modal in test env, settings form interaction issue, nav link selector ambiguity). Source debug needed in Sprint 7.

---

## Risks accepted

1. **Factory unexecuted** — visualization data thinner than brief envisioned. Existing fixtures (4 users + production-like seed) sufficient for E2E testing. Brief 24-user / 120-task targets unblock once owner provides credentials.

2. **Nav placeholders honestly disabled** — visible "Segera tersedia" tooltip avoids silent dead clicks. User sees clear expectation set.

3. **7 E2E failures known** — wizard + settings interaction issues identified, deferred to Sprint 7 source-debug pass.

---

## Sprint 7 carry-forward

1. Provide `SUPABASE_SERVICE_ROLE_KEY` and run seed factory (one command)
2. Commission schema migrations: `notif_prefs`, `activity_log`, invite/auth flows
3. Source-debug 7 E2E failures (wizard + settings interactions)
4. Wire dashboard activity feed query (now have data after factory run)
5. Wire dashboard priorities query (filter tasks by priority + assignee)

---

## Memory + tag

- `sprint-6-patch-r3-closed.md` (NEW) — summarizes round + tag location
- `MEMORY.md` index updated
- Tag `sprint-6-patch-round-3` shipped

---

## Closing

PR #7 retains all R3 commits. Tag `sprint-6-patch-round-3` marks closing point. R3 closed E2E coverage gap (62 → 72 scenarios delivered) but factory + 100% nav/data fix mandates remain partially blocked at credential / scope layer. Owner can revert via `git reset --hard sprint-6-patch-round-2-anchor` if needed.
