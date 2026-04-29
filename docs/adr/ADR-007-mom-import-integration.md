# ADR-007: MoM Import Integration Architecture (v2)

- **Status:** Accepted (v2 — supersedes v1 Cowork Integration)
- **Date:** 2026-04-28 (v1) / 2026-04-29 (v2 — naming + scope refresh)
- **Deciders:** Claude Code (proposer), Owner BD (approver)
- **Context:** Sprint 5 execution — F9 MoM Import (renamed dari "Cowork integration"). v1 architecture decision PINNED; v2 update naming + clarify split: Sprint 5 = manual upload UI + backend RPCs. Post-launch automation = Claude Code scheduled task (deferred, reuses same RPC backend — zero throwaway).

### Naming changes locked v2:
- "Cowork integration" → **"MoM Import"**
- "Cowork agent" → **"Claude Code scheduled task"** (post-launch, deferred)
- Skill `cowork-prompt-tuning` → `plaud-prompt-tuning`
- `tasks.source` enum value `'cowork-agent'` retained untuk back-compat; new value `'mom-import'` ditambah

---

## Context

PRD §3.2 Feature 5 (line 225-241) + §13 line 580-606 + §12.1 line 847-940 spec F9 Cowork integration:

- **Trigger:** Daily 07:00 WIB scheduled job
- **Source:** Folder Drive `Drive/MoM/`
- **MoM format:** `KALATASK_MOM_TEMPLATE_V1` (Markdown structured per `docs/cowork-mom-template-v1.md`)
- **3 actions:** CREATE / UPDATE / SKIP berdasarkan dedup decision (per ACTION-XXX ID)
- **Output target:** Edge Function `POST /functions/v1/cowork-sync` (PRD default)
- **Logging target:** tabel `cowork_runs` (PRD §7 line 536-547)
- **Manual trigger:** "Sync Now" tombol admin panel (PRD §12.1 line 857)
- **First 2 weeks:** manual review queue per risk R3 mitigation (PRD §10.1 line 737)

Owner-locked context:
- MoM template V1 = structured Markdown dengan ACTION-XXX IDs (parsed-friendly, dedup-safe via composite key)
- Cowork agent = Anthropic's Cowork desktop product (akses Drive folder + KalaTask API), sudah dipasang owner-side
- Plaud.ai akan generate Markdown yang fits template, upload ke Drive folder Cowork watch
- Sprint 5 strategy: lanjut dengan **mock Cowork tests + golden sample MoM** (real Plaud output validate post-Sprint 5)

ADR-006 (Auto-RLS platform feature) sudah dipakai. ADR-007 ini cover Cowork architecture.

ADR-005 RPC pattern (client-side parser + batch RPC insert) terbukti work untuk F15 CSV import. ADR-007 evaluate apakah F9 reuse pattern itu atau pivot ke Edge Function (PRD default).

**Constraint pilot:**
- Free-tier philosophy (ADR-001) — minimize Edge invocation count
- Pilot scale: ~30 user, ~5 MoM/hari maksimum
- MoM file size < 50 KB (Markdown text only — no embedded media)
- Service role key security: kalau dipakai di Cowork agent, perlu rotation strategy
- pg_cron Sprint 3 known-limitation: belum di-enable di Supabase Dashboard (owner action pending)
- Cowork agent product spec belum public-documented per due diligence; Sprint 5 implementation harus tolerant terhadap variability

---

## Decision

**Adopt Option A — Hybrid client-parser + batch RPC dengan dedicated source-tracking.**

Spesifikasi:
- **Cowork agent side:** parse MoM Markdown → extract ACTION-XXX items → POST batch ke RPC `sync_cowork_actions(p_source_file_id, p_actions jsonb, p_dry_run boolean)`.
- **KalaTask side:** new RPC `sync_cowork_actions` (admin-only via `is_admin()` check, mirror Sprint 4 ADR-005 pattern). RPC handle:
  - Dedup lookup via composite key `(source_file_id, action_id)`
  - CREATE / UPDATE / SKIP decision per row
  - Auto-emit comment + status keyword detection (UPDATE flow)
  - Insert into `cowork_runs` log + return JSONB summary
