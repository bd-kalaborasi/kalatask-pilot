-- =============================================================
-- Migration: 20260429100300_fix_resolver_max_uuid
--
-- Fix: max(uuid) tidak ada di Postgres. Refactor resolve_pic_alias
-- pakai DISTINCT subquery + LIMIT 1.
--
-- Author: Claude Code (Sprint 5 Step 3 fix)
-- =============================================================

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
BEGIN
  IF p_raw_text IS NULL OR length(trim(p_raw_text)) = 0 THEN
    RETURN jsonb_build_object('confidence','UNRESOLVED','user_id',NULL,'candidates','[]'::jsonb,'reason','empty_input');
  END IF;

  IF p_raw_text LIKE '[NAMA_TIDAK_JELAS%' THEN
    RETURN jsonb_build_object('confidence','UNRESOLVED','user_id',NULL,'candidates','[]'::jsonb,'reason','escape_hatch');
  END IF;

  v_normalized := lower(trim(p_raw_text));

  -- Tier 1: exact (case-insensitive). Count distinct users yang punya alias.
  SELECT count(DISTINCT user_id) INTO v_exact_count
  FROM public.user_aliases
  WHERE lower(alias_text) = v_normalized;

  IF v_exact_count = 1 THEN
    SELECT ua.user_id, u.full_name INTO v_exact_user, v_exact_name
    FROM public.user_aliases ua
    JOIN public.users u ON u.id = ua.user_id
    WHERE lower(ua.alias_text) = v_normalized
    LIMIT 1;

    RETURN jsonb_build_object(
      'confidence','HIGH',
      'user_id', v_exact_user,
      'candidates', jsonb_build_array(jsonb_build_object('user_id',v_exact_user,'full_name',v_exact_name,'distance',0,'match_type','exact')),
      'reason','exact_alias'
    );
  ELSIF v_exact_count > 1 THEN
    SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'full_name',full_name,'distance',0,'match_type','exact') ORDER BY full_name)
    INTO v_candidates
    FROM (
      SELECT DISTINCT ua.user_id, u.full_name
      FROM public.user_aliases ua JOIN public.users u ON u.id = ua.user_id
      WHERE lower(ua.alias_text) = v_normalized
    ) AS uniq;
    RETURN jsonb_build_object('confidence','LOW','user_id',NULL,'candidates',v_candidates,'reason','multi_candidate_exact');
  END IF;

  -- Tier 2: fuzzy distance 1
  SELECT count(DISTINCT user_id) INTO v_fuzzy_count
  FROM public.user_aliases
  WHERE levenshtein(lower(alias_text), v_normalized) = 1
    AND length(alias_text) >= 3;

  IF v_fuzzy_count = 1 THEN
    SELECT ua.user_id, u.full_name, levenshtein(lower(ua.alias_text), v_normalized)
    INTO v_fuzzy_user, v_fuzzy_name, v_fuzzy_distance
    FROM public.user_aliases ua JOIN public.users u ON u.id = ua.user_id
    WHERE levenshtein(lower(ua.alias_text), v_normalized) = 1
      AND length(ua.alias_text) >= 3
    LIMIT 1;
    RETURN jsonb_build_object(
      'confidence','MEDIUM',
      'user_id', v_fuzzy_user,
      'candidates', jsonb_build_array(jsonb_build_object('user_id',v_fuzzy_user,'full_name',v_fuzzy_name,'distance',v_fuzzy_distance,'match_type','fuzzy')),
      'reason','single_fuzzy_distance_1'
    );
  ELSIF v_fuzzy_count > 1 THEN
    SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'full_name',full_name,'distance',distance,'match_type','fuzzy') ORDER BY distance,full_name)
    INTO v_candidates
    FROM (
      SELECT DISTINCT ua.user_id, u.full_name, levenshtein(lower(ua.alias_text), v_normalized) AS distance
      FROM public.user_aliases ua JOIN public.users u ON u.id = ua.user_id
      WHERE levenshtein(lower(ua.alias_text), v_normalized) = 1 AND length(ua.alias_text) >= 3
    ) AS uniq;
    RETURN jsonb_build_object('confidence','LOW','user_id',NULL,'candidates',v_candidates,'reason','multi_fuzzy_distance_1');
  END IF;

  -- Tier 3: distance 2 → LOW
  SELECT count(DISTINCT user_id) INTO v_fuzzy_count
  FROM public.user_aliases
  WHERE levenshtein(lower(alias_text), v_normalized) = 2
    AND length(alias_text) >= 4;

  IF v_fuzzy_count >= 1 THEN
    SELECT jsonb_agg(jsonb_build_object('user_id',user_id,'full_name',full_name,'distance',distance,'match_type','fuzzy') ORDER BY distance,full_name)
    INTO v_candidates
    FROM (
      SELECT DISTINCT ua.user_id, u.full_name, levenshtein(lower(ua.alias_text), v_normalized) AS distance
      FROM public.user_aliases ua JOIN public.users u ON u.id = ua.user_id
      WHERE levenshtein(lower(ua.alias_text), v_normalized) = 2 AND length(ua.alias_text) >= 4
      LIMIT 5
    ) AS uniq;
    RETURN jsonb_build_object('confidence','LOW','user_id',NULL,'candidates',v_candidates,'reason', CASE WHEN v_fuzzy_count = 1 THEN 'single_distance_2' ELSE 'multi_distance_2' END);
  END IF;

  RETURN jsonb_build_object('confidence','UNRESOLVED','user_id',NULL,'candidates','[]'::jsonb,'reason','no_match');
END;
$$;
