-- =============================================================
-- Migration: 20260429100400_add_usage_summary_rpc
--
-- Tujuan: Sprint 5 F16 — get_usage_summary RPC (admin-only).
-- Returns DB size + top tables + MAU current month.
-- Storage size deferred per Q5 Sprint 5 plan (PostgREST limited).
--
-- Per ADR-007 v2: prefer RPC over Edge Function untuk free-tier alignment.
--
-- Author: Claude Code (Sprint 5 Step 4 — RPC variant)
-- =============================================================

CREATE OR REPLACE FUNCTION public.get_usage_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_db_size_mb numeric;
  v_db_limit_mb numeric := 500;  -- free tier
  v_storage_limit_mb numeric := 1024;
  v_mau_limit int := 50000;
  v_mau int;
  v_top_tables jsonb;
  v_alerts jsonb := '[]'::jsonb;
  v_db_pct numeric;
  v_mau_pct numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'get_usage_summary: admin only';
  END IF;

  -- DB size
  SELECT round(pg_database_size(current_database())::numeric / 1024 / 1024, 2)
  INTO v_db_size_mb;

  -- Top 10 tables di public schema
  SELECT jsonb_agg(jsonb_build_object(
    'table', relname,
    'size_mb', round(pg_total_relation_size(C.oid)::numeric / 1024 / 1024, 2)
  ) ORDER BY pg_total_relation_size(C.oid) DESC)
  INTO v_top_tables
  FROM pg_class C
  LEFT JOIN pg_namespace N ON N.oid = C.relnamespace
  WHERE C.relkind = 'r'
    AND nspname = 'public'
    AND relname NOT LIKE 'pg_%'
  LIMIT 10;

  -- MAU current month — auth.users last_sign_in_at
  -- Catatan: auth.users access butuh service_role, tapi SECURITY DEFINER
  -- function bisa SELECT.
  BEGIN
    SELECT count(*) INTO v_mau
    FROM auth.users
    WHERE last_sign_in_at IS NOT NULL
      AND last_sign_in_at > now() - interval '30 days';
  EXCEPTION WHEN insufficient_privilege THEN
    v_mau := NULL;
  END;

  -- Compute alerts
  v_db_pct := round((v_db_size_mb / v_db_limit_mb) * 100, 1);
  IF v_db_pct >= 90 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level','critical','message',format('DB size %s%% — kritis approaching 500MB cap', v_db_pct)));
  ELSIF v_db_pct >= 70 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level','warning','message',format('DB size %s%% — warning >70%%', v_db_pct)));
  END IF;

  IF v_mau IS NOT NULL THEN
    v_mau_pct := round((v_mau::numeric / v_mau_limit) * 100, 1);
    IF v_mau_pct >= 70 THEN
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level',CASE WHEN v_mau_pct >= 90 THEN 'critical' ELSE 'warning' END,'message',format('MAU %s%% — %s/50K', v_mau_pct, v_mau)));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'database', jsonb_build_object('size_mb', v_db_size_mb, 'limit_mb', v_db_limit_mb, 'utilization_pct', v_db_pct),
    'storage', jsonb_build_object('size_mb', NULL, 'limit_mb', v_storage_limit_mb, 'utilization_pct', NULL, 'note', 'Storage probe deferred per Sprint 5 Q5 — Supabase Storage API client-side fetch needed'),
    'mau_current_month', v_mau,
    'mau_limit', v_mau_limit,
    'top_tables', v_top_tables,
    'top_files', '[]'::jsonb,
    'alerts', v_alerts,
    'captured_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.get_usage_summary() IS
  'F16 admin usage. RPC variant per ADR-007 v2 (free-tier alignment, no Edge Function). Sprint 5.';

GRANT EXECUTE ON FUNCTION public.get_usage_summary() TO authenticated;
