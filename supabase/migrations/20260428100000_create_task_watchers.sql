-- =============================================================
-- Migration: 20260428100000_create_task_watchers
--
-- Tujuan: Tabel task_watchers untuk M2M user × task relation. Dipakai
--   untuk notif emission Q3 carry-over (Sprint 3 Step 3): assignee +
--   creator + @mentioned users auto-add saat task created. PRD F7
--   notification escalation depend on watchers untuk fan-out.
--
-- Schema (per PRD §7 ERD line 515-518):
--   task_id, user_id, created_at — composite PK (task_id, user_id)
--
-- RLS strategy:
--   - SELECT: follow task visibility (manager/member/viewer)
--   - INSERT/DELETE: self-only OR admin (member subscribe/unsubscribe own)
--
-- Refer:
--   - PRD §7 ERD line 515-518
--   - PRD §3.1 F7 (notification escalation)
--   - ADR-002 line 102-107 (task_watchers RLS matrix)
--   - Sprint 3 plan Step 1
--
-- Dependencies:
--   - 20260427150000_create_tasks_table.sql (FK target tasks.id)
--   - 20260427120100_create_users_table.sql (FK target users.id)
--
-- Reversal:
--   DROP TABLE IF EXISTS public.task_watchers CASCADE;
--
-- Author: Claude Code (Sprint 3 Step 1)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_watchers (
  task_id    uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (task_id, user_id)
);

COMMENT ON TABLE public.task_watchers IS
  'M2M user × task — tracks user yang receive notif untuk task events. PRD §7, F7.';


-- ============================================================
-- 2. INDEXES
-- ============================================================
-- PK (task_id, user_id) auto-indexed.
-- Tambah index untuk reverse lookup (user_id → tasks) untuk notif fan-in.
CREATE INDEX IF NOT EXISTS idx_task_watchers_user_id ON public.task_watchers (user_id);


-- ============================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_watchers FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 4. POLICIES
-- ============================================================

-- 4a. SELECT — follow task visibility (per ADR-002 line 106 "mengikuti SELECT task")
-- Pakai EXISTS dengan task RLS auto-filter di subquery.
CREATE POLICY "task_watchers_select_via_task" ON public.task_watchers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id)
  );

COMMENT ON POLICY "task_watchers_select_via_task" ON public.task_watchers IS
  'Follow task visibility — kalau user bisa SELECT task, bisa SELECT watchers list. ADR-002.';


-- 4b. INSERT — own user_id OR admin
CREATE POLICY "task_watchers_insert_self_or_admin" ON public.task_watchers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR public.is_admin()
  );

COMMENT ON POLICY "task_watchers_insert_self_or_admin" ON public.task_watchers IS
  'Member subscribe own (user_id = self), admin can subscribe siapa saja. ADR-002.';


-- 4c. DELETE — own user_id OR admin
CREATE POLICY "task_watchers_delete_self_or_admin" ON public.task_watchers
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() OR public.is_admin()
  );

COMMENT ON POLICY "task_watchers_delete_self_or_admin" ON public.task_watchers IS
  'Member unsubscribe own. Admin can unsubscribe siapa saja. No UPDATE policy — table M2M, no mutable fields.';


-- ============================================================
-- 5. GRANT
-- ============================================================
GRANT SELECT, INSERT, DELETE ON public.task_watchers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_watchers TO service_role;
-- anon: no access.


-- =============================================================
-- TODO Sprint 3:
--   - Step 3: DB trigger auto-add assignee + creator saat task INSERT
--   - Step 3: trigger auto-emit notif untuk all watchers saat task UPDATE
-- =============================================================
