-- =============================================================
-- Migration: 20260427150000_create_tasks_table
--
-- Tujuan: Bikin tabel public.tasks (CORE ENTITY pilot) dengan 18 kolom
--   per PRD §7 ERD literal. RLS pattern split per role per operation:
--   - Admin: cross-team all CRUD
--   - Viewer: cross-team SELECT only
--   - Manager: scoped via project visibility (match Step 7 design)
--   - Member: assignee-based SELECT/UPDATE only (NO INSERT/DELETE Sprint 1)
--
-- Schema (per PRD §7 ERD line 478-497) — 18 kolom literal:
--   core      : id, project_id, parent_id (subtask), title, description
--   assignment: assignee_id, created_by
--   workflow  : status (5 enum), priority (4 enum), completed_at
--   planning  : deadline (DATE), estimated_hours, start_date
--   cowork    : source (3 enum), source_file_id, needs_review
--   audit     : created_at, updated_at
--
-- DESIGN DECISIONS (owner-approved 2026-04-28):
--   1. Schema: PRD literal 18 kolom (created_by bukan reporter_id, deadline DATE bukan due_date)
--   2. Manager INSERT scope: hybrid match SELECT visibility (project ownership OR own team)
--   3. Member INSERT: defer Sprint 1 (no policy = explicit deny via FORCE RLS)
--   4. Member UPDATE field lock: status + completed_at + description allowed; rest locked via trigger
--   5. completed_at auto-set: BEFORE UPDATE OF status trigger per PRD §7 catatan
--   6. task_watchers reference: deferred — Member SELECT = assignee_id only Sprint 1
--
-- Manager visibility OPTIMIZATION:
--   Instead of nested EXISTS (projects → users) di tasks RLS, single-level
--   EXISTS (projects) cukup. Projects RLS untuk manager sudah filter
--   ownership-or-team transitively. Pattern yang lebih clean + maintainable.
--   Verified no recursive RLS cycle: tasks → projects → users → STOP.
--
-- Refer:
--   - PRD §7 (Database Schema → tasks ERD + RLS notes line 562-568)
--   - PRD §7 line 554 (indexes recommendation)
--   - ADR-002 (RLS Strategy → tasks matrix line 69-87)
--   - ADR-006 (Auto-RLS platform feature)
--   - Skills: supabase-migration, rls-policy-writer
--
-- Dependencies:
--   - 20260427000000_add_helper_functions.sql (set_updated_at, is_admin,
--     is_manager, is_viewer, current_user_team_id)
--   - 20260427120100_create_users_table.sql (FK target users.id, RLS)
--   - 20260427130000_create_teams_table.sql (logical dep)
--   - 20260427140000_create_projects_table.sql (FK target projects.id, RLS)
--
-- Lessons learned applied (Step 5/6/7):
--   1. GRANT statements WAJIB inline (RLS evaluate AFTER privilege check)
--   2. plpgsql untuk function dengan cross-table reference (lazy validation)
--   3. Split policy per role per operation (skill rule #3)
--   4. Field lock via trigger pattern (mirror users_field_lock dari Step 5)
--
-- Reversal:
--   DROP TRIGGER IF EXISTS trg_tasks_member_field_lock ON public.tasks;
--   DROP TRIGGER IF EXISTS trg_tasks_set_completed_at ON public.tasks;
--   DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON public.tasks;
--   DROP FUNCTION IF EXISTS public.tasks_member_field_lock();
--   DROP FUNCTION IF EXISTS public.tasks_set_completed_at();
--   DROP TABLE IF EXISTS public.tasks CASCADE;
--
-- Author: Claude Code (skills: supabase-migration, rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE (18 kolom per PRD §7 literal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
  parent_id       uuid REFERENCES public.tasks(id)
                    ON DELETE CASCADE
                    ON UPDATE CASCADE,
  title           text NOT NULL,
  description     text,
  assignee_id     uuid REFERENCES public.users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE,
  created_by      uuid REFERENCES public.users(id)
                    ON DELETE SET NULL
                    ON UPDATE CASCADE,
  status          text NOT NULL DEFAULT 'todo'
                    CHECK (status IN ('todo','in_progress','review','done','blocked')),
  priority        text NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('low','medium','high','urgent')),
  deadline        date,
  estimated_hours integer CHECK (estimated_hours IS NULL OR estimated_hours > 0),
  start_date      date,
  source          text NOT NULL DEFAULT 'manual'
                    CHECK (source IN ('manual','cowork-agent','csv-import')),
  source_file_id  text,
  needs_review    boolean NOT NULL DEFAULT false,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tasks IS
  'Core entity — task workflow. PRD §7, ADR-002 line 69-87. RLS: Admin/Viewer cross-team, Manager via project visibility, Member assignee-based.';
COMMENT ON COLUMN public.tasks.parent_id IS
  'Subtask FK self-reference. Max depth 2 enforced di app layer (PRD §7). ON DELETE CASCADE — subtask die dengan parent.';
COMMENT ON COLUMN public.tasks.assignee_id IS
  'User yang assigned task. Nullable — task bisa unassigned. ON DELETE SET NULL untuk orphan-safe.';
COMMENT ON COLUMN public.tasks.created_by IS
  'User yang create task (auto-set ke auth.uid() saat INSERT). PRD ERD literal naming (bukan reporter_id).';
COMMENT ON COLUMN public.tasks.status IS
  '5-enum lifecycle. PRD §7. completed_at auto-set saat status berubah ke done (DB trigger).';
COMMENT ON COLUMN public.tasks.deadline IS
  'Tanggal due. DATE type per PRD ERD literal (bukan timestamptz).';
COMMENT ON COLUMN public.tasks.estimated_hours IS
  'Untuk Gantt view (Sprint 2). Nullable. Positive integer.';
COMMENT ON COLUMN public.tasks.source IS
  'Asal task creation. manual = UI; cowork-agent = MoM auto-import (Sprint 5); csv-import = bulk upload (Sprint 4).';
COMMENT ON COLUMN public.tasks.needs_review IS
  'Flag untuk Cowork agent fuzzy-match yang ragu (score 0.5-0.7). PRD F9.';
COMMENT ON COLUMN public.tasks.completed_at IS
  'Auto-set saat status berubah ke done via trigger. Null saat status non-done.';


-- ============================================================
-- 2. INDEXES (per PRD §7 line 554 + RLS perf)
-- ============================================================
-- Composite (assignee_id, status) — Member SELECT + status filter
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status
  ON public.tasks (assignee_id, status);

-- Composite (project_id, status) — Manager SELECT + status filter + dashboard
CREATE INDEX IF NOT EXISTS idx_tasks_project_status
  ON public.tasks (project_id, status);

-- deadline — overdue/upcoming queries (notification)
CREATE INDEX IF NOT EXISTS idx_tasks_deadline
  ON public.tasks (deadline)
  WHERE status NOT IN ('done','blocked');

-- completed_at — productivity dashboard (cycle time calc)
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at
  ON public.tasks (completed_at)
  WHERE completed_at IS NOT NULL;

-- parent_id — subtask hierarchy lookup (partial — most tasks tidak subtask)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id
  ON public.tasks (parent_id)
  WHERE parent_id IS NOT NULL;


-- ============================================================
-- 3. TRIGGER FUNCTIONS
-- ============================================================

-- 3a. Audit standard: auto-update updated_at (function existing dari helper migration)
-- Trigger registration di section 4 below.

-- 3b. Auto-set completed_at saat status berubah ke 'done' (PRD §7 line 554)
CREATE OR REPLACE FUNCTION public.tasks_set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Status berubah ke 'done' (transition not-done → done)
  IF NEW.status = 'done' AND OLD.status <> 'done' THEN
    NEW.completed_at := now();
  -- Status revert dari 'done' ke status lain (transition done → not-done)
  ELSIF NEW.status <> 'done' AND OLD.status = 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  -- Else: no-op (status berubah antara non-done, atau no status change)
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tasks_set_completed_at IS
  'Auto-set completed_at saat status berubah ke done. Revert ke NULL saat status balik dari done. PRD §7 line 554.';


-- 3c. Member field lock — only allow status, completed_at, description.
-- Pattern dari users_field_lock (Step 5). Admin/Manager bypass.
CREATE OR REPLACE FUNCTION public.tasks_member_field_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Admin/Manager bypass — full UPDATE permission
  IF public.is_admin() OR public.is_manager() THEN
    RETURN NEW;
  END IF;

  -- Member (atau role lain non-admin/manager): reset semua field selain
  -- (status, completed_at, description) ke OLD value.
  -- Sprint 1 design: Member UPDATE limited per ADR-002 (status + completed_at)
  -- + description (typical work flow notes).
  NEW.id              := OLD.id;
  NEW.project_id      := OLD.project_id;
  NEW.parent_id       := OLD.parent_id;
  NEW.title           := OLD.title;
  NEW.assignee_id     := OLD.assignee_id;
  NEW.created_by      := OLD.created_by;
  NEW.priority        := OLD.priority;
  NEW.deadline        := OLD.deadline;
  NEW.estimated_hours := OLD.estimated_hours;
  NEW.start_date      := OLD.start_date;
  NEW.source          := OLD.source;
  NEW.source_file_id  := OLD.source_file_id;
  NEW.needs_review    := OLD.needs_review;
  NEW.created_at      := OLD.created_at;
  -- updated_at handled by separate trigger
  -- Allowed (kept as NEW): status, completed_at, description

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tasks_member_field_lock IS
  'Trigger fn — Member UPDATE field lock (allowed: status, completed_at, description). Bypass admin/manager. ADR-002 line 76, Sprint 1 brief.';


-- ============================================================
-- 4. TRIGGERS (alphabetical order = execution order on same event)
-- ============================================================
-- Order: m_field_lock → s_completed_at → s_updated_at
-- Reasoning: field_lock fires FIRST (resets non-allowed fields), then
-- completed_at_set evaluates against post-lock NEW, then updated_at.

CREATE TRIGGER trg_tasks_member_field_lock
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_member_field_lock();

CREATE TRIGGER trg_tasks_set_completed_at
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_set_completed_at();

CREATE TRIGGER trg_tasks_set_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 5. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 6. POLICIES (10 policies — split per role per operation)
-- ============================================================

-- ============================================================
-- 6a. SELECT — admin: cross-team all
-- ============================================================
CREATE POLICY "tasks_select_admin_all" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "tasks_select_admin_all" ON public.tasks IS
  'Admin: SELECT semua task lintas team. ADR-002 line 73.';


-- ============================================================
-- 6b. SELECT — viewer: cross-team management overview
-- ============================================================
CREATE POLICY "tasks_select_viewer_all" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (public.is_viewer());

COMMENT ON POLICY "tasks_select_viewer_all" ON public.tasks IS
  'Viewer (manajemen): SELECT semua task untuk dashboard management overview. ADR-002 line 73.';


-- ============================================================
-- 6c. SELECT — manager: via project visibility (match Step 7 design)
-- ============================================================
-- Logic: manager bisa SELECT task kalau task.project_id ada di project
-- yang manager bisa SELECT. Projects RLS sudah handle ownership-or-team
-- transitive — kita cuma EXISTS check projects.
CREATE POLICY "tasks_select_manager_via_project" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
    )
  );

