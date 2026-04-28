# Sprint 5 Plan — KalaTask Pilot

**Sprint window:** target 2-3 minggu kalender (autonomous mode estimate 4-6 jam wall-clock + wrap-up)
**Branch:** `sprint-5` (dari main, post Sprint 4 merge)
**Scope locked:** PRD §3.1 F9 + F16, PRD §11 Sprint 5
**ADR baseline:** ADR-001/002/003/004/005/006/007

---

## A. Scope (locked)

### F9 — Cowork Integration (CREATE / UPDATE / SKIP)

PRD §3.2 Feature 5 (line 225-241) + §13 line 580-606 + §12.1 line 847-940.

**4 sub-components:**
1. **MoM parser (Cowork agent side)** — parse `KALATASK_MOM_TEMPLATE_V1` Markdown → extract ACTION items dengan composite key `(source_file_id, action_id)`.
2. **`sync_cowork_actions` RPC (KalaTask side)** — receive batch dari Cowork, dedup decision (CREATE/UPDATE/SKIP), emit comment + optional status change pada UPDATE, log ke `cowork_runs`.
3. **Manual review queue UI** — admin-only `/admin/cowork-review` untuk first-2-weeks audit (PRD R3 mitigation, line 737).
4. **Cowork agent settings + setup docs** — admin page `/admin/cowork-settings` (Drive folder config, schedule reminder), service-account auth setup guide.

**Acceptance criteria (PRD line 234-241):**
1. **AC-1:** Given file MoM baru/modified di Drive sejak last run, when scheduled job jalan, then Cowork agent baca file. *(Mock — Sprint 5 Drive integration deferred ke real Cowork agent setup.)*
2. **AC-2:** Given action item match task existing (composite key) + ada perubahan field, when MoM mention update, then Cowork emit comment `[Auto from MoM {file_name} ({date})]: {excerpt}`.
3. **AC-3:** Given action item match task + Konteks contains keyword `selesai|done|completed` → update status='done'. `blocked|stuck` → status='blocked'. `review|cek dulu` → status='review'.
4. **AC-4:** Given action item baru (composite key tidak match), when PIC email match `users.email`, then assign langsung. Tidak match → row marked error (Q3 Sprint 4 pattern: skip + warning).
5. **AC-5:** Given duplicate exact (composite match + no change), then SKIP, log "duplicate".
6. **AC-6:** Setiap run, RPC INSERT row `cowork_runs` dengan tasks_created / tasks_updated / tasks_skipped / errors / error_details (jsonb).
7. **AC-7:** Dry-run mode tersedia — `p_dry_run=true` validate + return summary tanpa write DB.
8. **AC-8:** First 2 weeks: action items dengan `needs_review=true` masuk queue `/admin/cowork-review`, admin approve/reject manual.

### F16 — Admin Usage Monitoring

PRD §3.2 Feature 9 (line 298-307) + §13 line 680-695.

**3 sub-components:**
1. **Usage probe RPC** — server-side `get_usage_summary()` returns DB size + storage size + table breakdown via Postgres `pg_database_size()` + `pg_total_relation_size()`. Storage size via Storage API call (TBD per Q5).
2. **Admin Usage Dashboard UI** — `/admin/usage` (admin-only) — visual progress bar untuk DB / storage / MAU vs free tier limits.
3. **Threshold alerts** — > 70% warning kuning, > 90% alert merah. Inline only (Sprint 5 scope; email/Slack alert defer Sprint 6+).

**Acceptance criteria (PRD line 302-307):**
9. **AC-9:** `/admin/usage` tampil current vs limit untuk DB (vs 500MB), Storage (vs 1GB), MAU bulan berjalan (vs 50K).
10. **AC-10:** Visual alert kuning > 70%, merah > 90%.
11. **AC-11:** Breakdown: tabel terbesar di DB, file terbesar di Storage (top 5).
12. **AC-12:** "Export & Archive Old Activity Log" tombol (export CSV, delete > 90 hari) — *defer ke Sprint 6+ kalau activity_log table belum exist Sprint 5* (Q6).
13. **AC-13:** Refresh button untuk fetch usage real-time.

---

## B. Step-by-step breakdown (14 steps)

### Step 1 — Schema migration (additive)

