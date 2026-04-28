# Sprint 1 Retrospective — KalaTask Pilot

**Sprint window:** 2026-04-27 → 2026-04-28 (2 hari kalender, intensive)
**First commit:** `db0cf57` — initial pilot setup
**Last commit:** `b68d8a0` — Claude Code permission allowlist
**Status:** ✅ DONE — Checkpoint 2 verified, ready Sprint 2 planning

---

## 1. Sprint summary — what shipped

### Database foundation (4 tables + RLS)

| Table | Migration | RLS coverage |
|---|---|---|
| `users` | `20260427120100_create_users_table.sql` | 13 pgTAP assertions |
| `teams` | `20260427130000_create_teams_table.sql` + FK migration | 13 pgTAP assertions |
| `projects` | `20260427140000_create_projects_table.sql` | 21 pgTAP assertions |
| `tasks` | `20260427150000_create_tasks_table.sql` (18 cols PRD literal) | 33 pgTAP assertions |

Plus helper functions migration (8 SECURITY DEFINER fns) + `member_has_task_in_project` cycle-break helper + Member SELECT projects transitive policy.

**Total RLS coverage:** 80 pgTAP assertions across 4 role × CRUD ops + FK CASCADE/SET NULL + trigger logic. Matches ADR-002 target.

### Frontend foundation

- Vite + React 18 + TS strict + Tailwind + shadcn/ui scaffold (`8436531`)
- Supabase Auth flow: email + password login (`8779f3f`)
- AuthContext with subscribe-only listener pattern (post-deadlock fix `bb9f4ef`)
- Role-aware DashboardPage placeholder (4 role variants)
- ProtectedRoute guard
- 4 shadcn components manually written (Button, Input, Label, Card)

### E2E verification (Playwright)

12 assertions covering 5 categories: login per role × 4, logout + network capture × 4, session persist, wrong credentials × 2, protected route. **Result: 12/12 PASS** (`7c95987`).

### ADRs published

- **ADR-001** Supabase managed (pre-Sprint)
- **ADR-002** RLS Strategy (pre-Sprint)
- **ADR-005** Sprint order — confirm PRD section 11 (`4db8e82`)
- **ADR-006** Keep Supabase auto-RLS platform feature (`bc6f384`)

### Test users seeded

4 test logins (admin/manager/member/viewer) di `supabase/seed/auth_users_seed.sql` — applied by owner via Dashboard.

### Commit breakdown (33 total)

| Type | Count |
|---|---|
| feat | 15 |
| docs | 8 |
| fix | 5 |
| test | 4 |
| chore | 1 |

---

## 2. What went well

### a. Checkpoint discipline — 2 stop-and-report worked

Step 7 (projects schema vs ADR conflict) dan Step 8 (Manager INSERT scope, completed_at trigger, dst) trigger explicit STOP dan flag ke owner sebelum eksekusi. Owner approve "Option C hybrid" / "All my recommendations" — kedua kasus produce design yang konsisten dan tidak butuh major rewrite. Tanpa checkpoint, kemungkinan besar implementasi jalan ke arah yang tidak match ADR-002 dan butuh revert.

### b. Pattern reuse compounding di RLS testing

Pertama pgTAP (users) butuh design from scratch — 13 assertions. Setelah established, teams (13), projects (21), tasks (33) tinggal mirror struktur. TEMP table aggregation pattern untuk MCP execute_sql ditemukan saat Step 5, lalu reusable persis untuk Step 6/7/8 verification — single MCP call capture full TAP output.

### c. Forward-only fix philosophy

Tidak ada migration yang di-edit setelah commit. Semua fix jadi migration baru:
- Pattern E bug → `439e4ae` (plpgsql conversion)
- GRANT gap → `2cba554` (separate add_grants migration)
- Viewer scope deviation → `719178b` (separate revert migration)
- RLS cycle → `9d8a9f7` (SECURITY DEFINER helper)

Audit trail clean. Anti-pattern #1 di skill `supabase-migration` di-respect 100%.

### d. Skill issues di-track sebagai eksternal artifact

