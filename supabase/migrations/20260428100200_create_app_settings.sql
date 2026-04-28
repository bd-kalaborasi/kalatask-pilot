-- =============================================================
-- Migration: 20260428100200_create_app_settings
--
-- Tujuan: Tabel app_settings untuk store configurable threshold + flag
--   yang admin bisa update tanpa code change. Sprint 3 carry-over dari
--   Sprint 2 Q4 owner answer (workload threshold + bottleneck threshold
--   configurable via app_settings).
--
-- Schema (per PRD §7 ERD line 132-137):
--   key TEXT PK, value JSONB, updated_at, updated_by
--
-- Initial seed values:
--   - workload_overloaded_threshold: 10 (PRD F5 default)
--   - bottleneck_threshold_days: 3 (PRD F6 default)
--   - notification_warning_days_before_deadline: 3 (PRD F7)
--   - notification_urgent_days_before_deadline: 1 (PRD F7)
--   - cowork_sync_schedule_cron: '0 7 * * *' (Sprint 5 prep)
--
-- RLS strategy:
--   - SELECT: authenticated (all users — read for UI configurability)
--   - INSERT/UPDATE: admin only (admin updateable per Q4 owner answer)
--   - DELETE: not exposed (system-managed keys)
--
-- Refer:
--   - PRD §7 ERD line 132-137
--   - Sprint 2 Q4 owner decision
--   - ADR-002 line 134-138 (app_settings RLS matrix)
--   - Sprint 3 plan Step 1
--
-- Reversal:
--   DROP TABLE IF EXISTS public.app_settings CASCADE;
--
-- Author: Claude Code (Sprint 3 Step 1)
-- =============================================================


-- ============================================================
-- 1. CREATE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE public.app_settings IS
  'Key-value config table. Admin updateable threshold + flag yang affect runtime behavior. PRD §7.';


-- ============================================================
-- 2. TRIGGERS — auto-update updated_at
-- ============================================================
CREATE TRIGGER trg_app_settings_set_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 3. ROW-LEVEL SECURITY
-- ============================================================
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings FORCE  ROW LEVEL SECURITY;


-- ============================================================
-- 4. POLICIES
-- ============================================================
CREATE POLICY "app_settings_select_authenticated" ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (true);

COMMENT ON POLICY "app_settings_select_authenticated" ON public.app_settings IS
  'Semua role authenticated bisa SELECT — settings publicly readable untuk UI rendering.';


CREATE POLICY "app_settings_insert_admin_only" ON public.app_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "app_settings_update_admin_only" ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY "app_settings_update_admin_only" ON public.app_settings IS
  'Admin only — Q4 owner decision. Admin UI Sprint 5+ untuk edit threshold via dashboard.';


-- ============================================================
-- 5. GRANT
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.app_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO service_role;
-- anon: no access


-- ============================================================
-- 6. INITIAL SEED — default threshold values
-- ============================================================
-- Sengaja tidak ON CONFLICT DO NOTHING — kalau key sudah ada (mis.
-- migration re-run), JANGAN reset. Pakai ON CONFLICT DO NOTHING agar
-- forward-only safe.
INSERT INTO public.app_settings (key, value) VALUES
  ('workload_overloaded_threshold', '10'::jsonb),
  ('bottleneck_threshold_days', '3'::jsonb),
  ('notification_warning_days_before_deadline', '3'::jsonb),
  ('notification_urgent_days_before_deadline', '1'::jsonb),
  ('cowork_sync_schedule_cron', '"0 7 * * *"'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- =============================================================
-- TODO Sprint 5+:
--   - Admin UI page (/admin/settings) untuk edit threshold dengan UI
--   - Audit trail log saat threshold change (activity_log integration)
-- =============================================================