- **Source tracking:** new column `tasks.source_metadata jsonb` (additive). Stores `{source_file_id, action_id, mom_date, original_pic_email, mom_priority}`. JSONB jadi flex schema untuk future MoM versions.
- **Auth boundary:** Cowork agent authenticate ke Supabase via dedicated service account (Supabase Auth admin role user created Sprint 5 Step 7). Token stored di Cowork agent local config — JANGAN service_role_key di agent (security boundary). RPC `sync_cowork_actions` SECURITY INVOKER + body `is_admin()` check ensures hanya admin-role caller dapat trigger.
- **Schedule:** out-of-scope server-side (pg_cron not enabled). Cowork agent itself jadwal trigger via OS scheduler / Cowork desktop scheduling. KalaTask side stateless — receive any time, idempotent.
- **Manual review queue:** tabel `cowork_pending_review` (Sprint 5 Step 6) untuk action items dengan `needs_review=true` (PRD F9 R3 mitigation, first 2 weeks).
- **Manual "Sync Now":** admin UI button trigger Cowork agent via wake-up signal (out-of-scope KalaTask side; admin invoke desktop Cowork manually saat development).

---

## Options yang dipertimbangkan

| Opsi | Pros | Cons | Cost |
|---|---|---|---|
| **A: Hybrid agent-parse + batch RPC** ✅ | • Reuse ADR-005 pattern (RPC SECURITY INVOKER + admin gate)<br>• RLS auto-enforced<br>• Zero Edge runtime cost (free-tier)<br>• pgTAP testable<br>• Source tracking via jsonb (flex schema) | • Parser logic di Cowork side (kurang controllable dari KalaTask repo)<br>• Real MoM format variability butuh tolerant client parser | Low — RPC reuse, jsonb additive |
| B: Edge Function `cowork-sync` (PRD default) | • Server-side parser (controllable)<br>• PRD default pattern | • +1 Edge Function deploy + monitor overhead<br>• 500K invocations/month free tier counter<br>• Service role key handling (security)<br>• Bypass RLS (manual policy enforcement)<br>• Pivot dari Sprint 4 ADR-005 | Medium — new deploy stack |
| C: Direct PostgREST insert dari Cowork agent | • Simplest (no RPC) | • No transactional guarantee per MoM file<br>• Dedup logic at agent side (state pollution)<br>• Service role key required di agent | High security — service_role_key di agent unacceptable |

---

## Reasoning kenapa Option A dipilih

1. **Architecture consistency Sprint 4 ADR-005.** Cowork integration = sister flow CSV import (batch dari external trigger → admin-only → validation + transactional commit). RPC pattern proven, reuse cost rendah.

2. **RLS auto-enforced via SECURITY INVOKER.** Edge Function path butuh service_role_key + manual role check di kode, surface area + audit-trail lebih sulit. RPC path: admin-only check di body, RLS apply otomatis untuk semua side-effect tables.

3. **Free-tier philosophy.** Pilot expected ~5 MoM/hari × 30 hari = ~150 invocations/bulan. Edge Function counts toward 500K/month limit (negligible saat ini, tapi free-tier symbolic alignment per ADR-001).

4. **pgTAP testable native.** `sync_cowork_actions` standard SQL function — assertion via pgTAP `SELECT is(...)`. Edge Function path butuh JS test rig yang lebih kompleks.

5. **jsonb source_metadata = flex schema.** MoM template V1 mungkin evolve (V2 multi-language, V3 subtask hierarchy). Dedicated column `source_metadata jsonb` accommodate without ALTER TABLE per version.

6. **Composite key dedup `(source_file_id, action_id)` = deterministic.** PRD F9 fuzzy matching (line 235-237) berbasis title + assignee_name — high false positive risk. Template V1 ACTION-XXX ID tightens dedup ke deterministic key. Fuzzy fallback masih possible kalau owner upgrade Sprint 6+.