**Deliverable:**
- `supabase/migrations/<ts>_add_cowork_support.sql`:
  - `ALTER TABLE tasks ADD COLUMN source_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;`
  - `CREATE INDEX idx_tasks_source_composite ON tasks USING GIN (source_metadata);` (untuk dedup lookup)
  - `CREATE TABLE cowork_runs (id, started_at, completed_at, source_file_id, summary jsonb, errors jsonb, duration_ms);`
  - `CREATE TABLE cowork_pending_review (id, task_id FK, source_file_id, action_id, raw_action jsonb, reviewed_at, reviewed_by FK, decision text);`
  - RLS: `cowork_runs` SELECT admin/manager/viewer; INSERT service_role only. `cowork_pending_review` admin only.

**Acceptance criteria:**
- Migration applies via `npx supabase db push`
- Existing tasks `source_metadata={}` (additive — no Sprint 1-4 regression)

**Test strategy:** pgTAP `cowork_schema.test.sql` (~6 assertions: column exists, GIN index, RLS policies, cowork_runs insert via service_role).

**Commit:** `feat(db): add cowork source_metadata + cowork_runs + pending_review tables`
**Estimate:** 0.5 hari

---

### Step 2 — pgTAP coverage Cowork schema RLS

**Deliverable:**
- `supabase/tests/cowork_schema_rls.test.sql` (~6 assertions):
  - `tasks.source_metadata` jsonb default `{}`
  - `cowork_runs` SELECT admin OK
  - `cowork_runs` SELECT member denied
  - `cowork_pending_review` admin SELECT OK
  - `cowork_pending_review` member SELECT denied
  - GIN index `idx_tasks_source_composite` exists

**Commit:** `test(db): pgTAP coverage Cowork schema RLS`
**Estimate:** 0.5 hari

---

### Step 3 — MoM parser (Vitest unit-only)

**Deliverable:**
- `apps/web/src/lib/cowork/momParser.ts` — pure functions:
  - `parseMoM(markdown: string): ParsedMoM | ParseError[]`
  - `extractActionItems(mdContent): ActionItem[]`
  - `validateActionItem(item): { valid: boolean, issues: ValidationIssue[] }`
  - Status keyword detector: `detectStatusKeyword(text): 'done' | 'blocked' | 'review' | null`
- Vitest `apps/web/src/lib/cowork/momParser.test.ts` — 20+ assertions covering golden sample (template V1), edge cases (typo email, missing field, mal-formed ACTION-XXX, status keyword variations, multi-action MoM)
- Golden sample: `docs/sample-mom/01-sync-marketing.md` (from template V1 docs section E)

**Note:** Parser di-implement client-side (dipakai admin agar dapat preview/dry-run di UI Step 7). Cowork agent juga reuse logic ini via shared lib export, atau Cowork punya own parser per ADR-007 (TBD owner Q1).

**Commit:** `feat(web): MoM template V1 parser + 20+ vitest assertions`
**Estimate:** 1 hari

---

### Step 4 — `sync_cowork_actions` RPC (server-side)

**Deliverable:**
- `supabase/migrations/<ts>_add_sync_cowork_rpc.sql`:
  - `sync_cowork_actions(p_source_file_id, p_mom_date, p_actions jsonb, p_dry_run)` per ADR-007 RPC interface
  - Admin-only (RAISE EXCEPTION non-admin)
  - Loop p_actions:
    - Composite key dedup lookup `tasks WHERE source_metadata->>'source_file_id' = p AND source_metadata->>'action_id' = a`
    - CREATE / UPDATE / SKIP decision per action
    - UPDATE flow: insert comment row + status keyword detection
    - Insert `cowork_runs` row + return JSONB summary
- pgTAP `bulk_cowork_sync_rpc.test.sql` (~12 assertions): dedup, dry-run, status keyword, admin gate, comment emission

**Commit:** `feat(db): sync_cowork_actions RPC (ADR-007 implementation)`
**Estimate:** 1.5 hari

---

### Step 5 — Cowork client-side wrapper + manual sync

**Deliverable:**
- `apps/web/src/lib/cowork/coworkClient.ts` — `submitMoMSync({ sourceFileId, momDate, actions, dryRun })` wraps `supabase.rpc('sync_cowork_actions', ...)`
- Vitest unit untuk client wrapper (mock supabase)
- Type definitions for sync response

**Commit:** `feat(web): cowork sync client wrapper`
**Estimate:** 0.5 hari

---

### Step 6 — F9 Manual review queue UI (admin-only)

**Deliverable:**
- `apps/web/src/pages/AdminCoworkReviewPage.tsx` — lazy route `/admin/cowork-review`:
  - Table: pending review actions dari `cowork_pending_review`
  - Per-row: raw_action JSON detail expand + Approve / Reject buttons
  - Approve → mark task `needs_review=false` + `cowork_pending_review.decision='approved'`
  - Reject → soft-delete task + decision='rejected'
