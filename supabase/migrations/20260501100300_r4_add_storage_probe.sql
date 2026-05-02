-- R4 Phase B — replace Storage TBD placeholder with real probe
-- Sums bytes from storage.objects (Supabase managed table) so admins
-- see actual storage consumption against 1GB free-tier limit.
--
-- Apply via:  supabase db push
-- Owner action: run after R4 PR merges.

CREATE OR REPLACE FUNCTION public.get_usage_summary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, storage
AS $$
DECLARE
  v_db_size_mb numeric;
  v_db_limit_mb numeric := 500;
  v_storage_limit_mb numeric := 1024;
  v_storage_size_mb numeric;
  v_storage_pct numeric;
  v_storage_note text;
  v_top_files jsonb := '[]'::jsonb;
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

  SELECT round(pg_database_size(current_database())::numeric / 1024 / 1024, 2)
  INTO v_db_size_mb;

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

  BEGIN
    SELECT count(*) INTO v_mau
    FROM auth.users
    WHERE last_sign_in_at IS NOT NULL
      AND last_sign_in_at > now() - interval '30 days';
  EXCEPTION WHEN insufficient_privilege THEN
    v_mau := NULL;
  END;

  -- R4: real storage probe via storage.objects
  BEGIN
    SELECT round(COALESCE(SUM((metadata->>'size')::numeric), 0) / 1024 / 1024, 2)
    INTO v_storage_size_mb
    FROM storage.objects;

    SELECT jsonb_agg(jsonb_build_object(
      'name', name,
      'bucket', bucket_id,
      'size_mb', round((metadata->>'size')::numeric / 1024 / 1024, 4)
    ) ORDER BY (metadata->>'size')::numeric DESC NULLS LAST)
    INTO v_top_files
    FROM (
      SELECT name, bucket_id, metadata
      FROM storage.objects
      WHERE metadata ? 'size'
      ORDER BY (metadata->>'size')::numeric DESC NULLS LAST
      LIMIT 10
    ) sub;

    v_storage_note := NULL;
  EXCEPTION WHEN insufficient_privilege OR undefined_table THEN
    v_storage_size_mb := NULL;
    v_storage_note := 'Storage schema unavailable — superuser access needed';
  END;

  IF v_storage_size_mb IS NOT NULL THEN
    v_storage_pct := round((v_storage_size_mb / v_storage_limit_mb) * 100, 1);
  END IF;

  v_db_pct := round((v_db_size_mb / v_db_limit_mb) * 100, 1);
  IF v_db_pct >= 90 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level','critical','message',format('DB size %s%% — kritis approaching 500MB cap', v_db_pct)));
  ELSIF v_db_pct >= 70 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level','warning','message',format('DB size %s%% — warning >70%%', v_db_pct)));
  END IF;

  IF v_storage_pct IS NOT NULL AND v_storage_pct >= 70 THEN
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level',CASE WHEN v_storage_pct >= 90 THEN 'critical' ELSE 'warning' END,'message',format('Storage %s%% — %s MB / %s MB', v_storage_pct, v_storage_size_mb, v_storage_limit_mb)));
  END IF;

  IF v_mau IS NOT NULL THEN
    v_mau_pct := round((v_mau::numeric / v_mau_limit) * 100, 1);
    IF v_mau_pct >= 70 THEN
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('level',CASE WHEN v_mau_pct >= 90 THEN 'critical' ELSE 'warning' END,'message',format('MAU %s%% — %s/50K', v_mau_pct, v_mau)));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'database', jsonb_build_object('size_mb', v_db_size_mb, 'limit_mb', v_db_limit_mb, 'utilization_pct', v_db_pct),
    'storage', jsonb_build_object('size_mb', v_storage_size_mb, 'limit_mb', v_storage_limit_mb, 'utilization_pct', v_storage_pct, 'note', v_storage_note),
    'mau_current_month', v_mau,
    'mau_limit', v_mau_limit,
    'top_tables', v_top_tables,
    'top_files', COALESCE(v_top_files, '[]'::jsonb),
    'alerts', v_alerts,
    'captured_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.get_usage_summary() IS
  'F16 admin usage. RPC variant per ADR-007 v2. R4 Phase B adds real storage probe.';

GRANT EXECUTE ON FUNCTION public.get_usage_summary() TO authenticated;