`docs/skill-issues.md` jadi tempat document gap di skill bawaan tanpa block sprint. Skill author punya backlog untuk follow-up. Pilot tidak ter-block.

### e. E2E test catch DevTools UX gotcha (Bug 1)

Owner reported "no network call visible" — manual investigation circular. Playwright `page.on('request')` + `page.on('response')` capture definitif (4 role × 1 POST `/auth/v1/logout?scope=global` × 204 status). Bug 1 closed dengan dokumentasi + recommendation toggle "Preserve log", **tanpa code change**.

---

## 3. What went wrong / friction points

### a. Skill bugs (greenfield-untested patterns)

Refer: `docs/skill-issues.md`. Dua skill issues yang ter-discover saat real apply:

1. **`supabase-migration` Pattern E** — `LANGUAGE sql` SECURITY DEFINER function dengan cross-table reference fail di greenfield (`check_function_bodies` GUC eager-validate `relation does not exist`). Workaround: convert ke `LANGUAGE plpgsql` (commit `439e4ae`). Pattern foundation migration yang paling sering greenfield, tapi belum ditest di greenfield.

2. **`rls-policy-writer` + `supabase-migration` GRANT gap** — Pattern A-F tidak include GRANT statements. RLS policy alone tidak cukup — Postgres evaluate table-level privilege FIRST, throws 42501 sebelum RLS sempat fire. Workaround: separate migration `add_grants_users` (commit `2cba554`). Discovered saat first pgTAP test stuck di anon SELECT.

**Pola problem yang sama:** kedua skill issue indikasi skill belum di-test di blank Supabase project. Recommend skill author audit semua pattern di greenfield environment. Detail lengkap di `docs/skill-issues.md`.

### b. Supabase API key migration mid-sprint

Mid-sprint owner sadar Supabase legacy `anon` key di-deprecate, harus migrate ke `publishable` key. Owner edit `.env` manual mid-execution. Tidak ada early warning di skill atau ADR. Mitigated cepat (cuma env var change, no code impact) tapi flag friction point.

**Action item:** ADR baru atau update ADR-001 untuk catat Supabase key migration history kalau ada vendor deprecation lagi.

### c. AuthContext deadlock — 2 bug, 1 root cause, ~1 hari investigation

Bug 1 (logout no network) + Bug 2 (refresh stuck "Memuat...") share single root cause: supabase-js v2 lock contention saat `onAuthStateChange` callback async + parallel `getSession()` bootstrap. Documented di issues #762, #963. Tidak ter-flag di skill manapun karena auth-flow specific. Investigation butuh re-read 3 file (AuthContext, auth.ts, DashboardPage), trace event lifecycle, baca supabase-js issue tracker.

**Action item:** add pattern note ke project — onAuthStateChange callback HARUS sync, async work via `void promise`. Document ini di internal SKILL atau CLAUDE.md.

### d. DevTools "Preserve log" default-off → false signal

Bug 1 owner observation "no network call" valid dari perspective manual DevTools, tapi misleading. Logout fires + completes in ~50ms, navigation to /login wipes log. Owner spent waktu cari "kenapa tidak ada network call".

**Action item:** dokumentasikan di onboarding atau CLAUDE.md — "kalau verify network call yang trigger navigation, enable Preserve log dulu".

### e. RLS recursion cycle ter-miss saat design Step 8

Step 8 introduce `projects_select_member_via_tasks` policy yang query `tasks`. Tasks RLS Manager juga query projects. Static-analyzer Postgres detect cycle at PLAN time → 42P17 error. Skill `rls-policy-writer` rule #5 sebenarnya warn tentang ini, tapi saya rationalize "tidak ada cycle karena role short-circuit" — wrong interpretation. Postgres tidak peduli runtime short-circuit, only static graph.

**Lesson:** kalau policy query table B, dan table B punya policy yang query table A, ALWAYS pakai SECURITY DEFINER helper untuk break cycle, regardless of role mutual exclusion.

### f. CRLF/LF noise di .mcp.json

Sepanjang sprint, .mcp.json sering muncul "modified" di git status karena LF/CRLF autocrlf nuance, padahal content identical. Tidak block apapun, tapi visual noise tiap commit.

---