- AppHeader nav link admin-only "Review Cowork"

**Commit:** `feat(web): F9 manual review queue admin UI`
**Estimate:** 0.75 hari

---

### Step 7 — F9 Cowork agent settings + setup docs

**Deliverable:**
- `apps/web/src/pages/AdminCoworkSettingsPage.tsx` — admin-only `/admin/cowork-settings`:
  - Drive folder config display (read from `app_settings.cowork_drive_folder_id`)
  - Last sync run summary (top 10 dari `cowork_runs`)
  - Manual "Sync Now" button — triggers UI dry-run with file picker (Sprint 5 scope: file upload preview, real Drive integration defer)
  - Service account email display (read-only)
- `docs/cowork-agent-setup.md` — owner setup guide:
  - Cowork desktop app installation
  - Drive folder permission (read-only OAuth)
  - Service account auth: how to create user `cowork-agent@kalaborasi.system` + manual rotate password
  - Cowork agent local config (Supabase URL, account email, password env var)
  - Schedule setup (OS scheduler atau Cowork desktop scheduling)
- One-shot SQL `supabase/seed/cowork_service_account.sql` — INSERT user `cowork-agent@kalaborasi.system` admin role (commented; owner runs manually with chosen password via Auth admin API)

**Commit:** `feat(web,docs): F9 Cowork settings UI + setup docs + service account seed`
**Estimate:** 0.75 hari

---

### Step 8 — Mock Cowork integration test (E2E + parser flow)

**Deliverable:**
- `apps/web/tests/e2e/sprint-5-cowork.spec.ts` — 6+ E2E:
  - Admin upload mock MoM file via Settings UI → preview parsed actions
  - Dry-run path: shows what WOULD be created
  - Commit path: actual `sync_cowork_actions` call → tasks created in DB
  - Re-upload same file → SKIP all (dedup verified)
  - Modified file (1 action changed) → UPDATE flow + comment emitted
  - Admin denied: member visit `/admin/cowork-settings` redirect to `/`

**Commit:** `test(e2e): Sprint 5 Cowork mock integration scenarios`
**Estimate:** 1 hari

---

### Step 9 — F16 Usage probe RPC + Storage helper

**Deliverable:**
- `supabase/migrations/<ts>_add_usage_summary_rpc.sql`:
  - `get_usage_summary()` RETURNS JSONB
  - DB size: `pg_database_size(current_database())`
  - Top 10 tables: `SELECT relname, pg_total_relation_size(C.oid) FROM pg_class ...`
  - MAU: `auth.users WHERE last_sign_in_at > now() - interval '30 days'` (RLS-bypassed via SECURITY DEFINER)
  - Storage size: TBD — owner Q5 (PostgREST limited; might need owner manual probe atau Storage API call client-side)
  - Returns `{ database: { size_mb, limit_mb, utilization_pct }, mau, top_tables, alerts }`
- pgTAP `usage_summary_rpc.test.sql` (~5 assertions)

**Commit:** `feat(db): F16 get_usage_summary RPC`
**Estimate:** 1 hari

---

### Step 10 — F16 Admin Usage Dashboard UI

**Deliverable:**
- `apps/web/src/pages/AdminUsagePage.tsx` — lazy route `/admin/usage`:
  - 3 progress bars: DB / Storage / MAU
  - Threshold visual: green < 70%, kuning 70-90%, merah > 90%
  - Top 5 tables breakdown (read-only)
  - Refresh button
- AppHeader nav link admin-only "Usage"
- Vitest snapshot untuk threshold visual states

**Commit:** `feat(web): F16 admin usage dashboard UI`
**Estimate:** 0.75 hari

---

### Step 11 — F16 alert thresholds + activity_log archive button

**Deliverable:**
- Threshold logic: alert messages Indonesian friendly per BRAND.md microcopy
- "Export & Archive Old Activity Log" button (PRD AC-12) — defer Sprint 5 kalau `activity_log` table tidak exist yet
- *Decision per Q6 owner: scope F12 activity_log out-of-Sprint-5 = SKIP archive button, document Sprint 6+*

**Commit:** `feat(web): F16 threshold alert messages + archive button (or defer)`
**Estimate:** 0.5 hari

---

### Step 12 — Cumulative test + regression

