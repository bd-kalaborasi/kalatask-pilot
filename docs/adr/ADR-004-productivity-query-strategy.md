# ADR-004: Productivity Dashboard Query Strategy

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Claude Code (proposer), Owner BD (approver)
- **Context:** Pre-Sprint 3 — F8 (Manager dashboard) + F13 (Productivity dashboard) butuh strategi query untuk 4 metrics. Per CLAUDE.md Keputusan 2.

---

## Context

PRD F13 (line 137-143) + F8 (line 122) butuh aggregated metrics untuk dashboard:

| # | Metric | Definition |
|---|---|---|
| 1 | Completion rate per user | `COUNT(tasks WHERE status='done') / COUNT(tasks WHERE assigned_to_user)` per period |
| 2 | Velocity per team (line chart 8 minggu) | `COUNT(tasks WHERE completed_at IN week_N)` group by week |
| 3 | On-time delivery rate | `COUNT(tasks WHERE completed_at <= deadline) / COUNT(tasks WHERE status='done')` |
| 4 | Average cycle time | `AVG(completed_at - created_at)` per project |
| 5 | Bottleneck heatmap | `COUNT(tasks)` by `(status, age_bucket)` di mana `age_bucket` = `(now - last_update)` |

**Constraints:**
- **PRD N1:** dashboard query < 3 detik untuk 10K task historical
- **RLS:** Manager scope team-nya only; Viewer + Admin scope all (PRD line 656-658)
- **PRD §13 (line 632):** API spec recommend `/functions/v1/productivity-metrics` Edge Function, tapi CLAUDE.md Keputusan 2 default rekomendasi DB view + PostgREST (lebih simpel, RLS auto)
- **Pilot scope:** ~30 user, ~hundreds of project, ~thousands of tasks → projection 10K task realistic peak post-pilot adoption
- **Free-tier philosophy** (ADR-001) — minimize compute cost, minimize moving parts

ADR ini lock pilihan strategi sebelum Sprint 3 implementation step (productivity dashboard) supaya schema + query design konsisten dari awal.

## Decision

**Adopt PostgreSQL SQL function (RPC) returning JSONB** — exposed via PostgREST endpoint `/rest/v1/rpc/get_productivity_metrics` dan `/rest/v1/rpc/get_workload_summary`. Hybrid approach yang combine kelebihan DB view (RLS auto, fast, pgTAP testable) dengan flexibility Edge Function (parameter support, structured response).

**Tidak adopt Edge Function** untuk metric query (Phase 2 reconsider kalau scale-up requirements berubah).

Spesifikasi:
- 2 RPC function: `public.get_productivity_metrics(p_team_id uuid, p_period_days int)` dan `public.get_workload_summary(p_team_id uuid)`
- Both **SECURITY INVOKER** — RLS auto-enforced via underlying `tasks`/`projects`/`users` queries (Manager auto-filter to own team via existing policies)
- Return type: `jsonb` (matches PRD §13 response shape)
- pgTAP testable via standard SQL function call assertions
- Idempotent + deterministic (no side effects, OK to call repeatedly)

## Options yang dipertimbangkan

| Opsi | RLS auto | Param support | pgTAP testable | Latency | Bundle impact | Maintenance |
|---|---|---|---|---|---|---|
| **A: Postgres RPC function (JSONB)** ✅ | ✅ via SECURITY INVOKER + underlying table RLS | ✅ via fn args | ✅ standard | Lowest (single round-trip, in-DB) | None (server-side) | Low (1 SQL fn per metric set) |
| B: DB view (no params) | ✅ via underlying table RLS | ❌ (perlu app-side filter post-fetch) | ✅ standard | Low | None | Medium (period filter messy) |
| C: Supabase Edge Function (Deno) | ❌ manual implement role check | ✅ via URL params | Hard (need Deno test runner) | Higher (cold start + Deno runtime + 2 round-trips) | Edge fn deploy size | High (Deno deploy, version, monitor, cold start) |
| D: Client-side aggregation | ❌ depend on RLS query coverage | ✅ JS logic | Medium | High (fetch all rows, aggregate client) | High (JS bundle) | Medium |
| E: Hybrid (DB view base + Edge Function compose) | Partial | ✅ | Hard | Highest | Edge | Highest (2 places) |

