-- =============================================================
-- Migration: 20260427130100_add_fk_users_team_id
--
-- Tujuan: Resolve deferred FK constraint dari Step 5 — link kolom
--   public.users.team_id → public.teams.id sekarang setelah teams
--   table exist. Per migration users (20260427120100) header:
--   "team_id = bare uuid (no FK constraint). FK ke public.teams(id)
--    di-add via ALTER TABLE saat teams migration dibuat."
--
-- Refer:
--   - 20260427120100_create_users_table.sql (kolom team_id)
--   - 20260427130000_create_teams_table.sql (target FK)
--   - PRD §7 (ERD users.team_id → teams.id relasi)
--   - Skill supabase-migration §5 (FK constraint pattern)
--
-- Dependencies:
--   - 20260427120100_create_users_table.sql (public.users dengan team_id)
--   - 20260427130000_create_teams_table.sql (public.teams target)
--
-- ON DELETE SET NULL — Justifikasi:
--   Kalau team dihapus admin (rare event, audit-able via DELETE policy),
--   users yang sebelumnya anggota team itu BUKAN ikut terhapus. Sebagai
--   gantinya users.team_id di-set NULL — user tetap exist, hanya
--   "orphan" tanpa team. Admin lalu bisa reassign manual. Alternative
--   ON DELETE RESTRICT terlalu rigid (DELETE team blocked selama ada
--   user — bikin admin kerja manual unassign dulu). Alternative
--   CASCADE terlalu destruktif (hapus user otomatis = data loss).
--   SET NULL = balance fleksibilitas + safety.
--
-- ON UPDATE CASCADE — Justifikasi:
--   Kalau teams.id berubah (rare karena UUID PK, tapi possible misal
--   data migration scenario), users.team_id otomatis ikut update.
--   Pattern standard untuk PK update yang propagate ke FK references.
--
-- Validation pre-migration:
--   - Cek tidak ada existing users.team_id yang reference team_id
--     non-existent di public.teams. Karena seed users.csv pakai UUID
--     yang match teams.csv, ini OK. Existing rows production: belum
--     ada (Sprint 1 in-progress), jadi no orphan risk.
--
-- Reversal:
--   ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_team_id_fkey;
--
-- Author: Claude Code (skill: supabase-migration)
-- =============================================================


-- ============================================================
-- 1. ADD FOREIGN KEY CONSTRAINT
-- ============================================================
ALTER TABLE public.users
  ADD CONSTRAINT users_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id)
  ON DELETE SET NULL
  ON UPDATE CASCADE;

COMMENT ON CONSTRAINT users_team_id_fkey ON public.users IS
  'FK users.team_id → teams.id. ON DELETE SET NULL (orphan-safe), ON UPDATE CASCADE. Resolves Step 5 deferred FK.';


-- =============================================================
-- TODO (next migrations):
--   - Sprint 1 Step 7: projects table + RLS + FK
-- =============================================================
