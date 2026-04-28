-- =============================================================
-- Migration: 20260427150200_fix_rls_cycle_member_projects
--
-- Tujuan: Fix infinite RLS recursion cycle (PostgreSQL error 42P17) di
--   tasks table queries. Cycle muncul antara tasks RLS dan projects RLS
--   setelah migration 20260427150100 add policy projects_select_member_via_tasks.
--
-- ROOT CAUSE:
--   1. tasks_select_manager_via_project (di 20260427150000) USING:
--        is_manager() AND EXISTS (SELECT 1 FROM projects p WHERE p.id = tasks.project_id)
--   2. projects_select_member_via_tasks (di 20260427150100) USING:
--        is_member() AND EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = projects.id AND t.assignee_id = auth.uid())
--
--   Postgres planner detect cyclic table reference at PLAN time:
--     tasks → projects → tasks → projects → ...
--
--   Even though `is_manager()` AND `is_member()` mutually exclusive
--   (a user can't be both), PostgreSQL static analysis flag plan as
--   infinite recursion → throws 42P17 untuk SEMUA queries touching tasks
--   atau Member queries projects.
--
--   IMPACT (sebelum fix): all tasks SELECT/INSERT/UPDATE/DELETE fail
--   regardless of user role. RLS broken globally untuk tasks table.
--
-- FIX (Option A — owner approved 2026-04-28):
--   SECURITY DEFINER helper function `member_has_task_in_project(uuid)`
--   bypass tasks RLS at function boundary. Postgres planner sees:
--     projects policy → SECURITY DEFINER call → STOP (no further RLS chain)
--   Function internally queries tasks dengan definer privileges (RLS bypass).
--   Cycle broken di function call boundary.
--
-- DESIGN ALTERNATIVE NOT TAKEN:
--   Option B (helper untuk tasks side juga) — over-engineered untuk pilot;
--     minimum surgery preferred per skill rule (one helper sufficient untuk
--     break cycle).
--   Option C (drop policy, revert Step 7 resolve) — would lose Member SELECT
--     projects feature. Option A preserve design intent.
--
-- Skill compliance:
--   Skill rule #5 (rls-policy-writer) — "avoid recursive RLS lookup,
--   use SECURITY DEFINER helper" — directly applied here.
--   Skill issue Pattern E lessons (Step 5 commit 439e4ae) — pakai
--   LANGUAGE plpgsql untuk lazy validation cross-table reference.
--
-- Refer:
--   - 20260427150000_create_tasks_table.sql (tasks_select_manager_via_project)
--   - 20260427150100_update_member_select_projects.sql (the policy being replaced)
--   - .claude/skills/rls-policy-writer/SKILL.md §5 (recursive RLS pitfall)
--   - PostgreSQL docs error code 42P17:
--     https://www.postgresql.org/docs/current/errcodes-appendix.html
--
-- Dependencies:
--   - 20260427150100_update_member_select_projects.sql (policy yang di-replace)
--   - 20260427150000_create_tasks_table.sql (tasks table exist)
--   - 20260427120100_create_users_table.sql (untuk auth.uid context)
--
-- Reversal:
--   DROP POLICY IF EXISTS "projects_select_member_via_tasks" ON public.projects;
--   DROP FUNCTION IF EXISTS public.member_has_task_in_project(uuid);
--   -- Then re-create original (cyclic) policy from 20260427150100 — NOT recommended
--
-- Author: Claude Code (skill: rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. Helper function — SECURITY DEFINER bypasses RLS, breaks cycle
-- ============================================================
-- LANGUAGE plpgsql untuk lazy validation cross-table reference (Pattern E
-- lessons learned dari Step 5 — LANGUAGE sql eager-validate akan throw
-- "relation tasks does not exist" saat CREATE FUNCTION jalankan duluan).
-- STABLE marking — fn deterministic dalam single query (RLS-friendly).
-- SET search_path = public, auth — lock schema resolution untuk SECURITY
-- DEFINER safety (prevent privilege escalation via search_path manipulation).
CREATE OR REPLACE FUNCTION public.member_has_task_in_project(p_project_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tasks
    WHERE project_id = p_project_id
      AND assignee_id = auth.uid()
  );
END;
$$;

COMMENT ON FUNCTION public.member_has_task_in_project(uuid) IS
  'SECURITY DEFINER helper: check kalau current user (auth.uid) ter-assigned ke task di project P. Bypass tasks RLS untuk break recursion cycle dengan projects_select_member_via_tasks policy. Skill rule #5 (rls-policy-writer §5).';


-- ============================================================
-- 2. Replace policy — drop cyclic version, create cycle-free version
-- ============================================================
DROP POLICY IF EXISTS "projects_select_member_via_tasks" ON public.projects;

CREATE POLICY "projects_select_member_via_tasks" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_member()
    AND public.member_has_task_in_project(id)
  );

COMMENT ON POLICY "projects_select_member_via_tasks" ON public.projects IS
  'Member SELECT projects: visible kalau ada at least 1 task di project assigned ke current user. Pakai SECURITY DEFINER helper member_has_task_in_project untuk avoid RLS cycle (Postgres planner detect cyclic ref di PLAN time). Resolves Step 7 explicit deny defer + fix 42P17 dari migration 20260427150100.';


-- =============================================================
-- POST-FIX VERIFICATION (run after Dashboard apply):
--   1. Verify helper exists:
--      SELECT proname, prosecdef FROM pg_proc
--      WHERE proname = 'member_has_task_in_project';
--      Expected: prosecdef = true (SECURITY DEFINER)
--
--   2. Verify policy replaced:
--      SELECT polname, pg_get_expr(polqual, polrelid)
--      FROM pg_policy
--      WHERE polname = 'projects_select_member_via_tasks';
--      Expected: USING expression contains "member_has_task_in_project"
--
--   3. Re-run pgTAP test tasks_rls.test.sql — expect 33/33 pass.
-- =============================================================
