# ADR-006: Keep Supabase Auto-RLS Platform Feature Enabled

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Owner (BD)
- **Context:** Discovery saat verify migration helper functions di Sprint 1

---

## Context

Saat owner verify migration `20260427000000_add_helper_functions.sql` apply ke Supabase remote, query `information_schema.routines` di schema `public` return **9 function**. Investigation:

- 8 function dari migration kita: `set_updated_at`, `current_user_role`, `is_admin`, `is_manager`, `is_member`, `is_viewer`, `is_authenticated`, `current_user_team_id`
- 1 function tambahan yang **bukan dari migration kita**: `public.rls_auto_enable()` (event trigger function)

Function `rls_auto_enable` paired dengan event trigger `ensure_rls` (event: `ddl_command_end`). Setiap perintah `CREATE TABLE`/`CREATE TABLE AS`/`SELECT INTO` di schema `public` trigger function ini, yang loop melalui DDL commands dan otomatis execute `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` untuk tabel baru.

**Origin:** Pre-existing platform feature dari Supabase. Function owner = `postgres` (platform superuser, bukan user kita), `search_path = pg_catalog` (signature platform code style), tidak ada di migration repo. Kemungkinan terinstall otomatis saat Supabase project provisioning, atau via Dashboard setting "Auto-enable RLS" yang aktif.

ADR ini perlu ditulis sekarang supaya keberadaan platform feature ini **explicit tercatat** di audit trail kita — implicit behavior tanpa documentation = source of confusion untuk future engineer (terutama tim IT yang akan handle scale-up post-pilot).

## Decision

**Keep Supabase auto-RLS platform feature enabled.** Tabel baru di schema `public` akan terus di-trigger ENABLE RLS otomatis via event trigger `ensure_rls`. Kita tidak disable dan tidak override.

Tetap **WAJIB explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`** di setiap migration tabel kita — sebagai redundant safety + audit trail eksplisit di migration history. Auto-RLS jadi safety net, bukan pengganti explicit ENABLE.

## Options yang dipertimbangkan

| Opsi | Pros | Cons |
|---|---|---|
| **A: Keep enabled** ✅ | Defense in depth — safety net kalau migration lupa ENABLE RLS. Reduce human error untuk pilot dengan 1 BD owner non-engineer + 1 dev (Claude Code). | Implicit behavior tidak visible di repo migration. Risk handoff kalau IT pindah ke self-hosted Postgres (auto-RLS tidak ikut). |
| B: Disable di Dashboard | Strict explicit migration history. Pure portable across env. | Lose safety net. Setiap developer harus disiplin tulis ENABLE RLS — risk human error di 9+ tabel pilot scope. |

## Reasoning kenapa A dipilih

1. **Pilot risk profile high untuk human error:** 1 owner BD (non-engineer) + Claude Code sebagai sole developer + sprint pace tight = risk lupa ENABLE RLS di migration baru cukup tinggi. Auto-RLS = lapis kedua di atas explicit ENABLE RLS.
2. **Tidak override behavior eksplisit kita:** Migration kita tetap include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY ...`. Auto-RLS fire setelah CREATE TABLE — kalau RLS sudah enabled, idempotent (no-op). Tidak ada conflict.
3. **Handoff IT post-pilot tetap intact:**
   - Scale-up ke Supabase Pro tier: platform feature tetap ada (Pro = same managed platform).
   - Scale-up ke self-hosted: IT punya scope untuk evaluate replicate event trigger atau adopt different security model. ADR ini explicit alert.
4. **Audit trail via ADR:** Risk utama "implicit behavior" mitigated by writing ADR-006 ini. Future engineer baca `docs/adr/` langsung tahu auto-RLS exist + alasan keep.

## Consequences

### Positif
- Defensive default — tabel baru di public schema otomatis RLS-on.
- Reduce risk human error di migration pilot (terutama saat develop multiple tables paralel di sprint padat).
- Tidak butuh effort tambahan untuk maintain — Supabase platform yang handle.
- Compatible dengan skill `rls-policy-writer` rule #1 (RLS dari migration pertama) — auto-RLS provides default.

### Negatif (mitigated)
- **Implicit behavior** tidak visible di migration files. Mitigation: ADR-006 ini sebagai explicit awareness document di `docs/adr/`.
- **Portability cost saat scale-up self-hosted:** auto-RLS tidak ikut. Mitigation: ADR ini flag eksplisit ke IT untuk evaluate at handoff time.
- **Tidak prevent error logic level:** kalau migration tulis `CREATE POLICY` salah, auto-RLS tetap enable RLS → tabel deny-all sampai policy fix. Better than no RLS at all.

## Trigger untuk revisit ADR ini

ADR ini harus di-revisit (tulis ADR-007 superseding) kalau salah satu kondisi terjadi:

- **Supabase ubah behavior platform feature** — e.g., scope expand ke schema lain, naming change, atau API breaking change.
- **Scale-up ke self-hosted Postgres** — auto-RLS tidak available, evaluate replicate via custom event trigger atau enforce via migration linting.
- **Scale-up ke Supabase Pro tier** — verify feature tetap ada (expected: ya, Pro = same managed platform). Confirmation di-test eksplisit saat handoff.
- **Audit menemukan auto-RLS conflict** dengan migration baru — flag dan investigate (tidak diharapkan).

## Related

- ADR-002 (`docs/adr/ADR-002-rls-strategy.md`) — RLS strategy umum yang complement auto-RLS
- Skill `rls-policy-writer` (`.claude/skills/rls-policy-writer/SKILL.md`) — explicit ENABLE RLS rule yang tetap berlaku
- Migration commit `439e4ae` — helper functions migration di mana feature ini ter-discover
- Investigation log: function definition `public.rls_auto_enable()` queryable via:
  ```sql
  SELECT pg_get_functiondef('public.rls_auto_enable'::regprocedure);
  ```
  Event trigger queryable via:
  ```sql
  SELECT * FROM pg_event_trigger WHERE evtname = 'ensure_rls';
  ```