### Bundle size impact

- Option A/B/D/E: server-side, 0 KB bundle delta
- Option C: Edge Function deploy size minimal, but client may need additional fetch wrapper

**No initial JS bundle impact** untuk RPC approach (Option A). Sprint 2 baseline 137 KB gzipped → Sprint 3 unchanged untuk query layer.

### Performance projection (PRD N1 < 3 detik untuk 10K task)

**Option A (RPC):**
- Single SQL query in-DB, indexed on `tasks(assignee_id, status)`, `tasks(project_id, status)`, `tasks(deadline)`, `tasks(completed_at)` per Sprint 1 schema migration
- 10K task aggregation di PostgreSQL benchmarked < 100 ms typical for indexed columns
- Round-trip + JSON serialization total < 500 ms on Supabase free tier (Singapore region, ~30 ms latency)
- **Well under 3 detik target**

**Option C (Edge Function):**
- Deno cold start: 100-500 ms
- Deno → Postgres query: 30-100 ms
- Edge → client: 30-100 ms
- Total cold start: 200-700 ms; warm: 100-300 ms
- Acceptable, but Option A simpler with same outcome

## Reasoning kenapa Option A dipilih

1. **RLS automatic untuk SECURITY INVOKER function.** RPC fn jalan dengan privilege caller — Manager auto-scope ke own team via existing `tasks_select_manager_via_project` + `projects_select_manager_owner_or_team` policies. Edge Function harus manual implement role check di TypeScript (duplikasi RLS logic, risk drift).

2. **Parameter support tanpa Edge Function overhead.** RPC function natively accept args (`p_team_id`, `p_period_days`). Sama flexibility dengan Edge Function URL params, tanpa Deno runtime cost.

3. **Performance baseline 10x lebih cepat dari requirement.** Indexed aggregation di Postgres typical < 100 ms untuk 10K task. PRD N1 target 3 detik → 30x headroom. Edge Function tambah cold start latency tanpa benefit functional.

4. **pgTAP testable native.** RPC fn = standard SQL function. Test pattern: `SELECT is(public.get_productivity_metrics(...), expected_jsonb)`. Konsisten dengan Sprint 1+2 RLS test architecture (86 assertions baseline). Edge Function butuh Deno test runner separate (additional dev tooling).

5. **Free-tier philosophy alignment (ADR-001).** Postgres function = $0 marginal cost. Supabase Edge Function free tier: 500K invocations/bulan — adequate untuk pilot 30 user, tapi jadi consideration kalau scale. RPC function = no invocation limit di Postgres.

6. **Maintenance burden lower.** 1 SQL file per metric set vs Edge Function (TypeScript + Deno deploy + version + monitor). IT scale-up team biasanya lebih familiar dengan SQL than Deno tooling.

7. **PRD §13 line 632 spec compatible.** PRD show endpoint pattern `/functions/v1/productivity-metrics`. RPC equivalent: `/rest/v1/rpc/get_productivity_metrics` — same JSONB response shape. Spec convertible without breaking client contract.

## Consequences

### Positif
- **RLS auto-enforced** — no risk role check drift between policy + query
- **Sub-100ms query time** untuk 10K task projection (10x headroom vs N1)
- **pgTAP testable** — incremental coverage on top of Sprint 1+2 RLS suite
- **Zero bundle impact** — server-side aggregation
- **Single deploy artifact** — migration SQL file, no Edge deploy step
- **PostgreSQL feature support** — window functions, CTEs, JSONB construction native

