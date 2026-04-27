-- =============================================================
-- Migration: 20260427120100_create_users_table
--
-- Tujuan: Bikin tabel public.users dengan kolom audit, RLS enabled,
--   dan policies untuk 4 role (admin/manager/member/viewer) sesuai
--   ADR-002 matrix dengan adjustments per Sprint 1 task brief 2026-04-27.
--
-- Schema columns (per PRD §7):
--   id, email, full_name, role, team_id, onboarding_state, locale,
--   created_at, updated_at
--
-- Refer:
--   - PRD §7 (Database Schema → users)
--   - ADR-002 (RLS Strategy → users matrix)
--   - ADR-006 (Auto-RLS platform feature)
--   - Skills: supabase-migration, rls-policy-writer
--
-- Dependencies:
--   - 20260427000000_add_helper_functions.sql (set_updated_at trigger,
--     is_admin, current_user_team_id, current_user_role)
--
-- IMPORTANT — Deviations from ADR/PRD defaults (di-document supaya
-- explicit untuk reviewer/auditor):
--   1. id PK = gen_random_uuid() default, BUKAN FK ke auth.users(id).
--      Rationale: simplifikasi pilot fixture testing. Trigger sync dari
--      auth.users ditambah di migration terpisah saat user signup flow
--      di-implement (Sprint 1+).
--   2. team_id = bare uuid (no FK constraint). FK ke public.teams(id)
--      di-add via ALTER TABLE saat teams migration dibuat.
--   3. Field lock UPDATE: trigger users_field_lock — RLS WITH CHECK tidak
--      bisa column-level. Pattern dari skill rls-policy-writer §E.
--
-- Reversal:
--   DROP TRIGGER IF EXISTS trg_users_field_lock ON public.users;
--   DROP TRIGGER IF EXISTS trg_users_set_updated_at ON public.users;
--   DROP FUNCTION IF EXISTS public.users_field_lock();
--   DROP TABLE IF EXISTS public.users CASCADE;
--   (CASCADE akan hapus FK dari tabel turunan kalau ada — destructive)
--
-- Author: Claude Code (skills: supabase-migration, rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text NOT NULL UNIQUE,
  full_name         text NOT NULL,
  role              text NOT NULL CHECK (role IN ('admin','manager','member','viewer')),
  team_id           uuid,  -- FK ke public.teams ditambah di migration teams
  onboarding_state  jsonb NOT NULL DEFAULT '{}'::jsonb,
  locale            text NOT NULL DEFAULT 'id' CHECK (locale IN ('id','en')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS
  'User accounts (admin/manager/member/viewer). PRD §7, ADR-002.';
COMMENT ON COLUMN public.users.role IS
  '4-role enum per PRD F4: admin (full), manager (team scope), member (self), viewer (manajemen read-only).';
COMMENT ON COLUMN public.users.team_id IS
  'FK ke public.teams.id — constraint di-add di migration teams berikutnya. NULL untuk admin organization-wide.';
COMMENT ON COLUMN public.users.onboarding_state IS
  'JSON: {tutorial_done: bool, tooltips_seen: text[]}. Per PRD F10.';
COMMENT ON COLUMN public.users.locale IS
  'UI language. Default id (Bahasa Indonesia). PRD N7.';


-- ============================================================
-- 2. INDEXES
-- ============================================================
-- email UNIQUE constraint sudah otomatis ter-index.
-- id PK sudah otomatis ter-index.
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users (team_id);
CREATE INDEX IF NOT EXISTS idx_users_role    ON public.users (role);


-- ============================================================
-- 3. TRIGGERS
-- ============================================================

-- 3a. Audit: updated_at auto-update via helper fn dari migration #1.
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- 3b. Field lock: lock role + team_id field untuk non-admin updates.
-- Pattern dari skill rls-policy-writer §E (Limited-field UPDATE).
-- RLS WITH CHECK tidak bisa column-level — pakai trigger BEFORE UPDATE
-- yang reset field non-allowed ke OLD value.
CREATE OR REPLACE FUNCTION public.users_field_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admin bypass — boleh ubah semua field
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Non-admin (self UPDATE): role + team_id reset ke OLD value
  -- Per Sprint 1 task brief 2026-04-27 ("kecuali field role dan team_id").
  NEW.role    := OLD.role;
  NEW.team_id := OLD.team_id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.users_field_lock IS
  'Trigger fn — lock role + team_id untuk non-admin self UPDATE. Bypass kalau is_admin(). ADR-002, skill rls-policy-writer §E.';

CREATE TRIGGER trg_users_field_lock
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_field_lock();


-- ============================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================
-- Auto-RLS dari Supabase platform (lihat ADR-006) sudah ENABLE RLS
-- otomatis pada CREATE TABLE event. Tetap explicit ENABLE + FORCE
-- di sini untuk audit trail per skill rls-policy-writer rule #1.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 5. POLICIES
-- ============================================================

-- 5a. SELECT — admin can see all users (cross-team)
CREATE POLICY "users_select_admin_all" ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "users_select_admin_all" ON public.users IS
  'Admin: SELECT semua user lintas team. ADR-002 users matrix.';


-- 5b. SELECT — viewer can see all users (cross-team, management overview)
-- ADR-002: Viewer = manajemen role yang butuh visibility lintas team.
CREATE POLICY "users_select_viewer_all" ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_viewer());

COMMENT ON POLICY "users_select_viewer_all" ON public.users IS
  'Viewer (manajemen): SELECT semua user lintas team untuk dashboard management overview. ADR-002 users matrix.';


-- 5c. SELECT — manager/member can see same-team users + self
-- Note: admin & viewer covered by dedicated policies (5a + 5b). Postgres RLS
-- OR-combine policies — manager/member effectively team-scoped via policy ini
-- karena mereka tidak satisfy is_admin() atau is_viewer().
CREATE POLICY "users_select_same_team_or_self" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (
      team_id IS NOT NULL
      AND team_id = public.current_user_team_id()
    )
  );

COMMENT ON POLICY "users_select_same_team_or_self" ON public.users IS
  'Manager/Member: SELECT user di team yang sama, plus diri sendiri. ADR-002 users matrix. Admin & Viewer covered by dedicated policies (OR-combined).';


-- 5d. INSERT — admin only
CREATE POLICY "users_insert_admin_only" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "users_insert_admin_only" ON public.users IS
  'Admin only: create user record. Per ADR-002.';


-- 5e. UPDATE — admin (semua field, field_lock bypass via is_admin check)
CREATE POLICY "users_update_admin_all" ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "users_update_admin_all" ON public.users IS
  'Admin: UPDATE semua field di semua user. Field lock trigger bypassed via is_admin() check.';


-- 5f. UPDATE — self (limited fields enforced via trigger users_field_lock)
CREATE POLICY "users_update_self_limited" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

COMMENT ON POLICY "users_update_self_limited" ON public.users IS
  'Self UPDATE: user bisa update record sendiri. Field role + team_id locked via trigger users_field_lock. Sprint 1 task brief.';


-- 5g. DELETE — admin only
CREATE POLICY "users_delete_admin_only" ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "users_delete_admin_only" ON public.users IS
  'Admin only: DELETE user. Per ADR-002.';


-- =============================================================
-- TODO (next migrations):
--   20260427130000_create_teams_table.sql       — public.teams
--   20260427130100_add_fk_users_team_id.sql     — ALTER ADD FK
--   20260427130200_add_rls_teams.sql            — RLS teams
-- =============================================================
