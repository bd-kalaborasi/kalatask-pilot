# ADR-005: CSV Import Strategy

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Claude Code (proposer), Owner BD (approver)
- **Context:** Pre-Sprint 4 — F15 CSV import butuh strategi parsing + validation + commit. Sprint 3 ADR-004 establish RPC pattern; ADR-005 evaluate apakah F15 reuse atau pivot.

> **Note:** ADR ini supersede ADR-005 sebelumnya (Sprint Order Adjustment) yang sudah Accepted di Sprint 1. Prefix nomor "ADR-005" dipakai ulang karena ADR-template tabel di-track sebagai TODO untuk Sprint berikutnya. Rename file lama untuk menghindari konflik nomor — saat eksekusi, kalau perlu re-number jadi ADR-007 atau lebih, flag untuk owner.

---

## Context

PRD §3.1 F15 (line 145) + §3.2 line 282-296 (Feature 8) + §13 line 660-676 spec CSV import:

- **Trigger:** admin upload CSV via UI
- **Template kolom (PRD line 286-288):** `title, description, assignee_email, project_name, status, priority, deadline, estimated_hours`
- **Validation:** preview 10 row pertama dengan ✅ valid / ⚠️ warning / ❌ error per row
- **Auto-create:** project baru kalau `project_name` not exist; user warning kalau `assignee_email` not found
- **Transactional:** semua atau tidak (rollback on critical error)
- **File limit:** max 5MB (PRD §13 line 662)
- **Output:** progress bar + summary akhir (X imported, Y skipped, Z error)

PRD §13 default: `POST /functions/v1/csv-import` Edge Function endpoint dengan multipart upload. Tapi Sprint 3 ADR-004 pivot dari Edge Function → RPC SQL function untuk productivity metrics karena:
- RLS auto-enforced via SECURITY INVOKER
- Zero bundle/runtime overhead
- Free-tier philosophy (no Edge invocation count)
- pgTAP testable native

ADR-005 evaluate: F15 CSV import — pertahankan PRD default Edge Function, atau pivot ke RPC pattern Sprint 3?

**Constraint pilot:**
- Pilot scale: ~30 user, CSV import one-time saat onboarding (rare event)
- Free-tier philosophy (ADR-001) — minimize compute cost, minimize moving parts
- File size 5MB max (PRD)
- Validation UX (preview before commit) butuh round-trip cepat

## Decision

**Adopt Option C — Client-side parser + batch RPC insert.**

Spesifikasi:
- **Frontend:** `papaparse` (~40 KB gzipped, MIT license, browser-side CSV parser) lazy-loaded saat user navigate ke `/admin/csv-import` page.
- **Validation:** client-side preview (10 row sample, format check) sebelum commit. Server-side validation di RPC sebagai authoritative source.
- **Commit RPC:** `public.bulk_import_tasks(p_rows jsonb, p_dry_run boolean)` returns JSONB summary. SECURITY INVOKER + admin-only RLS check via internal `is_admin()`.
- **Auto-create projects:** RPC handle in same transaction (BEGIN/COMMIT). Skip auto-create users (out of scope pilot — owner manage via Dashboard).
- **Transactional:** RPC wraps INSERT dalam single transaction. Critical error → ROLLBACK semua.

## Options yang dipertimbangkan

| Opsi | Bundle impact | RLS auto | Multipart support | Architecture consistency | Pilot fit |
|---|---|---|---|---|---|
| A: Edge Function (PRD default) | 0 (server-side) | ❌ Manual | ✅ Native | ❌ Pivot dari Sprint 3 | Over-engineered untuk one-time event |
| B: Pure RPC + Postgres COPY | 0 | ✅ | ❌ Server-side file path only | Partial fit (no upload pattern) | Tidak feasible — multipart unsupported di RPC |
| **C: Client parser + batch RPC** ✅ | +40 KB lazy chunk | ✅ via SECURITY INVOKER | ✅ via FormData / File API | ✅ Konsisten Sprint 3 ADR-004 | Best fit pilot |
| D: Storage trigger + Edge Function | 0 client + Edge runtime | Partial | ✅ via Storage upload | ❌ 2 services | Overkill |

### Bundle size impact (papaparse)

