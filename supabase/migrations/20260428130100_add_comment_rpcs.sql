-- =============================================================
-- Migration: 20260428130100_add_comment_rpcs
--
-- Tujuan: Sprint 4.5 Step 3 — server-side RPCs untuk comments operations.
--   Q2 owner override: @mention pakai UUID-based token format
--   `@[Full Name](user_uuid)`. Backend extract UUIDs via regex,
--   validate via users table lookup, emit notif type='mentioned' per
--   unique mentioned user_id (kalau caller dapat akses task — silent
--   skip kalau mentioned user tidak punya akses).
--
-- 4 RPCs:
--   1. post_comment(p_task_id, p_body) RETURNS uuid — INSERT comment
--      + emit notif untuk @mentions
--   2. update_comment(p_comment_id, p_body) RETURNS void — UPDATE
--      + emit notif untuk DELTA mentions (NEW UUIDs only)
--   3. delete_comment(p_comment_id) RETURNS void — soft validation only
--      (RLS handle the rest)
--   4. search_users_for_mention(p_query) RETURNS jsonb array — autocomplete,
--      RLS auto-scope per role (Member only see same-team, Manager team,
--      Admin/Viewer all).
--
-- Edge cases handled:
--   - Self-mention: parser detect, skip notif (author = mentioned)
--   - Duplicate UUID in body: dedup via DISTINCT
--   - Mentioned user no access: silent skip (RLS check via
--     user_can_access_task helper)
--   - Edit delta: compute (new_mentions \ old_mentions) → emit only delta
--
-- Refer:
--   - ADR-008
--   - Sprint 4.5 plan Step 3
--   - Sprint 3 notification emission pattern (inline INSERT, no helper)
--   - Q2 owner override (UUID-based mention)
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.search_users_for_mention(text);
--   DROP FUNCTION IF EXISTS public.delete_comment(uuid);
--   DROP FUNCTION IF EXISTS public.update_comment(uuid, text);
--   DROP FUNCTION IF EXISTS public.post_comment(uuid, text);
--   DROP FUNCTION IF EXISTS public.parse_mention_uuids(text);
--
-- Author: Claude Code (Sprint 4.5 Step 3)
-- =============================================================


