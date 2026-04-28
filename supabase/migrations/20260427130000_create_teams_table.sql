-- =============================================================
-- Migration: 20260427130000_create_teams_table
--
-- Tujuan: Bikin tabel public.teams sebagai container grouping user
--   per team. RLS enabled + FORCE + GRANT statements untuk role API.
--   Pattern policy split per role per operation (skill rls-policy-writer
--   rule #3) — mirror struktur users table.
--
-- Schema columns (lihat brief Sprint 1 Step 6 + PRD §7 ERD line 464):
--   id, name, description, created_at, updated_at
--
-- Refer:
--   - PRD §7 (Database Schema → teams entity)
--   - ADR-002 (RLS Strategy → teams matrix)
--   - ADR-006 (Auto-RLS platform feature)
--   - Skills: supabase-migration, rls-policy-writer
--
-- Dependencies:
--   - 20260427000000_add_helper_functions.sql (set_updated_at, is_admin,
--     is_viewer, current_user_team_id)
--   - 20260427120100_create_users_table.sql (helpers reference public.users)
--
-- IMPORTANT — Schema deviations dari PRD ERD (di-document supaya explicit):
--   1. PRD ERD line 467 punya kolom `manager_id FK` ke users.id. Sengaja
--      di-OMIT di migration ini karena:
--      a. ADR-002 teams matrix tidak memberi UPDATE/DELETE permission ke
--         manager — jadi manager_id tidak punya fungsi RLS di Sprint 1.
--      b. Defer ke migration terpisah saat workflow assignment manager
--         per team di-implement (post-Sprint 1).
--      c. Menghindari circular FK setup chicken-and-egg dengan users.
--   2. Tambahan `description TEXT` (PRD ERD tidak listing) — sesuai brief
--      Sprint 1 Step 6. Berguna untuk UI list team. Nullable untuk
--      backward-compat data migration.
--   3. Audit columns created_at + updated_at = standar audit (skill
--      supabase-migration §3 default audit columns).
--
-- Lessons learned applied (dari Step 5):
--   1. GRANT statements WAJIB inline (commit 2cba554 — RLS evaluate AFTER
--      privilege check, tanpa GRANT throws 42501 sebelum RLS fire).
--   2. LANGUAGE plpgsql untuk function dengan cross-table reference (commit
--      439e4ae — LANGUAGE sql eager-validate di CREATE FUNCTION). Migration
--      ini tidak bikin function baru, jadi tidak applicable, tapi pattern
--      sudah benar di helpers existing.
--   3. Split policy per role per operation (skill rule #3) — 7 policy
--      individual untuk 4 role × 4 operasi yang relevan.
--
-- Reversal:
--   DROP TRIGGER IF EXISTS trg_teams_set_updated_at ON public.teams;
--   DROP TABLE IF EXISTS public.teams CASCADE;
--   (CASCADE akan hapus FK users_team_id_fkey dari migration berikutnya)
--
-- Author: Claude Code (skills: supabase-migration, rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL UNIQUE,
  description  text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.teams IS
  'Team container untuk grouping users (RLS scope manager/member). PRD §7, ADR-002.';
COMMENT ON COLUMN public.teams.name IS
  'Nama team (unique). Display di UI list + assignment context.';
COMMENT ON COLUMN public.teams.description IS
  'Deskripsi team (opsional). Di-omit dari PRD ERD tapi added per brief Sprint 1.';


-- ============================================================
-- 2. INDEXES
-- ============================================================
-- id PK + name UNIQUE sudah otomatis ter-index oleh Postgres.
-- Tidak ada FK kolom di tabel ini (manager_id deferred). No additional index.


-- ============================================================
-- 3. TRIGGERS
-- ============================================================
-- Audit: updated_at auto-update via helper fn dari migration #1.
CREATE TRIGGER trg_teams_set_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================
-- Auto-RLS dari Supabase platform (ADR-006) sudah ENABLE RLS otomatis.
-- Tetap explicit ENABLE + FORCE untuk audit trail per skill rule #1.
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 5. POLICIES (split per role per operation — skill rule #3)
-- ============================================================

-- 5a. SELECT — admin: cross-team visibility
CREATE POLICY "teams_select_admin_all" ON public.teams
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "teams_select_admin_all" ON public.teams IS
  'Admin: SELECT semua team lintas organisasi. ADR-002 teams matrix.';


-- 5b. SELECT — viewer: cross-team management overview
-- ADR-002 teams: Viewer SELECT = All (sama pattern dengan users matrix).
CREATE POLICY "teams_select_viewer_all" ON public.teams
  FOR SELECT
  TO authenticated
  USING (public.is_viewer());

COMMENT ON POLICY "teams_select_viewer_all" ON public.teams IS
  'Viewer (manajemen): SELECT semua team untuk dashboard management overview. ADR-002 teams matrix.';


-- 5c. SELECT — manager + member: own team only
-- Note: admin & viewer covered by dedicated policies (5a + 5b).
-- Manager/member tidak satisfy is_admin() atau is_viewer(), jadi effectively
-- team-scoped via policy ini (Postgres OR-combine policies).
CREATE POLICY "teams_select_own_team_member" ON public.teams
  FOR SELECT
  TO authenticated
  USING (id = public.current_user_team_id());

COMMENT ON POLICY "teams_select_own_team_member" ON public.teams IS
  'Manager/Member: SELECT team-nya sendiri saja. ADR-002 teams matrix. Admin & Viewer covered by dedicated policies.';


-- 5d. INSERT — admin only
CREATE POLICY "teams_insert_admin_only" ON public.teams
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "teams_insert_admin_only" ON public.teams IS
  'Admin only: create team. ADR-002 teams INSERT/UPDATE/DELETE = Admin saja.';


-- 5e. UPDATE — admin only
CREATE POLICY "teams_update_admin_only" ON public.teams
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "teams_update_admin_only" ON public.teams IS
  'Admin only: UPDATE team. ADR-002 strict — manager TIDAK boleh UPDATE.';


-- 5f. DELETE — admin only
CREATE POLICY "teams_delete_admin_only" ON public.teams
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "teams_delete_admin_only" ON public.teams IS
  'Admin only: DELETE team. ADR-002. Cascade behavior ke users.team_id = SET NULL via FK migration berikutnya.';


-- ============================================================
-- 6. GRANT (lessons learned dari Step 5 — commit 2cba554)
-- ============================================================
-- RLS evaluate AFTER table-level privilege check. Tanpa GRANT, query
-- throws 42501 SEBELUM RLS sempat fire. Konsisten dengan pattern users:
--   - authenticated: full CRUD (RLS handle row-level filtering)
--   - service_role: full CRUD (Edge Function context, bypasses RLS)
--   - anon: SELECT only (RLS deny via no policy match → 0 rows)

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO service_role;
GRANT SELECT ON public.teams TO anon;


-- =============================================================
-- TODO (next migrations):
--   20260427130100_add_fk_users_team_id.sql  — FK users.team_id → teams.id
--   (deferred manager_id column saat workflow assignment manager spec'd)
-- =============================================================