**Deliverable:**
- New E2E specs collected (Sprint 5 ~12 baru)
- Verify Sprint 1-4 regression (cumulative ~96-100 E2E pass)
- Bundle check: initial < 500 KB gzipped
- pgTAP cumulative: ~140 assertions (Sprint 1-4 122 + Sprint 5 ~18)

**Commit:** `test(e2e): Sprint 5 cumulative + regression verification`
**Estimate:** 0.75 hari

---

### Step 13 — Sprint 5 retro + Checkpoint 6 prep

**Deliverable:**
- `docs/sprint-5-retro.md`
- `docs/sprint-5-checkpoint-6-instructions.md`
- `docs/sprint-5-final-signoff.md` (kalau ada limitations)

**Commit:** `docs(retro): Sprint 5 retrospective + Checkpoint 6 prep`
**Estimate:** 0.5 hari

---

### Step 14 — Verification automation + PR

**Deliverable:**
- Mirror Sprint 4 verification pattern: full Playwright + Lighthouse + screenshots
- `docs/sprint-5-verification-report.md`
- PR `sprint-5 → main` via gh CLI

**Commit:** `docs(sprint-5): verification report + PR`
**Estimate:** 0.5 hari

---

## C. Dependencies & ordering

### Sequential blocking chain

```
Step 1 (schema)
  → Step 2 (pgTAP RLS)
  → Step 3 (parser, parallel-able dengan Step 4-5 kalau ada 2 dev)
    → Step 4 (RPC sync_cowork_actions, dependent schema)
      → Step 5 (client wrapper, dependent RPC)
        → Step 6 (review queue UI, dependent RPC + schema)
          → Step 7 (settings + docs, parallel-able dengan Step 6)
            → Step 8 (mock E2E, dependent Step 3-7)
              → Step 9 (F16 RPC, independent dari F9)
                → Step 10 (F16 UI, dependent RPC)
                  → Step 11 (F16 alerts, dependent UI)
                    → Step 12 (cumulative test)
                      → Step 13 (retro)
                        → Step 14 (verification + PR)
```

### Parallelizable
- F9 sub-features (Step 6 + 7) — 2 dev possible
- F9 (Step 1-8) + F16 (Step 9-11) independent tracks — possible parallel

---

## D. Test strategy

### pgTAP
- Step 2: cowork_schema_rls (~6 assertions)
- Step 4: bulk_cowork_sync_rpc (~12 assertions)
- Step 9: usage_summary_rpc (~5 assertions)
- Cumulative target: 122 (Sprint 1-4) + 23 (Sprint 5) = **145**

### Vitest unit
- Step 3: momParser (20+ assertions)
- Step 5: coworkClient wrapper (~5)
- Step 10: usage threshold logic (~5)
- Cumulative target: 127 (Sprint 1-4) + ~30 (Sprint 5) = **~157**

### Playwright E2E
- Step 8: cowork mock 6+ tests
- Step 10: usage dashboard 3 tests
- Step 11: activity archive 1 test (kalau in scope)
- Cumulative target: 94 (Sprint 1-4) + 10-12 (Sprint 5) = **104-106**

### Verification (Step 14)
- Mirror Sprint 4: full Playwright + Lighthouse + screenshots + report

---

