-- =============================================================
-- Migration: 20260428100100_create_notifications
--
-- Tujuan: Tabel notifications untuk in-app notification queue per user.
--   Sprint 3 carry-over dari Sprint 2 Q3 stub (notifStub.ts) — sekarang
--   real persistence + emission via DB triggers (Step 3).
--
-- Schema (per PRD §7 ERD line 527-535):
--   id, user_id, type, task_id, body, is_read, created_at
--
-- Type enum (Sprint 3 scope per Q3 owner answer):
--   - 'assigned'      : task assigned ke user
--   - 'status_done'   : task status berubah ke done (notif untuk watchers)
--   - 'deadline_h3'   : H-3 sebelum deadline (warning tier)
--   - 'deadline_h1'   : H-1 sebelum deadline (urgent tier)
--   - 'overdue'       : past deadline (critical tier)
--   - 'mentioned'     : @mentioned di komen — DEFER Sprint 4 (parsing complex)
--   - 'escalation'    : 2 hari overdue, escalate ke manager (Sprint 4+)
--
-- RLS strategy (per PRD §7 line 570 + ADR-002 line 117-121):
--   - SELECT/UPDATE/DELETE: own user_id only
--   - INSERT: service_role only (via DB trigger SECURITY DEFINER)
--
-- Refer:
--   - PRD §7 ERD line 527-535
--   - PRD §3.1 F7 (notification escalation tier)
--   - ADR-002 line 117-121 (notifications RLS matrix)
--   - Sprint 2 lib/notifStub.ts (TODO marker KT-S3-NOTIF-01)
--
-- Dependencies:
--   - 20260427120100_create_users_table.sql
--   - 20260427150000_create_tasks_table.sql
--
-- Reversal:
--   DROP TABLE IF EXISTS public.notifications CASCADE;
--
-- Author: Claude Code (Sprint 3 Step 1)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type       text NOT NULL
               CHECK (type IN ('assigned','status_done','deadline_h3','deadline_h1','overdue','mentioned','escalation')),
  task_id    uuid REFERENCES public.tasks(id) ON DELETE CASCADE ON UPDATE CASCADE,
  body       text NOT NULL,
  is_read    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS
  'In-app notification queue per user. PRD §7, F7. Sprint 3 carry-over dari Sprint 2 Q3 stub.';
COMMENT ON COLUMN public.notifications.type IS
  '7 enum: assigned/status_done/deadline_h3/deadline_h1/overdue/mentioned/escalation. Sprint 3 cover 5; mentioned + escalation defer Sprint 4.';
COMMENT ON COLUMN public.notifications.task_id IS
  'Nullable — sebagian notif global (mis. system announcement). Sprint 3 semua task-bound.';
COMMENT ON COLUMN public.notifications.body IS
  'Plain-text notif body, Bahasa Indonesia per BRAND.md microcopy. Markdown not rendered di Sprint 3.';


-- ============================================================
-- 2. INDEXES
-- ============================================================
-- user_id partial index untuk unread query (badge count)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE is_read = false;

-- user_id full index untuk dropdown list (read + unread)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);


-- ============================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 4. POLICIES (own user_id only — strict per ADR-002)
-- ============================================================

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON POLICY "notifications_select_own" ON public.notifications IS
  'Each user lihat notif sendiri. Strict — no cross-user access (PRD line 570).';


CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "notifications_update_own" ON public.notifications IS
  'Mark as read / unread own notif. UPDATE only — INSERT via service_role trigger.';


CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON POLICY "notifications_delete_own" ON public.notifications IS
  'Clear own notif. PRD line 559: hard-delete setelah 30 hari (cron archival Sprint 5+).';


-- INSERT — NO authenticated policy. Hanya service_role + DB trigger SECURITY DEFINER.
-- DB trigger di Step 3 menggunakan SECURITY DEFINER bypass RLS untuk emit notif.


-- ============================================================
-- 5. GRANT
-- ============================================================
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO service_role;
-- authenticated NO INSERT — emission via DB trigger (Step 3)
-- anon NO access


-- =============================================================
-- TODO Sprint 3:
--   - Step 3: DB triggers untuk emit notif (assigned + status_done + deadline tier)
--   - Step 4: UI badge + dropdown
-- TODO Sprint 4:
--   - @mention parsing → emit type='mentioned'
--   - 2-day overdue escalation → emit type='escalation' ke manager
--   - Realtime broadcast via Supabase channel (replace 30s polling)
-- TODO Sprint 5:
--   - Archival cron (delete > 30 hari)
-- =============================================================
