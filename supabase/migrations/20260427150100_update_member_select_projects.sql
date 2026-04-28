-- =============================================================
-- Migration: 20260427150100_update_member_select_projects
--
-- Tujuan: RESOLVE Step 7 explicit deny defer untuk Member SELECT projects.
--   Step 7 design (Option C hybrid, owner-approved 2026-04-27) bilang
--   Member SELECT projects = ❌ deny Sprint 1 karena tasks table belum
--   exist. Sekarang tasks table sudah ada (migration 20260427150000) —
--   tambah policy Member SELECT projects via transitive tasks assignment.
--
-- Logic:
--   Member bisa SELECT project kalau dia punya minimal 1 task assigned
--   di project itu. Match ADR-002 spec line 64 (Member SELECT projects =
--   "project di mana dia assigned di salah satu task").
--
-- No recursive RLS cycle:
--   - projects (Member) → query tasks
--   - tasks (Member) → simple assignee_id check, no projects query
--   - Chain stops at tasks. Verified safe.
--
-- Performance:
--   - tasks indexed (assignee_id, status) composite
--   - EXISTS subquery efficient — Postgres short-circuit
--   - Pilot scale (30 users, ~hundreds of tasks): negligible cost
--
-- Refer:
--   - ADR-002 line 64 (Member SELECT projects spec)
--   - 20260427140000_create_projects_table.sql (Step 7 explicit deny note)
--   - 20260427150000_create_tasks_table.sql (tasks table)
--   - Sprint 1 Step 8 brief (resolve defer)
--
-- Dependencies:
--   - 20260427140000_create_projects_table.sql (public.projects)
--   - 20260427150000_create_tasks_table.sql (public.tasks)
--
-- Reversal:
--   DROP POLICY IF EXISTS "projects_select_member_via_tasks" ON public.projects;
--
-- Author: Claude Code (skills: rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. ADD POLICY — Member SELECT projects via transitive tasks
-- ============================================================
CREATE POLICY "projects_select_member_via_tasks" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_member()
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.project_id = projects.id
        AND t.assignee_id = auth.uid()
    )
  );

COMMENT ON POLICY "projects_select_member_via_tasks" ON public.projects IS
  'Member: SELECT project di mana dia punya minimal 1 task assigned. Resolves Step 7 explicit deny defer. ADR-002 line 64.';
