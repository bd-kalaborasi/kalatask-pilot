-- =============================================================
-- Migration: 20260428130000_create_comments_table
--
-- Tujuan: Sprint 4.5 — collaboration depth. Comments thread per task
--   (flat, no threading). Diskusi instant via Supabase Realtime
--   broadcast (per ADR-008). RLS mengikuti task parent visibility.
--
-- Schema (per PRD §7 ERD line 498-505):
--   id, task_id, author_id, body (markdown), is_system, created_at,
--   updated_at (DEVIATION audit standard, mirror Sprint 1 pattern)
--
-- @mention pattern (Q2 owner override): tokens dalam body Markdown
--   pakai format @[Full Name](user_uuid). Backend extract UUIDs
--   server-side di post_comment RPC (Step 3). Tabel comments tidak
--   simpan parsed mentions — derive dari body parse.
--
-- RLS pattern (per ADR-002 + PRD §7 line 568):
--   - SELECT: mengikuti task parent (Member assignee, Manager team,
--     Admin/Viewer all). Pakai SECURITY DEFINER helper untuk avoid
--     recursive RLS cycle (mirror Sprint 1 fix_rls_cycle pattern).
--   - INSERT: own author_id (auth.uid()) + caller harus punya SELECT
--     access ke task parent.
--   - UPDATE: own comment only (author_id = auth.uid()) + admin override
--   - DELETE: own comment + admin override
--   - Cowork agent (admin role, system) dapat INSERT dengan is_system=true
--
-- Refer:
--   - PRD §7 ERD line 498-505
--   - ADR-008 Realtime architecture
--   - Sprint 4.5 plan Step 1
--   - Sprint 1 helper member_has_task_in_project (RLS cycle pattern)
--
-- Dependencies:
--   - 20260427120100_create_users_table.sql
--   - 20260427150000_create_tasks_table.sql
--   - 20260427150200_fix_rls_cycle_member_projects.sql (helper available)
--
-- Reversal:
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.comments;
--   DROP TABLE IF EXISTS public.comments CASCADE;
--   DROP FUNCTION IF EXISTS public.user_can_access_task(uuid);
--
-- Author: Claude Code (Sprint 4.5 Step 1)
-- =============================================================


-- ============================================================
-- 1. SECURITY DEFINER helper — break potential RLS cycle
--    (comments → tasks → comments... not strictly recursive,
--    but defensive untuk konsistensi dengan member_has_task_in_project)
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_can_access_task(p_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Admin/Viewer: cross-team access
  IF public.is_admin() OR public.is_viewer() THEN
    RETURN EXISTS (SELECT 1 FROM public.tasks WHERE id = p_task_id);
  END IF;

  -- Manager: via project visibility (transitive owner_id → team)
  IF public.is_manager() THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = p_task_id
        AND (
          p.owner_id = v_uid
          OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = p.owner_id
              AND u.team_id IS NOT NULL
              AND u.team_id = public.current_user_team_id()
          )
        )
    );
  END IF;

  -- Member: assignee-based
  IF public.is_member() THEN
    RETURN EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = p_task_id AND assignee_id = v_uid
    );
  END IF;

  RETURN false;
END;
$$;

COMMENT ON FUNCTION public.user_can_access_task(uuid) IS
  'SECURITY DEFINER helper: check kalau current auth.uid() bisa SELECT task p_task_id. Mirror tasks RLS matrix (Admin/Viewer all, Manager via project, Member assignee). Sprint 4.5 ADR-008.';


-- ============================================================
-- 2. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id   uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  body        text NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
  is_system   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.comments IS
  'Diskusi per task (flat thread, no nesting). Realtime broadcast target via supabase_realtime publication. Markdown body per Sprint 4.5 ADR-008.';
COMMENT ON COLUMN public.comments.author_id IS
  'NULL kalau system-generated (Cowork agent). User-authored comment selalu set ke auth.uid() saat INSERT.';
COMMENT ON COLUMN public.comments.body IS
  'Markdown body, max 2000 char. @mention tokens format @[Full Name](user_uuid) per Q2 override Sprint 4.5.';
