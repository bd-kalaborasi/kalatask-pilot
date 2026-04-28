-- =============================================================
-- Migration: 20260428100300_add_notif_emission_engine
--
-- Tujuan: Implement notif emission via DB triggers + scheduled function.
--   Step 3 Sprint 3 — carry-over dari Sprint 2 Q3 stub.
--
-- Coverage (per Q3 owner answer):
--   1. INSERT task → auto-add assignee + creator ke task_watchers
--   2. INSERT task dengan assignee → emit notif type='assigned'
--   3. UPDATE task assignee_id → emit assigned notif ke new assignee
--   4. UPDATE task status to 'done' → emit status_done notif ke watchers
--   5. emit_deadline_notifications() — callable function untuk
--      deadline_h3, deadline_h1, overdue tier (manual atau via pg_cron)
--
-- DEFER Sprint 4:
--   - @mention parsing → type='mentioned' (parsing markdown body kompleks)
--   - 2-day overdue escalation → type='escalation' ke manager
--
-- pg_cron note: pg_cron extension AVAILABLE di Supabase project (verified
-- via list_extensions: default_version 1.6.4) tapi installed_version=null.
-- Owner action: enable via Dashboard SQL Editor:
--   CREATE EXTENSION pg_cron;
-- Lalu schedule:
--   SELECT cron.schedule('emit-deadline-notifs-daily', '0 23 * * *',
--     $$ SELECT public.emit_deadline_notifications(); $$);
-- (23:00 UTC = 06:00 WIB next day, dipanggil sebelum office hours)
-- Sprint 3 fallback: function callable manually atau via Edge Function
-- scheduler kalau pg_cron belum enabled.
--
-- All functions SECURITY DEFINER untuk bypass RLS saat INSERT
-- notifications (RLS policy block authenticated INSERT direct, hanya
-- service_role yang allowed; SECURITY DEFINER functions effective
-- service_role).
--
-- Refer:
--   - Sprint 3 plan Step 3
--   - PRD F7 (notif tier)
--   - Sprint 2 lib/notifStub.ts (TODO marker KT-S3-NOTIF-01 — RESOLVED)
--   - Sprint 1 commit 9d8a9f7 (SECURITY DEFINER pattern)
--
-- Dependencies:
--   - 20260428100000_create_task_watchers.sql
--   - 20260428100100_create_notifications.sql
--
-- Reversal:
--   DROP TRIGGER IF EXISTS trg_tasks_after_insert_emit_notif ON public.tasks;
--   DROP TRIGGER IF EXISTS trg_tasks_after_update_emit_notif ON public.tasks;
--   DROP FUNCTION IF EXISTS public.emit_task_assigned_notif();
--   DROP FUNCTION IF EXISTS public.emit_task_status_done_notif();
--   DROP FUNCTION IF EXISTS public.emit_deadline_notifications();
--
-- Author: Claude Code (Sprint 3 Step 3)
-- =============================================================


-- ============================================================
-- 1. Helper — auto-add watcher (assignee + creator)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tasks_auto_add_watchers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Add creator (always, kalau ada)
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.task_watchers (task_id, user_id)
    VALUES (NEW.id, NEW.created_by)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;
  -- Add assignee (kalau ada dan beda dengan creator)
  IF NEW.assignee_id IS NOT NULL AND NEW.assignee_id IS DISTINCT FROM NEW.created_by THEN
    INSERT INTO public.task_watchers (task_id, user_id)
    VALUES (NEW.id, NEW.assignee_id)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tasks_auto_add_watchers IS
  'Auto-add creator + assignee ke task_watchers saat task INSERT. SECURITY DEFINER bypass watchers RLS WITH CHECK.';