## E. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | Real Plaud MoM output secara material berbeda dari template V1 | High | Medium | Sprint 5 = mock-only validation. Sprint 6+ post-Plaud audit + parser hardening. Document deviation di retro. |
| **R2** | Cowork agent product spec belum public/verified | High | Medium | Implementation mock-friendly. Cowork-agnostic API contract — RPC standard SQL function callable dari any HTTP client. Sprint 6+ integration validation phase. |
| **R3** | Service account password rotation manual | Medium | Low | Document `docs/cowork-agent-setup.md` dengan quarterly rotation reminder. Auto-rotation Sprint 6+ kalau perlu. |
| **R4** | pg_cron belum enabled di Supabase Dashboard | High (carry-over) | Low | Sprint 5 schedule out-of-scope server-side. Cowork agent OS scheduler. Owner enable pg_cron Sprint 6+ kalau perlu DB-side cron. |
| **R5** | F16 Storage size probe via PostgREST limited | Medium | Medium | `pg_total_relation_size` only covers DB tables; Storage size needs Supabase Storage API client-side call atau Q5 owner answer. Mungkin defer Storage size ke "Coming soon" + show DB+MAU only. |
| **R6** | F16 MAU calculation needs `auth.users` access | Low | Low | RPC SECURITY DEFINER bypass RLS — read-only count, no PII exposure. |
| **R7** | Composite key `(source_file_id, action_id)` collision | Low | Low | Drive file ID unique. ACTION-XXX unique within file (template V1 enforced). Composite = deterministic dedup. |
| **R8** | RPC payload jsonb size for 100+ actions | Low | Low | Pilot scale ~5 MoM × 5-10 actions = ~50 actions/run. PostgREST handles MB-sized inputs. |
| **R9** | Sprint 1-4 regression dari schema migration Step 1 | Low | High | `source_metadata` additive only, jsonb default `{}`. Step 12 full regression check. |
| **R10** | Cowork agent service account = full admin RLS | Medium | Medium | Single-purpose admin user. Auditable via `cowork_runs.created_by`. Future Sprint 6+ scoped role kalau perlu. |
| **R11** | Manual review queue churn first 2 weeks | Medium | Low | UI optimized batch approve. Document per PRD R3 mitigation timeline. |
| **R12** | Status keyword false positive (e.g., "selesai pesanan kopi" → mark task done) | Medium | Medium | Keyword detection match exact phrase di Konteks field; phrase-level not word-level. Konservativ default = no status change kalau ambiguous. Document edge cases di parser test. |
| **R13** | F16 dashboard performance saat tabel besar | Low | Low | Pilot scale 30 user / few thousand task. `pg_total_relation_size` fast query. Top 10 limit applied. |
| **R14** | Bundle size impact (admin pages baru: 3 page lazy chunks) | Low | Low | All lazy-loaded route. Initial bundle unchanged. |

---

## F. Estimated effort total

| Step | Estimate (hari) |
|---|---|
| 1 — Schema migration | 0.5 |
| 2 — pgTAP RLS | 0.5 |
| 3 — MoM parser + Vitest | 1.0 |
| 4 — sync_cowork_actions RPC | 1.5 |
| 5 — Client wrapper | 0.5 |
| 6 — Manual review queue UI | 0.75 |
| 7 — Cowork settings + setup docs | 0.75 |
| 8 — Mock E2E integration | 1.0 |
| 9 — F16 usage probe RPC | 1.0 |
| 10 — F16 dashboard UI | 0.75 |
| 11 — F16 alerts + archive | 0.5 |
| 12 — Cumulative test + regression | 0.75 |
| 13 — Retro + Checkpoint 6 | 0.5 |
| 14 — Verification + PR | 0.5 |
| **Total** | **10.5 hari** (single dev) |

Sprint 5 target window: 2-3 minggu kalender (buffer 30% untuk mock Cowork variability + F16 metering uncertainty). Per Sprint 1-4 velocity: actual ~3.5-4 jam wall-clock optimistic. Sprint 5 expect 4-6 jam.

---

## G. Pertanyaan untuk Owner (PRD ambiguity)

Sebelum eksekusi Phase 2, owner perlu klarifikasi 7 hal.

### Q1: MoM parser shared library atau Cowork agent independent parser?

- **(a)** Parser di KalaTask repo (`lib/cowork/momParser.ts`); Cowork agent ditugaskan call this lib via shared package. Risk: tight coupling antara KalaTask + Cowork.
- **(b)** Parser di KalaTask UI ONLY untuk admin preview/dry-run. Cowork agent punya parser sendiri (out-of-repo, owner spec). KalaTask validate row schema saat receive RPC. **Recommended.**
- **(c)** Parser dual: KalaTask + Cowork both parse independently (redundancy). Higher maintenance.

**Rekomendasi:** **(b)** — RPC = trust boundary. KalaTask validate, Cowork parse + send pre-extracted JSON. Mock-friendly Sprint 5 (test parser di KalaTask side) + future-proof real Cowork integration.

---

### Q2: Cowork service account creation — owner setup atau auto-script?

- **(a)** Manual setup: owner buka Supabase Dashboard → Auth → create user `cowork-agent@kalaborasi.system` dengan role='admin' + password.
- **(b)** Auto-script: `supabase/seed/cowork_service_account.sql` insert user via Supabase Admin API (butuh service_role_key di local env).
- **(c)** Owner pilih nama email lain (mis. `automation+cowork@kalaborasi.com` real domain).

**Rekomendasi:** **(a)** — manual via Dashboard. Production-safer (password tidak di repo). Document setup steps di `docs/cowork-agent-setup.md`.

---

### Q3: Manual review queue duration?

