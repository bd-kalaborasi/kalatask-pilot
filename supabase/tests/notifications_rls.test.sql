-- =============================================================
-- Test: notifications_rls
-- Migration tested: 20260428100100_create_notifications.sql
-- Refer: ADR-002 line 117-121, PRD line 570, Sprint 3 Step 2
--
-- Coverage: 8 assertions verifying STRICT own user_id RLS:
--   1. anon SELECT → 0 rows
--   2. member SELECT own notif → success
--   3. member SELECT other user notif → 0 rows (no cross-user)
--   4. admin SELECT others' notif → 0 rows (strict — admin tidak bypass)
--   5. member UPDATE own (mark read) → success
--   6. member UPDATE other user notif → 0 rowcount
--   7. member DELETE own → 1 rowcount
--   8. authenticated INSERT direct → throws 42501 (no INSERT policy)
--
-- Pattern: BEGIN/ROLLBACK + ON CONFLICT DO NOTHING.
-- =============================================================

BEGIN;
SELECT plan(8);


-- ============================================================
-- TEST FIXTURE
-- ============================================================
SET LOCAL ROLE postgres;

INSERT INTO public.teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha', 'Tim pilot fixture A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Team Beta',  'Tim pilot fixture B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test',  'Budi Santoso',   'admin',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test',  'Andi Pratama',   'member', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000004', 'dewi@kalatask.test',  'Dewi Lestari',   'member', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000008', 'maya@kalatask.test',  'Maya Anggraini', 'viewer', '00000000-0000-0000-0000-00000000bbbb')
ON CONFLICT (id) DO NOTHING;

-- Sample notif untuk Andi + Dewi (admin via service_role-equivalent postgres)
INSERT INTO public.notifications (id, user_id, type, body, is_read) VALUES
  ('00000000-0000-0000-0000-200000000001', '00000000-0000-0000-0000-000000000003', 'assigned', 'Task baru di-assign ke kamu', false),
  ('00000000-0000-0000-0000-200000000002', '00000000-0000-0000-0000-000000000003', 'status_done', 'Task A selesai', false),
  ('00000000-0000-0000-0000-200000000003', '00000000-0000-0000-0000-000000000004', 'assigned', 'Task X di-assign ke Dewi', false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION pg_temp.impersonate(user_uuid uuid)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', user_uuid::text, 'role', 'authenticated')::text, true);
END;
$$;


-- ============================================================
-- TEST 1: anon SELECT → 0 rows
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;
SELECT is(
  (SELECT count(*)::int FROM public.notifications),
  0,
  'anon: SELECT notifications → 0 rows'
);


-- ============================================================
-- TEST 2: member Andi SELECT own → 2 rows
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.notifications),
  2,
  'member Andi: SELECT own notif → 2 rows'
);


-- ============================================================
-- TEST 3: member Andi SELECT specifically Dewi's notif → 0 rows
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.notifications
   WHERE id = '00000000-0000-0000-0000-200000000003'),
  0,
  'member Andi: SELECT Dewi notif → 0 rows (cross-user blocked)'
);


-- ============================================================
-- TEST 4: admin SELECT others notif → 0 rows (strict per ADR-002)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.notifications),
  0,
  'admin Budi: SELECT notif → 0 rows (admin sendiri tidak ada notif; strict own user_id)'
);


-- ============================================================
-- TEST 5: member Andi UPDATE own (mark read) → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

UPDATE public.notifications
SET is_read = true
WHERE id = '00000000-0000-0000-0000-200000000001';

SELECT is(
  (SELECT is_read FROM public.notifications WHERE id = '00000000-0000-0000-0000-200000000001'),
  true,
  'member Andi: UPDATE own notif is_read=true → success'
);


-- ============================================================
-- TEST 6: member Andi UPDATE Dewi's notif → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.notifications
  SET is_read = true
  WHERE id = '00000000-0000-0000-0000-200000000003'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM updated)
SELECT is(c, 0,
  'member Andi: UPDATE Dewi notif → 0 rowcount (RLS USING blocks)') FROM counted;


-- ============================================================
-- TEST 7: member Andi DELETE own → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.notifications
  WHERE id = '00000000-0000-0000-0000-200000000002'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 1,
  'member Andi: DELETE own notif → 1 rowcount') FROM counted;


-- ============================================================
-- TEST 8: authenticated direct INSERT → throws 42501 (no INSERT policy)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.notifications (user_id, type, body) VALUES ('00000000-0000-0000-0000-000000000003', 'assigned', 'Sneak') $$,
  '42501',
  NULL,
  'authenticated: INSERT direct → throws 42501 (no INSERT policy, must via DB trigger SECURITY DEFINER)'
);


-- ============================================================
-- FINISH + ROLLBACK
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