-- ============================================================
-- 2. Trigger function — emit assigned notif (INSERT atau UPDATE assignee)
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_task_assigned_notif()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Skip kalau assignee NULL
  IF NEW.assignee_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip kalau assignee = current user (jangan notif ke diri sendiri saat self-assign)
  IF NEW.assignee_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Insert notif (RLS bypassed via SECURITY DEFINER)
  INSERT INTO public.notifications (user_id, type, task_id, body)
  VALUES (
    NEW.assignee_id,
    'assigned',
    NEW.id,
    format('Task baru di-assign ke kamu: "%s"', NEW.title)
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.emit_task_assigned_notif IS
  'Emit type=assigned notif saat task INSERT atau assignee_id UPDATE. Skip kalau assignee NULL atau self-assign.';


-- ============================================================
-- 3. Trigger function — emit status_done notif ke watchers
-- ============================================================
CREATE OR REPLACE FUNCTION public.emit_task_status_done_notif()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Hanya fire saat status berubah ke 'done' (transition)
  IF NEW.status <> 'done' OR OLD.status = 'done' THEN
    RETURN NEW;
  END IF;

  -- Emit ke semua watchers, kecuali user yang melakukan UPDATE
  INSERT INTO public.notifications (user_id, type, task_id, body)
  SELECT
    tw.user_id,
    'status_done',
    NEW.id,
    format('Task "%s" sudah selesai', NEW.title)
  FROM public.task_watchers tw
  WHERE tw.task_id = NEW.id
    AND tw.user_id IS DISTINCT FROM auth.uid();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.emit_task_status_done_notif IS
  'Emit type=status_done notif ke semua task watchers (kecuali yang trigger UPDATE) saat status berubah ke done.';


-- ============================================================
-- 4. Triggers wire up
-- ============================================================
CREATE TRIGGER trg_tasks_auto_add_watchers
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.tasks_auto_add_watchers();

CREATE TRIGGER trg_tasks_emit_assigned_on_insert
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  WHEN (NEW.assignee_id IS NOT NULL)
  EXECUTE FUNCTION public.emit_task_assigned_notif();

CREATE TRIGGER trg_tasks_emit_assigned_on_assignee_change
  AFTER UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW
  WHEN (NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL)
  EXECUTE FUNCTION public.emit_task_assigned_notif();

CREATE TRIGGER trg_tasks_emit_status_done
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW
  WHEN (NEW.status = 'done' AND OLD.status <> 'done')
  EXECUTE FUNCTION public.emit_task_status_done_notif();


-- ============================================================
-- 5. Scheduled function — deadline tier emission
-- ============================================================
-- Callable manually atau via pg_cron schedule (owner setup separate).
-- Idempotent: cek existing notif untuk avoid duplicate emission.
CREATE OR REPLACE FUNCTION public.emit_deadline_notifications()
RETURNS TABLE (
  notif_count_h3 int,
  notif_count_h1 int,
  notif_count_overdue int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_h3_count int := 0;
  v_h1_count int := 0;
  v_overdue_count int := 0;
BEGIN
  -- H-3 (3 hari sebelum deadline) — task non-final, deadline = today + 3
  WITH inserted AS (
    INSERT INTO public.notifications (user_id, type, task_id, body)
    SELECT
      t.assignee_id,
      'deadline_h3',
      t.id,
      format('Task "%s" deadline 3 hari lagi', t.title)
    FROM public.tasks t
    WHERE t.assignee_id IS NOT NULL
      AND t.deadline = (CURRENT_DATE + INTERVAL '3 days')::date
      AND t.status NOT IN ('done', 'blocked')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = t.assignee_id
          AND n.task_id = t.id
          AND n.type = 'deadline_h3'
      )
    RETURNING 1
  )
  SELECT count(*)::int INTO v_h3_count FROM inserted;

  -- H-1 (1 hari sebelum deadline)
  WITH inserted AS (
    INSERT INTO public.notifications (user_id, type, task_id, body)
    SELECT
      t.assignee_id,
      'deadline_h1',
      t.id,
      format('Task "%s" deadline besok', t.title)
    FROM public.tasks t
    WHERE t.assignee_id IS NOT NULL
      AND t.deadline = (CURRENT_DATE + INTERVAL '1 day')::date
      AND t.status NOT IN ('done', 'blocked')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = t.assignee_id
          AND n.task_id = t.id
          AND n.type = 'deadline_h1'
      )
    RETURNING 1
  )
  SELECT count(*)::int INTO v_h1_count FROM inserted;

  -- Overdue (past deadline, status non-final)
  WITH inserted AS (
    INSERT INTO public.notifications (user_id, type, task_id, body)
    SELECT
      t.assignee_id,
      'overdue',
      t.id,
      format('Task "%s" sudah lewat deadline', t.title)
    FROM public.tasks t
    WHERE t.assignee_id IS NOT NULL
      AND t.deadline < CURRENT_DATE
      AND t.status NOT IN ('done', 'blocked')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = t.assignee_id
          AND n.task_id = t.id
          AND n.type = 'overdue'
          AND n.created_at::date = CURRENT_DATE  -- emit max 1x/hari per task
      )
    RETURNING 1
  )
  SELECT count(*)::int INTO v_overdue_count FROM inserted;

  RETURN QUERY SELECT v_h3_count, v_h1_count, v_overdue_count;
END;
$$;

COMMENT ON FUNCTION public.emit_deadline_notifications IS
  'Scheduled emission untuk deadline_h3 / deadline_h1 / overdue tier. Idempotent (NOT EXISTS check). Owner setup: SELECT cron.schedule(...) via Dashboard setelah CREATE EXTENSION pg_cron.';

-- GRANT EXECUTE — admin + service_role bisa panggil manual untuk debug
GRANT EXECUTE ON FUNCTION public.emit_deadline_notifications TO service_role;


-- =============================================================
-- POST-APPLY MANUAL ACTIONS (owner Dashboard):
--   1. (Opsional) Enable pg_cron untuk schedule deadline emission:
--      CREATE EXTENSION IF NOT EXISTS pg_cron;
--      SELECT cron.schedule(
--        'emit-deadline-notifs-daily',
--        '0 23 * * *',  -- 23:00 UTC daily = 06:00 WIB next day
--        $$ SELECT public.emit_deadline_notifications(); $$
--      );
--
--   2. Test manual emission (admin role):
--      SELECT * FROM public.emit_deadline_notifications();
--
-- TODO Sprint 4:
--   - @mention parsing → type='mentioned' notif (markdown body parse)
--   - 2-day overdue escalation → type='escalation' ke manager
--   - Realtime broadcast Supabase channel (replace 30s polling Step 4)
-- =============================================================
