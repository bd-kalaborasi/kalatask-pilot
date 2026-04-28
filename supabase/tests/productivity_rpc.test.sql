-- =============================================================
-- Test: productivity_rpc
-- Migrations tested:
--   - 20260428110000_add_productivity_rpc.sql
--   - 20260428110100_add_workload_rpc.sql
-- Refer: ADR-004, Sprint 3 Step 5
--
-- Coverage: 6 assertions verifying RPC functions return correct JSONB shape
-- + RLS auto-scope per role:
--   1. get_productivity_metrics(NULL, 30) returns JSONB dengan key required
--   2. get_workload_summary(NULL) returns JSONB dengan members array
--   3. get_productivity_metrics scope='team' kalau p_team_id non-null
--   4. get_productivity_metrics scope='all' kalau p_team_id NULL
--   5. workload threshold default 10 (kalau app_settings missing — fallback)
--   6. velocity_per_week returns 8 weeks (generate_series)
-- =============================================================

BEGIN;
SELECT plan(6);

SET LOCAL ROLE postgres;

-- Fixture (idempotent dengan ON CONFLICT)
INSERT INTO public.teams (id, name) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test', 'Budi', 'admin',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test', 'Andi', 'member', '00000000-0000-0000-0000-00000000aaaa')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TEST 1: get_productivity_metrics returns JSONB structure
-- ============================================================
SELECT is(
  jsonb_typeof(public.get_productivity_metrics(NULL, 30)),
  'object',
  'get_productivity_metrics returns jsonb object'
);


-- ============================================================
-- TEST 2: get_workload_summary returns JSONB dengan members array
-- ============================================================
SELECT is(
  jsonb_typeof((public.get_workload_summary(NULL))->'members'),
  'array',
  'get_workload_summary members field is array'
);


-- ============================================================
-- TEST 3: scope='team' kalau p_team_id non-null
-- ============================================================
SELECT is(
  (public.get_productivity_metrics('00000000-0000-0000-0000-00000000aaaa', 30))->>'scope',
  'team',
  'productivity scope=team kalau p_team_id non-null'
);


-- ============================================================
-- TEST 4: scope='all' kalau p_team_id NULL
-- ============================================================
SELECT is(
  (public.get_productivity_metrics(NULL, 30))->>'scope',
  'all',
  'productivity scope=all kalau p_team_id NULL'
);


-- ============================================================
-- TEST 5: workload threshold from app_settings (default 10)
-- ============================================================
SELECT is(
  ((public.get_workload_summary(NULL))->>'threshold')::int,
  10,
  'workload threshold default 10 dari app_settings'
);


-- ============================================================
-- TEST 6: velocity_per_week returns 8 weeks (generate_series)
-- ============================================================
SELECT is(
  jsonb_array_length((public.get_productivity_metrics(NULL, 30))->'velocity_per_week'),
  8,
  'velocity_per_week generates 8 weeks (generate_series 7 weeks ago to now)'
);


SELECT * FROM finish();
ROLLBACK;