COMMENT ON POLICY "tasks_select_manager_via_project" ON public.tasks IS
  'Manager: SELECT task via project visibility (project ownership OR own team transitive). Pattern match projects_select_manager_owner_or_team. Single EXISTS leverages projects RLS — no nested users lookup.';


-- ============================================================
-- 6d. SELECT — member: assignee-based
-- ============================================================
-- Sprint 1 design: assignee only (no task_watchers reference — tabel belum ada,
-- defer ke migration berikutnya saat task_watchers spec'd).
CREATE POLICY "tasks_select_member_assignee" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    public.is_member()
    AND assignee_id = auth.uid()
  );

COMMENT ON POLICY "tasks_select_member_assignee" ON public.tasks IS
  'Member: SELECT task assigned ke diri sendiri saja. ADR-002 line 73 (task_watchers part deferred to future migration).';


-- ============================================================
-- 6e. INSERT — admin: any task
-- ============================================================
CREATE POLICY "tasks_insert_admin_any" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "tasks_insert_admin_any" ON public.tasks IS
  'Admin: INSERT task ke project apa saja. ADR-002 line 74.';


-- ============================================================
-- 6f. INSERT — manager: via project visibility (NEW row check)
-- ============================================================
CREATE POLICY "tasks_insert_manager_via_project" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
    )
  );