- **(a)** Permanent — semua Cowork actions selalu masuk queue, admin approve manual.
- **(b)** First 2 weeks (PRD F9 R3 mitigation default) — auto-flag `needs_review=true` for first 14 days post-pilot-launch, lalu auto-apply.
- **(c)** Per-MoM toggle — admin pilih per upload apakah review-required atau auto-apply.

**Rekomendasi:** **(b)** — PRD default. Implementation: feature flag `app_settings.cowork_auto_apply_after = '2026-XX-XX'` (set saat go-live). Sebelum tanggal: needs_review=true. Setelah: auto-apply.

---

### Q4: Manual "Sync Now" button — scope Sprint 5 atau defer Sprint 6?

- **(a)** Full implementation Sprint 5: button trigger Cowork agent via webhook/IPC mechanism.
- **(b)** Sprint 5 scope: button simulate dengan file upload (admin upload Markdown manually, parse + dry-run + commit di-trigger di-app). Real Cowork wake-up defer Sprint 6+.
- **(c)** Defer Sprint 6+ entirely — Sprint 5 tidak include button.

**Rekomendasi:** **(b)** — admin upload manual Markdown file (file-picker UI), parser + RPC chain runs end-to-end. Real Cowork integration test post-Sprint 5 via owner Cowork desktop trigger.

---

### Q5: F16 Storage size probe mechanism?

- **(a)** Client-side Supabase Storage API call `supabase.storage.listBuckets()` + iterate → sum file sizes. Bisa lambat untuk many files.
- **(b)** PostgREST cron sync ke `app_settings.storage_size_mb_cached` (manual refresh button + cron Sprint 6+).
- **(c)** Defer Sprint 5 — F16 ship dengan DB + MAU only, Storage size "coming soon".
- **(d)** Owner manual probe via Supabase Dashboard, paste angka ke `app_settings`.

**Rekomendasi:** **(c)** — Sprint 5 defer Storage. Pilot Sprint 5 belum heavy file upload (attachments defer Sprint 6+). DB + MAU monitoring sudah covers free-tier critical path.

---

### Q6: F16 AC-12 "Export & Archive Old Activity Log" — Sprint 5 scope?

- **(a)** Implement Sprint 5 — but `activity_log` table belum exist (PRD §7 line 558, F12 deferred). Scope creep.
- **(b)** Defer Sprint 5 — document di Sprint 5 retro untuk Sprint 6+ saat F12 activity_log shipping.
- **(c)** Implement Sprint 5 partial — button placeholder dengan "Coming Soon" text.

**Rekomendasi:** **(b)** — defer. F12 (activity log) di PRD §11 bukan Sprint 5 explicit scope. Risk scope creep. Document di retro.

---

### Q7: PRD §13 `cowork-sync` Edge Function endpoint deviation handling?

- **(a)** Update PRD §13 → endpoint = RPC `sync_cowork_actions` (PRD edit Sprint 5).
- **(b)** Keep PRD as-is, document deviation di ADR-007 + Sprint 5 retro (Sprint 4 ADR-005 pattern continuity).
- **(c)** Implement BOTH — Edge Function `cowork-sync` sebagai wrapper (PostgreSQL call to RPC) untuk PRD compliance.

**Rekomendasi:** **(b)** — ADR-007 + retro deviation log sufficient. Future Sprint 6+ optional Edge wrapper kalau Cowork agent tidak support direct RPC call.

---

## H. Definition of Done untuk Sprint 5

- [ ] All 14 step shipped + commit + push ke `sprint-5`
- [ ] All pgTAP tests written (Sprint 1-4 122 + Sprint 5 ~23 = ~145 cumulative)
- [ ] All Vitest unit pass (Sprint 1-4 127 + Sprint 5 ~30 = ~157)
- [ ] All E2E specs collected (Sprint 1-4 94 + Sprint 5 10-12 = 104-106)
- [ ] Bundle size < 500 KB gzipped initial (PRD N1)
- [ ] No regression Sprint 1-4
- [ ] Mock Cowork integration verified end-to-end (golden sample MoM → CREATE/UPDATE/SKIP all paths covered)
- [ ] Service account auth flow documented + service-account user creatable
- [ ] F16 dashboard renders dengan thresholds (DB + MAU; Storage defer per Q5)
- [ ] Sprint 5 retro doc + Checkpoint 6 instructions ready
- [ ] PR `sprint-5 → main` created via gh CLI
- [ ] Verification report (Playwright + Lighthouse + screenshots) per Sprint 4 pattern
- [ ] Sprint 5 closed, merge ke main via PR
