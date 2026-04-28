-- =============================================================
-- Migration: 20260428130300_wire_throttled_mention
--
-- Tujuan: Sprint 4.5 Step 4 wire-up — switch _emit_mention_notif
--   call sites di post_comment + update_comment ke
--   throttled_emit_notification (Step 4 throttling-aware path).
--
-- Pre: 20260428130100_add_comment_rpcs.sql + 20260428130200_add_notif_throttling.sql
--
-- Author: Claude Code (Sprint 4.5 Step 4 wire-up)
-- =============================================================


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
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'post_comment: not authenticated';
  END IF;

  IF p_body IS NULL OR length(trim(p_body)) = 0 THEN
    RAISE EXCEPTION 'post_comment: body cannot be empty';
  END IF;

  IF length(p_body) > 2000 THEN
    RAISE EXCEPTION 'post_comment: body exceeds 2000 char';
  END IF;

  INSERT INTO public.comments (task_id, author_id, body, is_system)
  VALUES (p_task_id, v_author_id, p_body, false)
  RETURNING id INTO v_comment_id;

  v_mentions := public.parse_mention_uuids(p_body);

  IF array_length(v_mentions, 1) IS NULL THEN
    RETURN v_comment_id;
  END IF;

  SELECT title INTO v_task_title FROM public.tasks WHERE id = p_task_id;
  SELECT full_name INTO v_author_name FROM public.users WHERE id = v_author_id;

  FOREACH v_uid IN ARRAY v_mentions LOOP
    IF v_uid = v_author_id THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
      CONTINUE;
    END IF;

    -- Use throttled emit (Sprint 4.5 Step 4)
    PERFORM public.throttled_emit_notification(
      v_uid,
      'mentioned',
      p_task_id,
      format('%s mention kamu di task "%s"',
             COALESCE(v_author_name, 'Seseorang'),
             COALESCE(v_task_title, '(no title)'))
    );

    INSERT INTO public.task_watchers (task_id, user_id)
    VALUES (p_task_id, v_uid)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_comment_id;
END;
$$;


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

  SELECT body, task_id, author_id
  INTO v_old_body, v_task_id, v_author_id
  FROM public.comments
  WHERE id = p_comment_id;

  IF v_task_id IS NULL THEN
    RAISE EXCEPTION 'update_comment: comment not found or no access';
  END IF;

  UPDATE public.comments
  SET body = p_body
  WHERE id = p_comment_id;

  v_old_mentions := public.parse_mention_uuids(v_old_body);
  v_new_mentions := public.parse_mention_uuids(p_body);

  SELECT array_agg(DISTINCT u)
  INTO v_delta
  FROM unnest(v_new_mentions) AS u
  WHERE u <> ALL(COALESCE(v_old_mentions, ARRAY[]::uuid[]));

  IF array_length(v_delta, 1) IS NULL THEN
    RETURN;
  END IF;

  SELECT title INTO v_task_title FROM public.tasks WHERE id = v_task_id;
  SELECT full_name INTO v_author_name FROM public.users WHERE id = v_author_id;

  FOREACH v_uid IN ARRAY v_delta LOOP
    IF v_uid = v_author_id THEN
      CONTINUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_uid) THEN
      CONTINUE;
    END IF;

    -- Throttled emit (Sprint 4.5 Step 4)
    PERFORM public.throttled_emit_notification(
      v_uid,
      'mentioned',
      v_task_id,
      format('%s mention kamu di task "%s"',
             COALESCE(v_author_name, 'Seseorang'),
             COALESCE(v_task_title, '(no title)'))
    );

    INSERT INTO public.task_watchers (task_id, user_id)
    VALUES (v_task_id, v_uid)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;


-- _emit_mention_notif sekarang unused dari post_comment/update_comment.
-- Keep untuk backward compat (mungkin ada migration future yang reference);
-- bisa di-DROP di Sprint 5+ kalau tidak ada user.