## 4. Lessons learned (actionable Sprint 2+)

### a. Validate via E2E network capture, jangan trust DevTools

Recommendation untuk Sprint 2+ frontend work: setiap fitur yang involve network call (terutama yang trigger navigation), pair dengan minimal Playwright test yang capture request/response. Lebih reliable dari manual DevTools verification.

### b. RLS policy design — SECURITY DEFINER as default for cross-table

Update pattern: kalau policy USING clause query tabel selain own, default ke SECURITY DEFINER helper function. Tidak nego — Postgres static analysis tidak peduli runtime short-circuit.

### c. Permission allowlist setup early (Sprint 0 task)

`b68d8a0` setup permission allowlist di akhir Sprint 1 — reactive. Sprint 2 bisa benefit dari pre-setup di Sprint 0 atau early Sprint 1. List 21 allow patterns yang bisa langsung dipakai sebagai baseline.

### d. Auth flow pattern note (anti-deadlock checklist)

Untuk Sprint 2 saat tambah feature yang butuh auth state:
- onAuthStateChange callback HARUS sync (no `async` keyword di callback signature)
- Async work di-defer pakai `void promise.then(...)`
- Tidak parallel `getSession()` bootstrap saat sudah ada listener
- INITIAL_SESSION event fires immediately on subscribe — pakai itu sebagai trigger loading-resolve

### e. Schema deviation harus eksplisit di header migration

Pattern dari Step 6 onwards: kalau schema beda dari PRD ERD literal, document di header migration "DEVIATION justification" section. Pattern reusable untuk Sprint 2+ ketika feature schema potentially diverge dari draft PRD.

### f. Skill greenfield validation jadi recommendation untuk skill author

Dokumentasikan formal di `docs/skill-issues.md`: skill `supabase-migration` + `rls-policy-writer` perlu validation di blank Supabase project sebelum commit ke skill repo. Pattern bug Pattern E dan GRANT gap kedua-duanya "tidak terbukti greenfield" — kemungkinan ada bug serupa yang belum ke-discover.

---

## 5. Metrics

### Commit volume

| Type | Count | Detail |
|---|---|---|
| feat | 15 | tabel, RLS, frontend, seed |
| docs | 8 | ADR-005/006, skill issues, retro, CLAUDE.md updates |
| fix | 5 | Pattern E plpgsql, GRANT, viewer scope, RLS cycle, AuthContext deadlock |
| test | 4 | pgTAP × 3 tabel + E2E Playwright |
| chore | 1 | Claude Code permission allowlist |
| **Total** | **33** | |

### Test coverage

| Layer | Assertions |
|---|---|
| pgTAP RLS (users + teams + projects + tasks) | 80 |
| Playwright E2E (auth flow) | 12 |
| **Total** | **92** |

### Sprint duration

- Start: 2026-04-27 (initial setup)
- End: 2026-04-28 (Checkpoint 2 verified)
- **Calendar days:** 2
- **Throughput:** ~16 commits/hari, ~46 assertion/hari

### Files delivered

- 13 SQL migrations (8 helpers fn + 4 tabel + FK + grants + cycle fix)
- 4 fixture CSV (users, teams, projects, tasks)
- 4 pgTAP test files (rls per tabel)
- 1 Playwright E2E suite (auth.spec.ts)
- 1 auth seed SQL
- 9 frontend src files (lib/auth, AuthContext, LoginPage, DashboardPage, ProtectedRoute, 4 shadcn ui)
- 4 ADR documents
- 1 skill-issues tracker, 1 retro doc

---

## 6. Status flag untuk Sprint 2

✅ **Foundation locked.** RLS security model proven. Auth flow verified. Pattern library established (RLS, migration, test).

**No blockers.** Ready Sprint 2 (per CLAUDE.md mapping: F3 List/Kanban/Gantt + F14 project lifecycle).

**Pre-Sprint 2 checklist:**
- ADR-003 (Gantt library frappe vs dhtmlx) wajib selesai
- Owner approval Sprint 2 mulai
- Bundle size baseline check (current 393KB JS gzipped — under 500KB target, masih ada budget untuk Gantt lib)
