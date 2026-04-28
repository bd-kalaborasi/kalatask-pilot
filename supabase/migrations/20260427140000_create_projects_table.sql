-- =============================================================
-- Migration: 20260427140000_create_projects_table
--
-- Tujuan: Bikin tabel public.projects sebagai container task dengan
--   lifecycle status. RLS pattern ADR-002 ownership-based untuk Manager
--   (BUKAN team-based seperti users/teams). Member SELECT explicit deny
--   Sprint 1 — defer transitive-via-tasks ke Step 8.
--
-- Schema (per PRD §7 ERD line 469-477):
--   id, name, description, owner_id, status, created_at, completed_at
--   + updated_at (DEVIATION dari PRD literal — audit standard)
--
-- DEVIATION justification (updated_at):
--   PRD ERD line 475-476 cuma listing created_at + completed_at, tidak ada
--   updated_at. Migration ini ADD updated_at untuk konsistensi audit dengan
--   tabel users (ada updated_at) + teams (ada updated_at) yang sudah
--   merge ke main. Trigger set_updated_at re-use existing fn dari
--   migration helper functions. Future PRD update bisa codify deviation
--   ini, atau ADR baru yang formalize "audit columns standard" pattern.
--
-- DESIGN DECISION (Option C hybrid, owner-approved 2026-04-28):
--   Schema STRICT ikut PRD ERD literal — tidak include team_id (deviation
--   dari Step 6 task brief draft pertama). Team scope untuk Manager
--   derive via TRANSITIVE owner_id → users.team_id.
--
--   Permission STRICT ikut ADR-002:
--   - Manager INSERT/UPDATE/DELETE: ownership-based (owner_id = auth.uid())
--   - Manager SELECT: ownership OR own team via transitive query users
--   - Member SELECT: explicit DENY Sprint 1 (no policy = FORCE RLS deny).
--     Defer transitive-via-tasks (per ADR-002) ke Step 8 saat tasks ada.
--
--   DELETE: hard DELETE Sprint 1. Soft archive (per ADR-002 catatan)
--   implementable via UPDATE status='archived' di app layer Sprint 2+.
--
-- Refer:
--   - PRD §7 (Database Schema → projects ERD + RLS notes)
--   - ADR-002 (RLS Strategy → projects matrix)
--   - ADR-006 (Auto-RLS platform feature)
--   - Skills: supabase-migration, rls-policy-writer
--
-- Dependencies:
--   - 20260427000000_add_helper_functions.sql (set_updated_at, is_admin,
--     is_manager, is_viewer, current_user_team_id)
--   - 20260427120100_create_users_table.sql (FK target users.id, RLS
--     same-team-or-self policy yang enable transitive owner→team lookup)
--   - 20260427130000_create_teams_table.sql (logical dependency — manager
--     scope via team_id butuh teams exist untuk integrity)
--
-- Lessons learned applied (dari Step 5/6):
--   1. GRANT statements WAJIB inline (RLS evaluate AFTER privilege check)
--   2. Split policy per role per operation (skill rule #3) — 9 policies
--      individual (Member SELECT intentionally absent = explicit deny)
--   3. plpgsql untuk cross-table fn — N/A (tidak bikin function baru)
--
-- Reversal:
--   DROP TRIGGER IF EXISTS trg_projects_set_updated_at ON public.projects;
--   DROP TABLE IF EXISTS public.projects CASCADE;
--
-- Author: Claude Code (skills: supabase-migration, rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  owner_id      uuid REFERENCES public.users(id)
                  ON DELETE SET NULL
                  ON UPDATE CASCADE,
  status        text NOT NULL DEFAULT 'planning'
                  CHECK (status IN ('planning','active','on_hold','completed','archived')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.projects IS
  'Project container untuk tasks. PRD §7, ADR-002. RLS pattern: ownership-based untuk Manager (BUKAN team-based).';
COMMENT ON COLUMN public.projects.owner_id IS
  'FK ke users.id. ON DELETE SET NULL — kalau owner dihapus, project tetap ada (orphan-safe). Per PRD §7 ERD.';
COMMENT ON COLUMN public.projects.status IS
  'Lifecycle: planning|active|on_hold|completed|archived. Per PRD §7. Hanya status="active" counted di productivity dashboard.';
COMMENT ON COLUMN public.projects.completed_at IS
  'Timestamp project complete. Nullable. Per PRD §7. Set otomatis by app/trigger saat status berubah ke completed (Sprint 2+ scope).';
COMMENT ON COLUMN public.projects.updated_at IS
  'Audit standard — DEVIATION dari PRD ERD literal. Konsisten dengan users/teams. Auto-update via trigger set_updated_at.';

COMMENT ON CONSTRAINT projects_owner_id_fkey ON public.projects IS
  'FK projects.owner_id → users.id. ON DELETE SET NULL (orphan-safe untuk pilot), ON UPDATE CASCADE.';


-- ============================================================
-- 2. INDEXES
-- ============================================================
-- id PK sudah otomatis ter-index oleh Postgres.
-- owner_id wajib di-index — dipakai di RLS USING/WITH CHECK + FK lookup.
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects (owner_id);

-- status partial index — query active/planning sering, archived jarang.
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects (status)
  WHERE status <> 'archived';


-- ============================================================
-- 3. TRIGGERS
-- ============================================================
CREATE TRIGGER trg_projects_set_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 4. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 5. POLICIES (split per role per operation — 9 policies total)
-- ============================================================
-- Note: Member SELECT INTENTIONALLY ABSENT. FORCE RLS + no policy match
-- = explicit deny. Sprint 1 design — defer ADR-002 transitive-via-tasks
-- ke Step 8 saat tasks table exist.

-- ============================================================
-- 5a. SELECT — admin: cross-team
-- ============================================================
CREATE POLICY "projects_select_admin_all" ON public.projects
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "projects_select_admin_all" ON public.projects IS
  'Admin: SELECT semua project lintas team. ADR-002 projects matrix.';


-- ============================================================
-- 5b. SELECT — viewer: cross-team management overview
-- ============================================================
CREATE POLICY "projects_select_viewer_all" ON public.projects
  FOR SELECT
  TO authenticated
  USING (public.is_viewer());

COMMENT ON POLICY "projects_select_viewer_all" ON public.projects IS
  'Viewer (manajemen): SELECT semua project untuk dashboard management overview. ADR-002 projects matrix.';


-- ============================================================
-- 5c. SELECT — manager: ownership OR own team via transitive owner→team
-- ============================================================
-- Logic: project visible ke manager kalau
--   (a) dia owner langsung (owner_id = auth.uid()), ATAU
--   (b) project owner ada di team yang sama dengan manager
--       (transitive lookup users.team_id of owner = current_user_team_id())
--
-- EXISTS subquery ke public.users — users RLS policy
-- "users_select_same_team_or_self" enable lookup ini (manager bisa SELECT
-- same-team users). Tidak ada recursive cycle (users RLS tidak query
-- projects). Performance: indexed pada users.team_id + users.id (PK).
CREATE POLICY "projects_select_manager_owner_or_team" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_manager() AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = projects.owner_id
          AND u.team_id IS NOT NULL
          AND u.team_id = public.current_user_team_id()
      )
    )
  );