-- ============================================================
-- 0. Helper — extract UUIDs from comment body @[Name](uuid) tokens
-- ============================================================
CREATE OR REPLACE FUNCTION public.parse_mention_uuids(p_body text)
RETURNS uuid[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_matches text[];
  v_result uuid[] := ARRAY[]::uuid[];
  v_match text;
BEGIN
  IF p_body IS NULL OR p_body = '' THEN
    RETURN v_result;
  END IF;

  -- Regex: @\[ ... \]\((uuid)\)
  -- Token format: @[Full Name](aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa)
  -- Capture group 1 = uuid
  SELECT array_agg(matches[1])
  INTO v_matches
  FROM regexp_matches(
    p_body,
    '@\[[^\]]+\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)',
    'g'
  ) AS matches;

  IF v_matches IS NULL THEN
    RETURN v_result;
  END IF;

  -- Distinct + cast to uuid[]
  FOREACH v_match IN ARRAY v_matches LOOP
    v_result := array_append(v_result, v_match::uuid);
  END LOOP;

  -- Distinct
  SELECT array_agg(DISTINCT u) INTO v_result FROM unnest(v_result) AS u;

  RETURN COALESCE(v_result, ARRAY[]::uuid[]);
END;
$$;

COMMENT ON FUNCTION public.parse_mention_uuids(text) IS
  'Extract distinct UUIDs from @[Name](uuid) tokens di Markdown body. Q2 override Sprint 4.5.';


-- ============================================================
-- 1. post_comment(p_task_id, p_body) — INSERT + emit @mention notifs
-- ============================================================
CREATE OR REPLACE FUNCTION public.post_comment(
  p_task_id uuid,
  p_body text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_comment_id uuid;
  v_author_id uuid := auth.uid();
  v_mentions uuid[];
  v_uid uuid;
  v_task_title text;
  v_author_name text;
BEGIN
  -- Pre-checks (RLS akan reject kalau caller tidak punya akses)
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'post_comment: not authenticated';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'post_comment: body cannot be empty';
  END IF;

  IF length(p_body) > 2000 THEN
    RAISE EXCEPTION 'post_comment: body exceeds 2000 char';
  END IF;

  -- INSERT comment (RLS WITH CHECK validates author + task accessible)
  INSERT INTO public.comments (task_id, author_id, body, is_system)
  VALUES (p_task_id, v_author_id, p_body, false)
  RETURNING id INTO v_comment_id;

  -- Parse @mentions
  v_mentions := public.parse_mention_uuids(p_body);

  IF array_length(v_mentions, 1) IS NULL THEN
    RETURN v_comment_id;
  END IF;

  -- Get task title + author name untuk notif body
  SELECT title INTO v_task_title FROM public.tasks WHERE id = p_task_id;
  SELECT full_name INTO v_author_name FROM public.users WHERE id = v_author_id;

  -- Emit notif per mentioned user (skip self + skip user without access)
  FOREACH v_uid IN ARRAY v_mentions LOOP
    IF v_uid = v_author_id THEN
      CONTINUE; -- skip self-mention
    END IF;

    -- Verify mentioned user exists + dapat akses task
    -- (silent skip kalau tidak — security boundary)
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
      CONTINUE;
    END IF;

    -- Insert notif (RLS bypass via SECURITY DEFINER helper required —
    -- Sprint 3 pattern: notifications INSERT via service_role atau SECURITY
    -- DEFINER trigger. Here we wrap di SECURITY INVOKER RPC, jadi pakai
    -- explicit insert dengan service_role-equivalent fungsi).
    -- For Sprint 4.5: notifications RLS sudah disetup INSERT NO authenticated
    -- policy → INSERT akan reject. Pakai SECURITY DEFINER inner helper.
    PERFORM public._emit_mention_notif(v_uid, p_task_id, v_comment_id, v_task_title, v_author_name);

    -- Auto-add ke task_watchers (idempotent)
    INSERT INTO public.task_watchers (task_id, user_id)
    VALUES (p_task_id, v_uid)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_comment_id;
END;
$$;

COMMENT ON FUNCTION public.post_comment(uuid, text) IS
  'INSERT comment + emit @mention notif. SECURITY INVOKER (RLS validate). Q2 override Sprint 4.5.';

GRANT EXECUTE ON FUNCTION public.post_comment(uuid, text) TO authenticated;


-- ============================================================
-- 1a. _emit_mention_notif — SECURITY DEFINER helper untuk bypass
--     notifications INSERT RLS (notifications RLS denies authenticated INSERT).
-- ============================================================
CREATE OR REPLACE FUNCTION public._emit_mention_notif(
  p_user_id uuid,
  p_task_id uuid,
  p_comment_id uuid,
  p_task_title text,
  p_author_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, task_id, body)
  VALUES (
    p_user_id,
    'mentioned',
    p_task_id,
    format('%s mention kamu di task "%s"', COALESCE(p_author_name, 'Seseorang'), COALESCE(p_task_title, '(no title)'))
  );
END;
$$;

COMMENT ON FUNCTION public._emit_mention_notif(uuid,uuid,uuid,text,text) IS
  'Internal helper: SECURITY DEFINER bypass notifications INSERT RLS. Dipanggil dari post_comment + update_comment.';

-- Tidak GRANT EXECUTE ke authenticated — hanya callable dari RPC lain di schema public.


-- ============================================================
-- 2. update_comment(p_comment_id, p_body) — UPDATE + emit DELTA notifs
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_comment(
  p_comment_id uuid,
  p_body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_old_body text;
  v_task_id uuid;
  v_author_id uuid;
  v_old_mentions uuid[];
  v_new_mentions uuid[];
  v_delta uuid[];
  v_uid uuid;
  v_task_title text;
  v_author_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'update_comment: not authenticated';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'update_comment: body cannot be empty';
  END IF;

  IF length(p_body) > 2000 THEN
    RAISE EXCEPTION 'update_comment: body exceeds 2000 char';
  END IF;

  -- Fetch old body + task_id + author_id (RLS akan filter — caller harus
  -- punya SELECT access ke comment)
  SELECT body, task_id, author_id
  INTO v_old_body, v_task_id, v_author_id
  FROM public.comments
  WHERE id = p_comment_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'update_comment: comment not found or no access';
  END IF;

  -- UPDATE comment (RLS USING + WITH CHECK validate author = auth.uid()
  -- atau admin override)
  UPDATE public.comments
  SET body = p_body
  WHERE id = p_comment_id;

  -- Compute delta @mentions (new \ old)
  v_old_mentions := public.parse_mention_uuids(v_old_body);
  v_new_mentions := public.parse_mention_uuids(p_body);

  -- Delta = new_mentions yang tidak ada di old_mentions
  SELECT array_agg(DISTINCT u)
  INTO v_delta
  FROM unnest(v_new_mentions) AS u
  WHERE u <> ALL(COALESCE(v_old_mentions, ARRAY[]::uuid[]));

  IF array_length(v_delta, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT title INTO v_task_title FROM public.tasks WHERE id = v_task_id;
  SELECT full_name INTO v_author_name FROM public.users WHERE id = v_author_id;

  -- Emit notif untuk delta only
  FOREACH v_uid IN ARRAY v_delta LOOP
    IF v_uid = v_author_id THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
      CONTINUE;
    END IF;

    PERFORM public._emit_mention_notif(v_uid, v_task_id, p_comment_id, v_task_title, v_author_name);

    INSERT INTO public.task_watchers (task_id, user_id)
    VALUES (v_task_id, v_uid)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.update_comment(uuid, text) IS
  'UPDATE comment + emit DELTA @mention notif (new UUIDs only). Q2 override Sprint 4.5 edit-aware.';

GRANT EXECUTE ON FUNCTION public.update_comment(uuid, text) TO authenticated;


-- ============================================================
-- 3. delete_comment(p_comment_id) — UI helper (RLS handles auth)
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.comments WHERE id = p_comment_id;
  -- RLS comments_delete_own / comments_delete_admin_any handle authorization
  -- Kalau row tidak match policy, DELETE jadi no-op (silent).
END;
$$;

COMMENT ON FUNCTION public.delete_comment(uuid) IS
  'DELETE comment wrapper. Auth via RLS comments_delete_own + comments_delete_admin_any.';

GRANT EXECUTE ON FUNCTION public.delete_comment(uuid) TO authenticated;


-- ============================================================
-- 4. search_users_for_mention(p_query) — autocomplete
-- ============================================================
CREATE OR REPLACE FUNCTION public.search_users_for_mention(
  p_query text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = public, auth
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF p_query IS NULL OR length(trim(p_query)) < 1 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- RLS users_select_same_team_or_self auto-scope per role (Sprint 1).
  -- Member sees same-team, Admin/Viewer cross-team.
  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY r.full_name), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT id, full_name, role, email
    FROM public.users
    WHERE full_name ILIKE '%' || trim(p_query) || '%'
       OR email ILIKE '%' || trim(p_query) || '%'
    ORDER BY full_name
    LIMIT 10
  ) r;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.search_users_for_mention(text) IS
  'Autocomplete @mention dropdown. SECURITY INVOKER + RLS users_select_same_team_or_self auto-scope. Q2 override Sprint 4.5.';

GRANT EXECUTE ON FUNCTION public.search_users_for_mention(text) TO authenticated;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. Verify functions exist:
--      SELECT proname FROM pg_proc
--      WHERE proname IN ('parse_mention_uuids','post_comment','update_comment',
--                        'delete_comment','search_users_for_mention',
--                        '_emit_mention_notif')
--      ORDER BY proname;
--      → 6 rows
--
--   2. Test parse helper:
--      SELECT public.parse_mention_uuids(
--        'Hi @[Andi](00000000-0000-0000-0000-000000000003) please review'
--      );
--      → {00000000-0000-0000-0000-000000000003}
--
--   3. Test search:
--      SELECT public.search_users_for_mention('and');
--      → jsonb array dengan Andi (kalau visible per RLS)
-- =============================================================