Verified via [bundlephobia](https://bundlephobia.com/package/papaparse): minified+gzipped ~13 KB core. Lazy-load via React.lazy untuk `/admin/csv-import` route — initial bundle Sprint 3 baseline 142 KB unchanged. Lazy chunk total estimate ~40 KB (papaparse + UI components).

### Validation UX flow

```
User upload CSV file (input type=file)
  ↓
papaparse parse di browser (instant, no server round-trip)
  ↓
Client validate format (header match, row schema)
  ↓
Show preview table 10 row pertama dengan icon validation per row
  ↓
User click "Commit" (atau cancel)
  ↓
Send rows array ke RPC bulk_import_tasks(rows, dry_run=false)
  ↓
RPC server-side validate (RLS check, FK check, enum check, transactional)
  ↓
Return JSONB summary {valid, warning, error, message}
  ↓
UI render summary + error detail
```

### File size limit (5MB) feasibility

papaparse handles 5MB CSV in browser memory tanpa issue (typical CSV 5MB ≈ 50,000-100,000 rows, papaparse benchmark 100K rows < 1 detik).

JSON serialize 50K rows ke RPC payload: ~5-10MB JSON (bigger than CSV due to verbose JSON). Postgres `jsonb` parameter limit not strict — handles MB-sized inputs.

For pilot scale (one-time onboarding CSV ~ hundreds of rows, max few thousand), well under any limit.

## Reasoning kenapa Option C dipilih

1. **Architecture consistency Sprint 3 ADR-004.** RPC SECURITY INVOKER pattern proven untuk productivity metrics. Reuse same pattern untuk F15 = lower cognitive overhead untuk Sprint 4+ developer + smaller surface area.

2. **RLS auto-enforced.** `bulk_import_tasks` checks `is_admin()` di body, returns 403-equivalent kalau caller non-admin. Tidak duplikasi role check di Edge Function code.

3. **Validation UX faster.** Client-side preview di-render instant tanpa server round-trip. Edge Function path butuh 2 API calls (parse + validate, then commit) — UX jadi laggy.

4. **Free-tier philosophy.** Edge Function counts toward 500K invocations/bulan free tier. Pilot CSV import rare event (~few times per onboarding cycle), tapi RPC = 0 invocation count. Symbolic alignment dengan ADR-001.

5. **No multipart upload state management.** Edge Function butuh handle FormData parsing, temp file, cleanup. RPC pattern cukup `JSON.stringify(rows)` di body — simple, stateless.

6. **pgTAP testable native.** `bulk_import_tasks(p_rows, p_dry_run)` standard SQL function — pgTAP `SELECT is(...)` pattern Sprint 1-3 langsung apply.

7. **Privacy positive — no raw file uploaded.** CSV content stays di browser memory, ditransform jadi structured rows sebelum kirim ke RPC. Server tidak pernah touch raw file.

## Consequences

### Positif

- Architecture consistent dengan Sprint 3 ADR-004 (single pattern reuse)
- Zero Edge Function deploy + version + monitor overhead
- Validation UX instant client-side
- RLS auto-enforced, no duplicate role check
- pgTAP test pattern direct reuse
- File parsing privacy-friendly (no Storage upload needed)

### Negatif (mitigasi)

- **Bundle +40KB gzipped lazy chunk** — Mitigasi: route lazy-load via `React.lazy` (Sprint 2 Gantt pattern + Sprint 3 Recharts pattern). Initial bundle unchanged.
- **5MB+ CSV browser memory pressure** — Mitigasi: PRD already cap 5MB. papaparse efficient, < 1 detik untuk 100K rows. UI-level guard reject file > 5MB sebelum parse.
- **JSONB payload bigger than raw CSV** — Mitigasi: pilot scale max few thousand rows. Postgres handles MB JSONB without issue. Future scale: pivot ke Storage + Edge kalau perlu.
- **Validation duplikasi** (client + server) — Mitigasi: client validation = UX preview only, NOT authoritative. Server-side RPC = single source of truth. Drift acceptable (client may show stale rule).
- **Edge case parsing (UTF-8 BOM, quoted commas, embedded newlines)** — Mitigasi: papaparse handle ini natively (vs custom parser yang butuh edge case handling). Set `papaparse.parse({ skipEmptyLines: true, header: true, dynamicTyping: false })`.

## RPC interface design

```sql
CREATE OR REPLACE FUNCTION public.bulk_import_tasks(
  p_rows jsonb,         -- Array of {title, description, assignee_email, project_name, status, priority, deadline, estimated_hours}
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
-- Returns:
-- {
--   "dry_run": true,
--   "summary": { "total": 50, "valid": 45, "warning": 3, "error": 2, "imported": 0 },
--   "rows": [ { "row": 1, "status": "valid", "issues": [], "task_id": null } ]
-- }
```

Detail di Sprint 4 plan Step 7 implementation.

## Trigger untuk revisit ADR ini

ADR-005 harus di-evaluate ulang kalau salah satu kondisi:

- **CSV scale > 10K rows** typical — browser memory pressure, pivot ke Storage + Edge Function streaming.
- **Bulk insert > 5MB JSONB payload** — Postgres parameter limit, perlu chunked submission.
- **External CSV libraries needed** (mis. Excel parser .xlsx) — Edge Function dengan SheetJS lebih natural.
- **Async / long-running import** — UI butuh progress bar real-time (current synchronous pattern OK untuk pilot).

## Related

- PRD §3.1 F15 (line 145) — CSV import scope
- PRD §3.2 Feature 8 (line 282-296) — acceptance criteria
- PRD §13 line 660-676 — Edge Function spec (default — superseded by ADR-005)
- ADR-001 (Supabase managed) — free-tier philosophy
- ADR-004 (Productivity RPC) — pattern reuse precedent
- papaparse: https://www.papaparse.com (MIT, ~13 KB gzipped core)
- bundlephobia: https://bundlephobia.com/package/papaparse