### Negatif (mitigasi)
- **Complex SQL untuk 5 metrics di 1 function** — Mitigasi: split jadi 2 RPC (`get_productivity_metrics` untuk metric 1-4 + bottleneck heatmap; `get_workload_summary` untuk F5 workload). Each function < 100 lines SQL, scoped per use case.
- **JSONB shape locked di SQL** — Kalau dashboard butuh shape fleksibel, harus DROP + CREATE function. Mitigasi: design JSONB shape match PRD §13 spec dari awal, treat sebagai contract. Migration baru kalau shape change.
- **No middleware/composition layer** — Cross-data source aggregation (mis. external API) tidak feasible via RPC. Mitigasi: Sprint 5 Cowork integration butuh Edge Function untuk Drive API access — pattern split di sini. RPC untuk data internal, Edge untuk eksternal.
- **Postgres function debugging** — SQL stack trace less rich dari TypeScript. Mitigasi: pgTAP test suite catch regression early; structured logging via `RAISE NOTICE` saat develop.

## Test plan

Sprint 3 Step 5 (productivity RPC implementation) wajib include:

| Test layer | Coverage | Tool |
|---|---|---|
| pgTAP RLS | RPC fn returns scoped data per role (Manager team-only, Viewer all, Member 403) | `supabase/tests/productivity_rls.test.sql` (~10 assertions) |
| pgTAP correctness | Each metric returns expected value untuk known fixture | Same file, +5 assertions |
| Vitest unit | Client-side response shape parser + chart data transform | `apps/web/src/lib/productivity.test.ts` |
| Playwright E2E | Dashboard page render dengan real data per role (Checkpoint 4) | `apps/web/tests/e2e/productivity.spec.ts` |
| Performance | Query time < 500 ms untuk 10K task fixture | Manual bench atau pgTAP `EXPLAIN ANALYZE` capture |

**Performance test note:** Sprint 3 production fixture max ~hundreds of task. 10K projection test butuh seed dataset besar. Plan Sprint 3 risk register R3 cover ini — consider extrapolation strategy atau defer ke Sprint 4 load test.

## Migration risk

- **No schema change** untuk RPC function creation — pure additive (new function di public schema). Migration `20260428xxx_add_productivity_rpc.sql` aman roll-forward, drop function aman roll-back.
- **No impact** untuk Sprint 1+2 deliverable — RPC reads existing tables (tasks, projects, users) tanpa modify.
- **GRANT EXECUTE** wajib untuk RPC — `GRANT EXECUTE ON FUNCTION public.get_productivity_metrics TO authenticated;`. Lessons learned dari Sprint 1 GRANT pattern gap (commit `2cba554`) — explicit GRANT di migration.

## Trigger untuk revisit ADR ini

ADR-004 harus di-evaluate ulang kalau salah satu kondisi:

- **Performance regression** — query time > 1 detik untuk 10K task (hit warning threshold). Investigate index, materialized view, atau move ke Edge Function dengan caching.
- **Metric requirement berubah** — kalau Sprint 4+ butuh metric yang require external API (mis. Slack activity correlation), Edge Function approach jadi lebih tepat untuk sub-feature itu.
- **Real-time refresh requirement** — kalau dashboard butuh real-time push (Supabase Realtime broadcast), perlu broadcast pattern terpisah; RPC tetap untuk on-demand fetch.
- **Scale-up Phase 2 ke self-hosted** — kalau pindah dari Supabase managed, evaluate apakah RPC pattern compatible dengan PostgREST self-hosted setup.

## Related

- PRD §3.1 F8 (line 122) — Manager dashboard scope
- PRD §3.1 F13 (line 137-143) — Productivity dashboard 4 metrics + Viewer access
- PRD §13 (line 632-658) — productivity-metrics + workload-summary API spec
- PRD N1 (line 150) — performance budget < 3 detik
- CLAUDE.md "Keputusan 2" — productivity query strategy deferred ke Claude Code
- ADR-001 (Supabase managed) — free-tier philosophy alignment
- ADR-002 (RLS Strategy) — Manager team-scope + Viewer cross-team
- Sprint 1 schema indexes (`tasks(assignee_id, status)`, `tasks(project_id, status)`, `tasks(deadline)`, `tasks(completed_at)`) — performance baseline RPC built on
- Postgres docs RPC functions: https://postgrest.org/en/stable/references/api/functions.html
- PostgreSQL window functions: https://www.postgresql.org/docs/current/tutorial-window.html
