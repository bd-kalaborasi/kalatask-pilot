-- =============================================================
-- Migration: 20260428110100_add_workload_rpc
--
-- Tujuan: Implement RPC function get_workload_summary per ADR-004.
--   Returns JSONB shape match PRD §13 line 615-629 untuk F5 workload view.
--
-- Per ADR-004: SECURITY INVOKER → RLS auto-scope.
-- Threshold "overloaded" dari app_settings.workload_overloaded_threshold
-- (default 10 — Q4 owner answer).
--
-- Refer:
--   - ADR-004
--   - PRD §13 line 613-629 (API spec workload-summary)
--   - PRD §3.1 F5 line 220-223
--   - app_settings table commit fcfb5c4
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.get_workload_summary(uuid);
--
-- Author: Claude Code (Sprint 3 Step 5)
-- =============================================================


CREATE OR REPLACE FUNCTION public.get_workload_summary(
  p_team_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_threshold int;
  v_members jsonb;
BEGIN
  -- Read threshold dari app_settings (default 10 fallback)
  SELECT (value)::text::int
  INTO v_threshold
  FROM public.app_settings
  WHERE key = 'workload_overloaded_threshold';

  IF v_threshold IS NULL THEN
    v_threshold := 10;
  END IF;

  -- Build members array
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.full_name), '[]'::jsonb)
  INTO v_members
  FROM (
    SELECT
      u.id AS user_id,
      u.full_name,
      COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'blocked'))::int AS open_tasks,
      COUNT(t.id) FILTER (
        WHERE t.status NOT IN ('done', 'blocked')
          AND t.deadline IS NOT NULL
          AND t.deadline < CURRENT_DATE
      )::int AS overdue,
      COUNT(t.id) FILTER (
        WHERE t.status NOT IN ('done', 'blocked')
          AND t.priority IN ('high', 'urgent')
      )::int AS high_priority,
      CASE
        WHEN COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'blocked'))
             > v_threshold THEN 'overloaded'
        WHEN COUNT(t.id) FILTER (WHERE t.status NOT IN ('done', 'blocked'))
             > (v_threshold * 0.7) THEN 'high'
        ELSE 'normal'
      END AS load_indicator
    FROM public.users u
    LEFT JOIN public.tasks t ON t.assignee_id = u.id
    WHERE u.role = 'member'
      AND (p_team_id IS NULL OR u.team_id = p_team_id)
    GROUP BY u.id, u.full_name
  ) r;

  RETURN jsonb_build_object(
    'team_id', p_team_id,
    'threshold', v_threshold,
    'members', v_members
  );
END;
$$;

COMMENT ON FUNCTION public.get_workload_summary(uuid) IS
  'F5 workload view data. SECURITY INVOKER + RLS auto-scope. Threshold dari app_settings.workload_overloaded_threshold. ADR-004.';

GRANT EXECUTE ON FUNCTION public.get_workload_summary(uuid) TO authenticated;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   SELECT public.get_workload_summary(NULL); -- admin/viewer scope all
--   SELECT public.get_workload_summary('00000000-0000-0000-0000-00000000aaaa'); -- team A
-- =============================================================
