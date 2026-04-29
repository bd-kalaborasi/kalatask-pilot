-- =============================================================
-- Migration: 20260429100100_add_mom_rpcs
--
-- Tujuan: Sprint 5 Step 3 — Server-side RPCs untuk MoM Import.
--
-- 3 RPCs:
--   1. resolve_pic_alias(p_raw_text text) RETURNS jsonb
--      4-tier matching:
--        a. HIGH = exact match (case-insensitive) — 1 row di user_aliases
--        b. MEDIUM = single fuzzy match levenshtein ≤1 — 1 row
--        c. LOW = multi-candidate (>1 exact OR >1 fuzzy) atau distance 2 single
--        d. UNRESOLVED = no match
--      Returns { confidence, user_id|null, candidates: [{user_id, full_name, distance, match_type}] }
--
--   2. process_mom_upload(p_file_name, p_mom_date, p_title, p_raw_markdown, p_actions jsonb)
--      RETURNS uuid (mom_import_id)
--      Insert mom_imports parent + per-action items dengan auto resolver.
--      Auto-set approval_status='auto_approved' kalau semua items HIGH.
--
--   3. approve_mom_import(p_import_id uuid) RETURNS jsonb
--      Per item dengan decision='create' (set di review) → INSERT task,
--      source='mom-import'. Set approval_status='approved' + approved_by/at.
--      Returns { tasks_created, items_processed }
--
-- Refer:
--   - ADR-007 v2
--   - Sprint 5 plan Step 3
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.approve_mom_import(uuid);
--   DROP FUNCTION IF EXISTS public.process_mom_upload(text,date,text,text,jsonb);
--   DROP FUNCTION IF EXISTS public.resolve_pic_alias(text);
--
-- Author: Claude Code (Sprint 5 Step 3)
-- =============================================================