7. **Auth via dedicated admin service account.** Sprint 5 Step 7 create user `cowork-agent@kalaborasi.system` dengan role='admin' + email/password rotation policy. Cowork agent authenticate via Supabase Auth `signInWithPassword` (standard JWT, scoped per Auth user). Service role key NEVER exposed di agent.

8. **PRD default `/functions/v1/cowork-sync` partial alignment.** Endpoint name di PRD §13 = informasi historis (PRD pre-Sprint 4 pivot). RPC `sync_cowork_actions` semantik equivalent. Document sebagai deviation di Sprint 5 retro.

---

## Consequences

### Positif

- Sprint 4 ADR-005 pattern reused (single architecture pattern across F15 + F9)
- Zero Edge Function deploy/monitor overhead untuk Sprint 5
- RLS auto-enforced + admin gate di body
- Source metadata flexible (jsonb)
- Composite-key dedup deterministic (V1 template advantage)
- pgTAP test pattern direct reuse
- Cowork agent auth = dedicated admin account (auditable, rotatable)

### Negatif (mitigasi)

- **Parser di Cowork agent side** (out-of-repo) — Mitigasi: golden sample MoM + spec lock di `docs/cowork-mom-template-v1.md`. KalaTask side validate row schema sebelum insert (defensive).
- **Real Plaud output variability** — Mitigasi: Sprint 5 mock-only validation. Sprint 6+ post-Plaud-real audit + parser hardening.
- **PRD default `cowork-sync` Edge Function semantik deviation** — Mitigasi: document di retro. Future Sprint 6+ dapat add Edge Function wrapper kalau perlu (not blocker).
- **pg_cron schedule belum enabled** — Mitigasi: schedule out-of-scope KalaTask. Cowork agent OS-side scheduler. Manual "Sync Now" untuk testing. Sprint 6+ owner enable pg_cron untuk daily 07:00 WIB.
- **Cowork agent product spec belum verified public** — Mitigasi: Sprint 5 implementasi mock-friendly. Real Cowork integration validation post-Sprint 5 (phase 2 with owner due diligence).
- **Auth: Cowork service account password rotation** — Mitigasi: dokumentasi setup di `docs/cowork-agent-setup.md` (Sprint 5 Step 7 deliverable). Owner manual rotate per quarter.

---

## RPC interface design (Sprint 5 Step 4)

```sql
CREATE OR REPLACE FUNCTION public.sync_cowork_actions(
  p_source_file_id text,        -- Drive file ID (deterministic dedup key)
  p_mom_date date,               -- MoM rapat date (metadata)
  p_actions jsonb,               -- Array of ACTION items per template V1
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
-- Admin-only check via is_admin() di body (RAISE EXCEPTION non-admin).
-- For each action item:
--   1. Lookup task WHERE source_metadata->>'source_file_id'=p_source_file_id
--      AND source_metadata->>'action_id' = action.action_id
--   2. CREATE if not found, UPDATE if found+changed, SKIP if found+same
--   3. UPDATE: emit comment '[Auto from MoM ...]' + optional status change
--      based on Konteks keyword (selesai/blocked/review)
-- INSERT cowork_runs row (created/updated/skipped/errors counts).
-- Return JSONB:
-- {
--   "dry_run": false,
--   "summary": { "created": 3, "updated": 1, "skipped": 1, "errors": 0 },
--   "items": [
--     {
--       "action_id": "ACTION-001",
--       "decision": "create" | "update" | "skip" | "error",
--       "task_id": uuid | null,
--       "issues": [...]
--     }
--   ]
-- }
```

Detail di Sprint 5 plan Step 4-5.

---

## Trigger untuk revisit ADR ini

ADR-007 harus di-evaluate ulang kalau salah satu kondisi:

- **Real Plaud MoM output secara material berbeda dari template V1** — parser hardening atau template V2.
- **Cowork agent volume > 100 actions/hari** — RPC payload size atau Postgres jsonb parameter limit pressure.
- **pg_cron enabled + owner butuh server-side schedule** — schedule logic move ke Postgres `pg_cron.schedule()` calling RPC.
- **Service account auth deemed unsafe** — pivot ke OAuth flow atau scoped API key.
- **Edge Function path needed** (mis. butuh embedding via Anthropic API, atau realtime WebSocket signaling) — pivot ke Edge Function dengan ADR-007 superseded.
- **Multi-tenant (di luar pilot Kalaborasi)** — domain lock `@kalaborasi.com` perlu di-relax + tenant scoping.

---

## Related

- ADR-005 (CSV Import Strategy) — RPC SECURITY INVOKER + admin-gate pattern
- ADR-001 (Supabase managed) — free-tier philosophy
- PRD §3.2 Feature 5 (line 225-241) — F9 acceptance criteria
- PRD §3.2 Feature 9 (line 298-307) — F16 (sister Sprint 5 scope, separate ADR not required — usage dashboard is read-only metering)

---

## v2 Implementation Log (Sprint 5 — 2026-04-29)

Sprint 5 shipped F9 sebagai **manual admin upload UI**. Post-launch automation (scheduled task reading Drive folder) deferred — same RPC backend reuses, zero throwaway code.

### Architecture refinements v2

1. **Master alias mapping table `user_aliases`** (vs v1 jsonb-only approach):
   - Auto-populated via trigger `users_auto_create_aliases` (full_name, first_name, 4 honorifics)
   - Seed-able dari `MAPPING_KARYAWAN_FINAL_V2.csv` master file
   - Resolver pakai SQL JOIN + `levenshtein` (fuzzystrmatch extension) untuk 4-tier confidence

2. **4-tier confidence ketat** (v2 KEY DECISION):
   - **HIGH** = exact alias match (case-insensitive, single user)
   - **MEDIUM** = single fuzzy match Levenshtein ≤1 (typo tolerance)
   - **LOW** = multi-candidate exact OR fuzzy distance 2 OR ambiguous
   - **UNRESOLVED** = no match OR `[NAMA_TIDAK_JELAS_at_HH:MM]` escape hatch

3. **Exception-only auto-approve flow**:
   - Semua items HIGH → `mom_imports.approval_status='auto_approved'`
   - Ada MEDIUM/LOW/UNRESOLVED → `pending_review` (admin queue)

4. **Plaud Template v2** (master spec di `docs/cowork-mom-template-v1.md`):
   - Tidak pakai email placeholder di PIC field (raw display name only, e.g., "Pak Joko")
   - Escape hatch `[NAMA_TIDAK_JELAS_at_HH:MM]` untuk audio yang tidak jelas

5. **Edge Function path NOT taken**:
   - `parse-mom` Edge Function from v1 Spec → **client-side parser** in `lib/momImport.ts`
   - `usage-snapshot` Edge Function → **`get_usage_summary()` RPC** (free-tier alignment)
   - Both reasons: ADR-001 free-tier, RLS auto-enforced, pgTAP testable

6. **Sample MoM real (Plaud output)**:
   - 04-23 sample: 47 ACTION items (Daily Stand-up Cipondo)
   - 04-24 sample: 60 ACTION items (SCRUM Kelistrikan-OEE)
   - Mapping CSV: 239 employees (27 IN_MOM_SAMPLE=YES seeded sebagai reference users)

### Deferred ke post-launch (NOT Sprint 5)

- Drive folder watch + scheduled trigger (Claude Code scheduled task via OS scheduler atau Anthropic Cowork desktop). Backend RPC `process_mom_upload` reuses unchanged.
- Notification ke admin saat exception detected — owner config email Sprint 5 atau Sprint 6+.
- PRD §13 line 580-606 — `/functions/v1/cowork-sync` Edge Function spec (superseded by ADR-007 RPC)
- PRD §12.1 line 847-940 — Cowork agent setup + prompt template (informational)
- `docs/cowork-mom-template-v1.md` — MoM Template V1 spec (parser contract)
- Future `docs/cowork-agent-setup.md` (Sprint 5 Step 7 deliverable) — agent installation + auth setup
