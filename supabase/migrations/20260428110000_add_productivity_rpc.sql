-- =============================================================
-- Migration: 20260428110000_add_productivity_rpc
--
-- Tujuan: Implement RPC function get_productivity_metrics per ADR-004.
--   Single SQL function returning JSONB shape match PRD §13 line 636-653.
--   Manager/Viewer/Admin call via PostgREST `/rest/v1/rpc/get_productivity_metrics`.
--
-- Per ADR-004 decision: SECURITY INVOKER → RLS auto-enforced via
-- underlying tasks/projects/users queries. Manager auto-scope ke own
-- team; Viewer + Admin cross-team; Member yields empty (RLS implicit
-- deny untuk non-assigned tasks).
--
-- Metrics covered:
--   1. completion_rate_per_user: done/assigned ratio per user dalam period
--   2. velocity_per_week: tasks_completed by week (8 minggu trend)
--   3. on_time_delivery_rate: % done on/before deadline dalam period
--   4. avg_cycle_time_days: rata-rata hari (created → done) per project
--   5. bottleneck_heatmap: count(tasks) by (status × age_bucket)
--
-- Period filter: parameter p_period_days (default 30). Filter scope:
-- only tasks dengan completed_at OR created_at dalam period.
--
-- Performance: indexed via Sprint 1 schema (assignee_id, status),
-- (project_id, status), (deadline), (completed_at). Target < 500ms
-- untuk 10K task per ADR-004 perf projection.
--
-- Refer:
--   - ADR-004 docs/adr/ADR-004-productivity-query-strategy.md
--   - PRD §13 line 632-658 (API response shape)
--   - PRD §3.1 F13 line 137-143 (4 metrics + bottleneck)
--   - Sprint 3 plan Step 5
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.get_productivity_metrics(uuid, int);
--
-- Author: Claude Code (Sprint 3 Step 5)
-- =============================================================


-- ============================================================
-- get_productivity_metrics(p_team_id, p_period_days)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_productivity_metrics(
  p_team_id uuid DEFAULT NULL,
  p_period_days int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_period_start timestamptz;
  v_completion_rate jsonb;
  v_velocity jsonb;
  v_on_time_rate numeric;
  v_avg_cycle_days numeric;
  v_bottleneck jsonb;
BEGIN
  v_period_start := now() - (p_period_days || ' days')::interval;

  -- 1. Completion rate per user
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_completion_rate
  FROM (
    SELECT
      u.id AS user_id,
      u.full_name,
      COUNT(t.id) FILTER (WHERE t.created_at >= v_period_start)::int AS assigned,
      COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.completed_at >= v_period_start)::int AS done,
      ROUND(
        CASE
          WHEN COUNT(t.id) FILTER (WHERE t.created_at >= v_period_start) > 0
          THEN COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.completed_at >= v_period_start)::numeric
            / COUNT(t.id) FILTER (WHERE t.created_at >= v_period_start)::numeric
          ELSE 0
        END, 2
      ) AS rate
    FROM public.users u
    LEFT JOIN public.tasks t ON t.assignee_id = u.id
    WHERE u.role = 'member'
      AND (p_team_id IS NULL OR u.team_id = p_team_id)
    GROUP BY u.id, u.full_name
    HAVING COUNT(t.id) FILTER (WHERE t.created_at >= v_period_start) > 0
    ORDER BY u.full_name
  ) r;

  -- 2. Velocity per week (8 minggu trend)
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.week_start), '[]'::jsonb)
  INTO v_velocity
  FROM (
    SELECT
      ws.week_start::date,
      COUNT(t.id) FILTER (
        WHERE t.status = 'done'
          AND t.completed_at >= ws.week_start
          AND t.completed_at < ws.week_start + interval '1 week'
          AND (p_team_id IS NULL OR EXISTS (
            SELECT 1 FROM public.users u
            WHERE u.id = t.assignee_id AND u.team_id = p_team_id
          ))
      )::int AS tasks_completed
    FROM (
      SELECT generate_series(
        date_trunc('week', now() - interval '7 weeks'),
        date_trunc('week', now()),
        interval '1 week'
      ) AS week_start
    ) ws
    LEFT JOIN public.tasks t ON true
    GROUP BY ws.week_start
  ) r;

  -- 3. On-time delivery rate (period-scoped)
  SELECT
    COALESCE(
      ROUND(
        COUNT(*) FILTER (WHERE completed_at::date <= deadline)::numeric
          / NULLIF(COUNT(*), 0)::numeric,
        2
      ),
      0
    )
  INTO v_on_time_rate
  FROM public.tasks
  WHERE status = 'done'
    AND completed_at IS NOT NULL
    AND deadline IS NOT NULL
    AND completed_at >= v_period_start
    AND (p_team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = tasks.assignee_id AND u.team_id = p_team_id
    ));

  -- 4. Average cycle time (days, period-scoped)
  SELECT
    COALESCE(
      ROUND(
        AVG(EXTRACT(epoch FROM (completed_at - created_at)) / 86400)::numeric,
        2
      ),
      0
    )
  INTO v_avg_cycle_days
  FROM public.tasks
  WHERE status = 'done'
    AND completed_at IS NOT NULL
    AND completed_at >= v_period_start
    AND (p_team_id IS NULL OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = tasks.assignee_id AND u.team_id = p_team_id
    ));

  -- 5. Bottleneck heatmap — status × age_bucket × count
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.status, r.age_bucket), '[]'::jsonb)
  INTO v_bottleneck
  FROM (
    SELECT
      status,
      CASE
        WHEN now() - updated_at <= interval '3 days' THEN '<=3d'
        WHEN now() - updated_at <= interval '7 days' THEN '4-7d'
        ELSE '>7d'
      END AS age_bucket,
      COUNT(*)::int AS count
    FROM public.tasks
    WHERE status NOT IN ('done', 'blocked')
      AND (p_team_id IS NULL OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = tasks.assignee_id AND u.team_id = p_team_id
      ))
    GROUP BY status, age_bucket
  ) r;

  -- Compose response JSONB
  RETURN jsonb_build_object(
    'scope', CASE WHEN p_team_id IS NULL THEN 'all' ELSE 'team' END,
    'team_id', p_team_id,
    'period_days', p_period_days,
    'completion_rate_per_user', v_completion_rate,
    'velocity_per_week', v_velocity,
    'on_time_delivery_rate', v_on_time_rate,
    'avg_cycle_time_days', v_avg_cycle_days,
    'bottleneck_heatmap', v_bottleneck
  );
END;
$$;

COMMENT ON FUNCTION public.get_productivity_metrics(uuid, int) IS
  'F13 productivity dashboard data. SECURITY INVOKER — RLS auto-scope via tasks/users underlying queries. ADR-004.';

GRANT EXECUTE ON FUNCTION public.get_productivity_metrics(uuid, int) TO authenticated;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   -- Test sebagai admin (role authenticated):
--   SELECT public.get_productivity_metrics(NULL, 30);
--
--   -- Test sebagai manager scoped team:
--   SELECT public.get_productivity_metrics('00000000-0000-0000-0000-00000000aaaa', 30);
-- =============================================================