COMMENT ON POLICY "projects_select_manager_owner_or_team" ON public.projects IS
  'Manager: SELECT project yang dia owner ATAU project owner-nya di team yang sama (transitive via users.team_id). ADR-002.';


-- 5d. SELECT — member: NO POLICY (explicit deny via FORCE RLS)
-- Sprint 1 design decision: Member SELECT projects = ❌ deny semua.
-- Justifikasi: ADR-002 Member SELECT spec = "project where assigned to
-- a task" (transitive via tasks.assignee_id). Tasks table belum exist.
-- Defer policy ini ke Step 8 saat tasks ada.


-- ============================================================
-- 5e. INSERT — admin: any project
-- ============================================================
CREATE POLICY "projects_insert_admin_any" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "projects_insert_admin_any" ON public.projects IS
  'Admin: INSERT project dengan owner_id apa saja (set explicit). ADR-002.';


-- ============================================================
-- 5f. INSERT — manager: project dengan owner_id = self (auto-self)
-- ============================================================
CREATE POLICY "projects_insert_manager_self_owner" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_manager()
    AND owner_id = auth.uid()
  );

COMMENT ON POLICY "projects_insert_manager_self_owner" ON public.projects IS
  'Manager: INSERT project dengan owner_id = auth.uid() (self-ownership enforced). ADR-002 "auto set owner_id".';


-- ============================================================
-- 5g. UPDATE — admin: any project
-- ============================================================
CREATE POLICY "projects_update_admin_all" ON public.projects
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "projects_update_admin_all" ON public.projects IS
  'Admin: UPDATE semua project, semua field. ADR-002.';


-- ============================================================
-- 5h. UPDATE — manager: ownership-based
-- ============================================================
CREATE POLICY "projects_update_manager_owner_only" ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_manager()
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    public.is_manager()
    AND owner_id = auth.uid()
  );

COMMENT ON POLICY "projects_update_manager_owner_only" ON public.projects IS
  'Manager: UPDATE hanya project yang dia owner. ADR-002 ownership-based. WITH CHECK prevent ownership transfer ke user lain.';


-- ============================================================
-- 5i. DELETE — admin: any project
-- ============================================================
CREATE POLICY "projects_delete_admin_all" ON public.projects
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "projects_delete_admin_all" ON public.projects IS
  'Admin: DELETE semua project. ADR-002. Hard DELETE Sprint 1.';


-- ============================================================
-- 5j. DELETE — manager: ownership-based
-- ============================================================
CREATE POLICY "projects_delete_manager_owner_only" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    public.is_manager()
    AND owner_id = auth.uid()
  );

COMMENT ON POLICY "projects_delete_manager_owner_only" ON public.projects IS
  'Manager: DELETE hanya project yang dia owner. ADR-002 ownership-based. Hard DELETE — soft-archive (status=archived) di app layer Sprint 2+.';


-- ============================================================
-- 6. GRANT (lessons learned dari Step 5 — commit 2cba554)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO service_role;
GRANT SELECT ON public.projects TO anon;


-- =============================================================
-- TODO (next migrations Sprint 1):
--   20260427150000_create_tasks_table.sql  — tasks (Step 8)
--   POST-Step 8: ALTER policy projects — add Member SELECT transitive-via-tasks
--                (per ADR-002 spec lengkap, deferred dari migration ini)
-- =============================================================