COMMENT ON POLICY "tasks_insert_manager_via_project" ON public.tasks IS
  'Manager: INSERT task ke project yang dia bisa SELECT (ownership OR own team). Hybrid scope (owner-approved deviation dari ADR-002 literal "All").';


-- 6g. INSERT — Member: NO POLICY (explicit deny Sprint 1)
-- ADR-002 line 74 spec "subtask dari task assigned" — defer ke migration
-- berikutnya saat workflow subtask spec'd. Sprint 1 Member NO INSERT.

-- 6h. INSERT — Viewer: NO POLICY (deny per ADR-002)


-- ============================================================
-- 6i. UPDATE — admin: any task
-- ============================================================
CREATE POLICY "tasks_update_admin_all" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "tasks_update_admin_all" ON public.tasks IS
  'Admin: UPDATE semua task. Field lock trigger bypassed via is_admin() check.';


-- ============================================================
-- 6j. UPDATE — manager: via project visibility (USING + CHECK both sides)
-- ============================================================
CREATE POLICY "tasks_update_manager_via_project" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
    )
  )
  WITH CHECK (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
    )
  );

COMMENT ON POLICY "tasks_update_manager_via_project" ON public.tasks IS
  'Manager: UPDATE task via project visibility. USING checks OLD project, CHECK checks NEW project — prevents moving task to invisible project.';