-- ============================================================
-- 1. resolve_pic_alias — 4-tier confidence matching
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_pic_alias(p_raw_text text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_normalized text;
  v_exact_count int;
  v_exact_user uuid;
  v_exact_name text;
  v_fuzzy_count int;
  v_fuzzy_user uuid;
  v_fuzzy_name text;
  v_fuzzy_distance int;
  v_candidates jsonb := '[]'::jsonb;
  v_confidence text;
BEGIN
  IF p_raw_text IS NULL OR length(trim(p_raw_text)) = 0 THEN
    RETURN jsonb_build_object(
      'confidence', 'UNRESOLVED',
      'user_id', NULL,
      'candidates', '[]'::jsonb,
      'reason', 'empty_input'
    );
  END IF;

  -- Skip [NAMA_TIDAK_JELAS_at_HH:MM] escape hatch — explicit unresolved
  IF p_raw_text LIKE '[NAMA_TIDAK_JELAS%' THEN
    RETURN jsonb_build_object(
      'confidence', 'UNRESOLVED',
      'user_id', NULL,
      'candidates', '[]'::jsonb,
      'reason', 'escape_hatch'
    );
  END IF;

  v_normalized := lower(trim(p_raw_text));

  -- Tier 1: exact match (case-insensitive)
  SELECT count(*), max(user_id), max(u.full_name)
  INTO v_exact_count, v_exact_user, v_exact_name
  FROM public.user_aliases ua
  JOIN public.users u ON u.id = ua.user_id
  WHERE lower(ua.alias_text) = v_normalized;

  IF v_exact_count = 1 THEN
    RETURN jsonb_build_object(
      'confidence', 'HIGH',
      'user_id', v_exact_user,
      'candidates', jsonb_build_array(jsonb_build_object(
        'user_id', v_exact_user,
        'full_name', v_exact_name,
        'distance', 0,
        'match_type', 'exact'
      )),
      'reason', 'exact_alias'
    );
  ELSIF v_exact_count > 1 THEN
    -- Multi-candidate exact match → LOW
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'full_name', full_name,
      'distance', 0,
      'match_type', 'exact'
    ) ORDER BY full_name)
    INTO v_candidates
    FROM (
      SELECT DISTINCT ua.user_id, u.full_name
      FROM public.user_aliases ua
      JOIN public.users u ON u.id = ua.user_id
      WHERE lower(ua.alias_text) = v_normalized
    ) AS uniq_users;

    RETURN jsonb_build_object(
      'confidence', 'LOW',
      'user_id', NULL,
      'candidates', v_candidates,
      'reason', 'multi_candidate_exact'
    );
  END IF;

  -- Tier 2: fuzzy Levenshtein ≤1
  SELECT count(DISTINCT user_id) INTO v_fuzzy_count
  FROM public.user_aliases
  WHERE levenshtein(lower(alias_text), v_normalized) = 1
    AND length(alias_text) >= 3;  -- avoid ridiculous matches on short strings

  IF v_fuzzy_count = 1 THEN
    SELECT user_id, u.full_name, levenshtein(lower(alias_text), v_normalized)
    INTO v_fuzzy_user, v_fuzzy_name, v_fuzzy_distance
    FROM public.user_aliases ua
    JOIN public.users u ON u.id = ua.user_id
    WHERE levenshtein(lower(ua.alias_text), v_normalized) = 1
      AND length(ua.alias_text) >= 3
    LIMIT 1;

    RETURN jsonb_build_object(
      'confidence', 'MEDIUM',
      'user_id', v_fuzzy_user,
      'candidates', jsonb_build_array(jsonb_build_object(
        'user_id', v_fuzzy_user,
        'full_name', v_fuzzy_name,
        'distance', v_fuzzy_distance,
        'match_type', 'fuzzy'
      )),
      'reason', 'single_fuzzy_distance_1'
    );
  ELSIF v_fuzzy_count > 1 THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'full_name', full_name,
      'distance', distance,
      'match_type', 'fuzzy'
    ) ORDER BY distance, full_name)
    INTO v_candidates
    FROM (
      SELECT DISTINCT ua.user_id, u.full_name,
             levenshtein(lower(ua.alias_text), v_normalized) AS distance
      FROM public.user_aliases ua
      JOIN public.users u ON u.id = ua.user_id
      WHERE levenshtein(lower(ua.alias_text), v_normalized) = 1
        AND length(ua.alias_text) >= 3
    ) AS uniq;

    RETURN jsonb_build_object(
      'confidence', 'LOW',
      'user_id', NULL,
      'candidates', v_candidates,
      'reason', 'multi_fuzzy_distance_1'
    );
  END IF;

  -- Tier 3: distance 2 (single match → LOW, no auto-resolve)
  SELECT count(DISTINCT user_id) INTO v_fuzzy_count
  FROM public.user_aliases
  WHERE levenshtein(lower(alias_text), v_normalized) = 2
    AND length(alias_text) >= 4;

  IF v_fuzzy_count >= 1 THEN
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', user_id,
      'full_name', full_name,
      'distance', distance,
      'match_type', 'fuzzy'
    ) ORDER BY distance, full_name)
    INTO v_candidates
    FROM (
      SELECT DISTINCT ua.user_id, u.full_name,
             levenshtein(lower(ua.alias_text), v_normalized) AS distance
      FROM public.user_aliases ua
      JOIN public.users u ON u.id = ua.user_id
      WHERE levenshtein(lower(ua.alias_text), v_normalized) = 2
        AND length(ua.alias_text) >= 4
      LIMIT 5
    ) AS uniq;

    RETURN jsonb_build_object(
      'confidence', 'LOW',
      'user_id', NULL,
      'candidates', v_candidates,
      'reason', CASE WHEN v_fuzzy_count = 1 THEN 'single_distance_2' ELSE 'multi_distance_2' END
    );
  END IF;

  -- Tier 4: UNRESOLVED
  RETURN jsonb_build_object(
    'confidence', 'UNRESOLVED',
    'user_id', NULL,
    'candidates', '[]'::jsonb,
    'reason', 'no_match'
  );
END;
$$;

