-- =============================================================
-- Migration: 20260428130200_add_notif_throttling
--
-- Tujuan: Sprint 4.5 Step 4 — notification throttling per research
--   Recommendation #2 (notif spam = adoption killer #2). Hard cap
--   max 5 notif per user per rolling 1-hour window. Overflow buffer
--   ke `notification_digest_queue`, flushed jadi single digest notif
--   1× per hari via `flush_notification_digest()` (manual trigger
--   Sprint 4.5; pg_cron schedule defer Sprint 6+).
--
-- Threshold configurable via app_settings (Q4 Sprint 3 pattern reuse):
--   - notif_max_per_hour (default 5)
--
-- Schema additions:
--   1. notification_digest_queue (id, user_id, original_type, task_id, body, created_at)
--   2. throttled_emit_notification(p_user_id, p_type, p_task_id, p_body)
--      SECURITY DEFINER wrapper — replaces direct INSERT pattern
--   3. flush_notification_digest() SECURITY DEFINER — batch dequeue
--      + emit single digest notif per user
--
-- Notifications enum extended via CHECK constraint replace (need
-- to add 'digest' type kalau belum ada).
--
-- Refer:
--   - Sprint 4.5 plan Step 4
--   - Research Recommendation #2 (5 notif/hour cap)
--   - Sprint 3 emit pattern (notifications direct INSERT)
--   - app_settings table (Sprint 3 Step 1)
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.flush_notification_digest();
--   DROP FUNCTION IF EXISTS public.throttled_emit_notification(uuid,text,uuid,text);
--   DROP TABLE IF EXISTS public.notification_digest_queue CASCADE;
--   ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
--   ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check ...;
--
-- Author: Claude Code (Sprint 4.5 Step 4)
-- =============================================================


-- ============================================================
-- 1. Add 'digest' to notifications type enum
-- ============================================================
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('assigned','status_done','deadline_h3','deadline_h1','overdue','mentioned','escalation','digest'));


-- ============================================================
-- 2. Seed default throttle threshold
-- ============================================================
INSERT INTO public.app_settings (key, value)
VALUES ('notif_max_per_hour', '5'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================
-- 3. Digest queue table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notification_digest_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  original_type  text NOT NULL,
  task_id        uuid REFERENCES public.tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notification_digest_queue IS
  'Buffer untuk notif yang overflow throttle cap. Flushed via flush_notification_digest() jadi single digest notif per user.';

CREATE INDEX IF NOT EXISTS idx_notif_digest_user_created
  ON public.notification_digest_queue (user_id, created_at);

-- RLS — only service_role + admin (system table, not user-facing)
ALTER TABLE public.notification_digest_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_digest_queue FORCE  ROW LEVEL SECURITY;

CREATE POLICY "digest_queue_select_admin" ON public.notification_digest_queue
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.notification_digest_queue TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.notification_digest_queue TO service_role;


-- ============================================================
-- 4. throttled_emit_notification — public wrapper untuk Sprint 3+ usage
-- ============================================================
-- Pattern: kalau user sudah hit cap dalam 1-hour window, divert ke digest
-- queue. Otherwise normal INSERT notifications.
-- SECURITY DEFINER untuk bypass notifications INSERT RLS.
CREATE OR REPLACE FUNCTION public.throttled_emit_notification(
  p_user_id uuid,
  p_type text,
  p_task_id uuid,
  p_body text
)
RETURNS uuid  -- notification_id atau NULL kalau diverted ke queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int;
  v_recent_count int;
  v_notif_id uuid;
BEGIN
  -- Read threshold dari app_settings (default 5)
  SELECT (value)::text::int INTO v_max
  FROM public.app_settings
  WHERE key = 'notif_max_per_hour';

  IF v_max IS NULL THEN
    v_max := 5;
  END IF;

  -- Count notif dalam rolling 1-hour window
  SELECT COUNT(*) INTO v_recent_count
  FROM public.notifications
  WHERE user_id = p_user_id
    AND type <> 'digest'  -- digest itself bukan throttle target
    AND created_at > now() - interval '1 hour';

  IF v_recent_count >= v_max THEN
    -- Cap reached → divert ke digest queue
    INSERT INTO public.notification_digest_queue (user_id, original_type, task_id, body)
    VALUES (p_user_id, p_type, p_task_id, p_body);
    RETURN NULL;
  END IF;

  -- Below cap → normal INSERT
  INSERT INTO public.notifications (user_id, type, task_id, body)
  VALUES (p_user_id, p_type, p_task_id, p_body)
  RETURNING id INTO v_notif_id;

  RETURN v_notif_id;
END;
$$;

COMMENT ON FUNCTION public.throttled_emit_notification(uuid,text,uuid,text) IS
  'Throttled notif emit. Cap from app_settings.notif_max_per_hour (default 5). Overflow → digest queue. Sprint 4.5 Step 4.';

GRANT EXECUTE ON FUNCTION public.throttled_emit_notification(uuid,text,uuid,text) TO authenticated;


-- ============================================================
-- 5. flush_notification_digest — batch dequeue + emit digest notif
-- ============================================================
-- Per user yang punya queue items, emit 1 digest notif summarizing.
-- DELETE queue items setelah flush.
-- SECURITY DEFINER (admin / cron-callable).
CREATE OR REPLACE FUNCTION public.flush_notification_digest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_users_count int := 0;
  v_total_items int := 0;
  v_user record;
  v_count int;
BEGIN
  -- Iterate users yang punya queue items
  FOR v_user IN
    SELECT user_id, COUNT(*) AS item_count
    FROM public.notification_digest_queue
    GROUP BY user_id
  LOOP
    INSERT INTO public.notifications (user_id, type, task_id, body)
    VALUES (
      v_user.user_id,
      'digest',
      NULL,
      format('%s update kemarin yang lewat throttle. Buka semua di history.', v_user.item_count)
    );

    -- Cleanup queue
    DELETE FROM public.notification_digest_queue WHERE user_id = v_user.user_id;

    v_users_count := v_users_count + 1;
    v_total_items := v_total_items + v_user.item_count;
  END LOOP;

  RETURN jsonb_build_object(
    'users_flushed', v_users_count,
    'items_summarized', v_total_items
  );
END;
$$;

COMMENT ON FUNCTION public.flush_notification_digest() IS
  'Batch flush digest queue → single digest notif per user. Manual trigger Sprint 4.5; pg_cron schedule defer Sprint 6+.';

-- Admin-callable
GRANT EXECUTE ON FUNCTION public.flush_notification_digest() TO authenticated;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. Verify type='digest' valid:
--      INSERT INTO public.notifications (user_id, type, body)
--      VALUES ('00000000-0000-0000-0000-000000000001', 'digest', 'test');
--      → success
--
--   2. Verify throttle threshold seeded:
--      SELECT value FROM public.app_settings WHERE key='notif_max_per_hour';
--      → 5
--
--   3. Test throttling — emit 6 notifs untuk same user, verify 6th goes to queue:
--      SELECT public.throttled_emit_notification(
--        '00000000-0000-0000-0000-000000000003'::uuid,
--        'mentioned',
--        NULL,
--        format('Test %s', i)
--      ) FROM generate_series(1,6) i;
--      → first 5 return uuid, 6th returns NULL
--      SELECT count(*) FROM public.notification_digest_queue
--      WHERE user_id = '00000000-0000-0000-0000-000000000003';
--      → 1
-- =============================================================