-- ============================================================
-- 6k. UPDATE — member: assignee-based (limited via field lock trigger)
-- ============================================================
CREATE POLICY "tasks_update_member_assignee_limited" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    public.is_member()
    AND assignee_id = auth.uid()
  )
  WITH CHECK (
    public.is_member()
    AND assignee_id = auth.uid()
  );

COMMENT ON POLICY "tasks_update_member_assignee_limited" ON public.tasks IS
  'Member: UPDATE task assigned ke diri. Field lock trigger membatasi ke status + completed_at + description (ADR-002 line 76 + brief).';


-- ============================================================
-- 6l. DELETE — admin: any
-- ============================================================
CREATE POLICY "tasks_delete_admin_all" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "tasks_delete_admin_all" ON public.tasks IS
  'Admin: DELETE semua task. ADR-002 line 77.';


-- ============================================================
-- 6m. DELETE — manager: via project visibility
-- ============================================================
-- Note: ADR-002 line 77 spec Manager DELETE = "task yang created_by =
-- auth.uid()". Hybrid Step 8: ikut project visibility (lebih konsisten
-- dengan SELECT/UPDATE scope). Document deviation.
CREATE POLICY "tasks_delete_manager_via_project" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    public.is_manager()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
    )
  );

COMMENT ON POLICY "tasks_delete_manager_via_project" ON public.tasks IS
  'Manager: DELETE task via project visibility. Deviation dari ADR-002 line 77 ("task yang created_by = auth.uid()") untuk konsistensi dengan SELECT/UPDATE Manager scope di Step 8.';


-- 6n. DELETE — Member, Viewer: NO POLICY (deny per ADR-002 line 77)


-- ============================================================
-- 7. GRANT (lessons learned dari Step 5 — commit 2cba554)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO service_role;
GRANT SELECT ON public.tasks TO anon;


-- =============================================================
-- TODO (next migrations Sprint 1):
--   20260427150100_update_member_select_projects.sql — RESOLVE Step 7 defer
--                  (Member SELECT projects via transitive tasks assignment)
--
-- TODO (post-Sprint 1):
--   - task_watchers table + RLS — extend Member SELECT tasks
--   - Member INSERT subtask policy — saat workflow subtask spec'd
-- =============================================================