COMMENT ON FUNCTION public.resolve_pic_alias(text) IS
  '4-tier PIC matching: HIGH=exact alias, MEDIUM=fuzzy ≤1 single, LOW=multi atau distance 2, UNRESOLVED=no match. Sprint 5 F9.';

GRANT EXECUTE ON FUNCTION public.resolve_pic_alias(text) TO authenticated;


-- ============================================================
-- 2. process_mom_upload — admin upload + auto-resolve all items
-- ============================================================
CREATE OR REPLACE FUNCTION public.process_mom_upload(
  p_file_name text,
  p_mom_date date,
  p_title text,
  p_raw_markdown text,
  p_actions jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_import_id uuid;
  v_action jsonb;
  v_resolution jsonb;
  v_total int := 0;
  v_high int := 0;
  v_medium int := 0;
  v_low int := 0;
  v_unresolved int := 0;
  v_summary jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'process_mom_upload: admin only';
  END IF;

  IF p_actions IS NULL OR jsonb_typeof(p_actions) <> 'array' THEN
    RAISE EXCEPTION 'process_mom_upload: p_actions must be jsonb array';
  END IF;

  IF length(p_raw_markdown) > 5 * 1024 * 1024 THEN
    RAISE EXCEPTION 'process_mom_upload: raw_markdown exceeds 5MB';
  END IF;

  -- Parent record
  INSERT INTO public.mom_imports (
    file_name, mom_date, title, uploaded_by, raw_markdown, parse_status, parse_summary
  )
  VALUES (
    p_file_name, p_mom_date, p_title, auth.uid(), p_raw_markdown, 'parsed', '{}'::jsonb
  )
  RETURNING id INTO v_import_id;

  v_total := jsonb_array_length(p_actions);

  -- Per-action insert dengan auto-resolve
  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    v_resolution := public.resolve_pic_alias(v_action->>'pic');

    INSERT INTO public.mom_import_items (
      mom_import_id, action_id, raw_pic, pic_resolved_user_id,
      pic_confidence, pic_candidates, title, description, deadline,
      priority, estimated_hours, project_name, status_initial
    )
    VALUES (
      v_import_id,
      v_action->>'action_id',
      v_action->>'pic',
      NULLIF(v_resolution->>'user_id', '')::uuid,
      v_resolution->>'confidence',
      v_resolution->'candidates',
      v_action->>'title',
      v_action->>'description',
      NULLIF(v_action->>'deadline', 'TBD')::date,
      lower(v_action->>'priority'),
      NULLIF(v_action->>'estimated_hours', 'N/A')::int,
      v_action->>'project',
      lower(COALESCE(v_action->>'status_initial', 'todo'))
    );

    CASE v_resolution->>'confidence'
      WHEN 'HIGH' THEN v_high := v_high + 1;
      WHEN 'MEDIUM' THEN v_medium := v_medium + 1;
      WHEN 'LOW' THEN v_low := v_low + 1;
      WHEN 'UNRESOLVED' THEN v_unresolved := v_unresolved + 1;
      ELSE NULL;
    END CASE;
  END LOOP;

  v_summary := jsonb_build_object(
    'total', v_total,
    'high', v_high,
    'medium', v_medium,
    'low', v_low,
    'unresolved', v_unresolved
  );

  -- Update parent: auto_approved kalau semua HIGH (exception-only flow)
  UPDATE public.mom_imports
  SET parse_summary = v_summary,
      approval_status = CASE
        WHEN v_total > 0 AND v_high = v_total THEN 'auto_approved'
        ELSE 'pending_review'
      END
  WHERE id = v_import_id;

  RETURN v_import_id;
END;
$$;

COMMENT ON FUNCTION public.process_mom_upload(text,date,text,text,jsonb) IS
  'Admin uploads MoM JSON payload. Per-action resolver + auto-approval kalau semua HIGH. Sprint 5 F9.';

GRANT EXECUTE ON FUNCTION public.process_mom_upload(text,date,text,text,jsonb) TO authenticated;


-- ============================================================
-- 3. approve_mom_import — admin commits review decisions
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_mom_import(p_import_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_item record;
  v_project_id uuid;
  v_task_id uuid;
  v_tasks_created int := 0;
  v_items_processed int := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'approve_mom_import: admin only';
  END IF;

  -- Iterate items dengan decision='create' (atau auto_approved HIGH)
  FOR v_item IN
    SELECT i.*
    FROM public.mom_import_items i
    JOIN public.mom_imports m ON m.id = i.mom_import_id
    WHERE i.mom_import_id = p_import_id
      AND (
        i.decision = 'create'
        OR (m.approval_status = 'auto_approved' AND i.pic_confidence = 'HIGH')
      )
  LOOP
    -- Resolve project (auto-create kalau project_name baru, mirror Sprint 4 CSV)
    v_project_id := NULL;
    IF v_item.project_name IS NOT NULL AND v_item.project_name <> '' AND lower(v_item.project_name) <> 'umum' THEN
      SELECT id INTO v_project_id
      FROM public.projects
      WHERE name = v_item.project_name AND status <> 'archived'
      LIMIT 1;

      IF v_project_id IS NULL THEN
        INSERT INTO public.projects (name, owner_id, status)
        VALUES (v_item.project_name, auth.uid(), 'active')
        RETURNING id INTO v_project_id;
      END IF;
    END IF;

    -- Skip kalau project tidak resolvable (ACTION dengan project NULL/Umum dapat diskip atau di-default)
    IF v_project_id IS NULL THEN
      -- fallback: assign ke "Umum" project (auto-create)
      SELECT id INTO v_project_id FROM public.projects WHERE name = 'Umum' AND status <> 'archived' LIMIT 1;
      IF v_project_id IS NULL THEN
        INSERT INTO public.projects (name, owner_id, status)
        VALUES ('Umum', auth.uid(), 'active')
        RETURNING id INTO v_project_id;
      END IF;
    END IF;

    -- INSERT task
    INSERT INTO public.tasks (
      project_id, title, description, assignee_id, created_by,
      status, priority, deadline, estimated_hours, source,
      source_mom_import_id, source_action_id
    )
    VALUES (
      v_project_id, v_item.title, v_item.description,
      v_item.pic_resolved_user_id, auth.uid(),
      v_item.status_initial, COALESCE(v_item.priority, 'medium'),
      v_item.deadline, v_item.estimated_hours, 'mom-import',
      p_import_id, v_item.action_id
    )
    RETURNING id INTO v_task_id;

    -- Update item dengan target_task_id
    UPDATE public.mom_import_items
    SET decision = 'create', target_task_id = v_task_id,
        reviewed_by = auth.uid(), reviewed_at = now()
    WHERE id = v_item.id;

    v_tasks_created := v_tasks_created + 1;
    v_items_processed := v_items_processed + 1;
  END LOOP;

  -- Iterate skip/reject items utk record reviewed_by/at
  UPDATE public.mom_import_items
  SET reviewed_by = auth.uid(), reviewed_at = now()
  WHERE mom_import_id = p_import_id
    AND decision IN ('skip', 'reject')
    AND reviewed_at IS NULL;

  -- Set parent approval_status
  UPDATE public.mom_imports
  SET approval_status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  WHERE id = p_import_id
    AND approval_status IN ('pending_review','auto_approved');

  RETURN jsonb_build_object(
    'tasks_created', v_tasks_created,
    'items_processed', v_items_processed
  );
END;
$$;

COMMENT ON FUNCTION public.approve_mom_import(uuid) IS
  'Admin commits review: per item decision=create → INSERT task source=mom-import. Auto-approved HIGH-only items processed automatically. Sprint 5 F9.';

GRANT EXECUTE ON FUNCTION public.approve_mom_import(uuid) TO authenticated;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. SELECT proname FROM pg_proc
--      WHERE proname IN ('resolve_pic_alias','process_mom_upload','approve_mom_import')
--      ORDER BY proname;
--      → 3 rows
-- =============================================================