COMMENT ON COLUMN public.comments.is_system IS
  'true untuk auto-comment dari Cowork agent (Sprint 5+). false untuk user-authored.';


-- ============================================================
-- 3. INDEXES
-- ============================================================
-- (task_id, created_at) — paginated fetch oldest-first
CREATE INDEX IF NOT EXISTS idx_comments_task_created
  ON public.comments (task_id, created_at);

-- author_id — own comment lookup (edit/delete RLS)
CREATE INDEX IF NOT EXISTS idx_comments_author
  ON public.comments (author_id)
  WHERE author_id IS NOT NULL;


-- ============================================================
-- 4. TRIGGER updated_at
-- ============================================================
CREATE TRIGGER trg_comments_set_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 5. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 6. POLICIES
-- ============================================================

-- 6a. SELECT — mengikuti task parent visibility (via helper)
CREATE POLICY "comments_select_via_task_access" ON public.comments
  FOR SELECT
  TO authenticated
  USING (public.user_can_access_task(task_id));

COMMENT ON POLICY "comments_select_via_task_access" ON public.comments IS
  'Comments visible ke user kalau dia bisa SELECT task parent (via helper user_can_access_task — bypass tasks RLS untuk avoid recursive lookup).';


-- 6b. INSERT — own author + task accessible
CREATE POLICY "comments_insert_own" ON public.comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.user_can_access_task(task_id)
    AND is_system = false
  );

COMMENT ON POLICY "comments_insert_own" ON public.comments IS
  'User INSERT comment: author_id = auth.uid(), task accessible, is_system=false. System comment (Cowork) via service_role bypass.';


-- 6c. UPDATE — own comment only (admin override via separate policy)
CREATE POLICY "comments_update_own" ON public.comments
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid() AND is_system = false);

COMMENT ON POLICY "comments_update_own" ON public.comments IS
  'Author dapat edit own comment. is_system locked false (cannot self-elevate). Q1 (a) — author full control.';


-- 6d. UPDATE — admin override
CREATE POLICY "comments_update_admin_any" ON public.comments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "comments_update_admin_any" ON public.comments IS
  'Admin dapat moderate any comment (edit untuk redact/clarify). Q1 (a).';


-- 6e. DELETE — own comment
CREATE POLICY "comments_delete_own" ON public.comments
  FOR DELETE
  TO authenticated
  USING (author_id = auth.uid());

COMMENT ON POLICY "comments_delete_own" ON public.comments IS
  'Author dapat delete own comment. Q1 (a).';


-- 6f. DELETE — admin any
CREATE POLICY "comments_delete_admin_any" ON public.comments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "comments_delete_admin_any" ON public.comments IS
  'Admin dapat moderate-delete any comment. Q1 (a) admin override.';


-- ============================================================
-- 7. GRANT
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO service_role;
GRANT EXECUTE ON FUNCTION public.user_can_access_task(uuid) TO authenticated;


-- ============================================================
-- 8. REALTIME PUBLICATION (per ADR-008)
-- ============================================================
-- Add comments table ke supabase_realtime publication. Realtime client-side
-- subscribe `task:${task_id}` channel akan receive postgres_changes INSERT
-- events untuk filter task_id=eq.${id}.
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. Verify table exists + RLS enabled:
--      SELECT relname, relrowsecurity, relforcerowsecurity
--      FROM pg_class WHERE relname = 'comments';
--      → relrowsecurity=t, relforcerowsecurity=t
--
--   2. Verify policies (6 total):
--      SELECT polname FROM pg_policy
--      WHERE polrelid = 'public.comments'::regclass
--      ORDER BY polname;
--
--   3. Verify Realtime publication:
--      SELECT pubname, schemaname, tablename FROM pg_publication_tables
--      WHERE tablename = 'comments';
--      → 1 row dengan pubname='supabase_realtime'
--
--   4. Verify helper SECURITY DEFINER:
--      SELECT prosecdef FROM pg_proc WHERE proname = 'user_can_access_task';
--      → t
-- =============================================================
