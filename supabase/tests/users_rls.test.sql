-- =============================================================
-- Test: users_rls
-- Migration tested: 20260427120100_create_users_table.sql
-- Refer: ADR-002 + Sprint 1 task brief 2026-04-27
--
-- Coverage: 12 assertions across 4 role × CRUD operations:
--   1.  anon SELECT → 0 rows (anon blocked)
--   2.  member team A SELECT → 4 team A users only
--   3.  member team B SELECT → 4 team B users only
--   4.  admin SELECT → all 8 users
--   5.  viewer INSERT → throws 42501 (insufficient_privilege)
--   6.  member INSERT → throws 42501
--   7.  admin INSERT → success (1 new row)
--   8.  member self UPDATE → full_name changes, role locked (field_lock)
--   9.  member UPDATE other team A user → 0 rowcount (USING fail)
--   10. admin UPDATE any user role → success
--   11. viewer DELETE → 0 rowcount (USING fail)
--   12. admin DELETE → 1 rowcount
--
-- Fixture: mirror supabase/seed/users.csv (8 users, 2 teams).
-- Loading: inline INSERT (CSV COPY tidak portable di Dashboard).
--
-- Run: supabase test db (butuh Supabase CLI installed + linked)
-- Atau via Dashboard SQL Editor — wrap manual di BEGIN/ROLLBACK.
--
-- Note: deviation dari skill rls-tester convention "1 file = 1 scenario".
-- Single file digunakan supaya owner bisa run satu shot untuk Checkpoint 2
-- manual test. Future test untuk tabel berikutnya akan ikut convention.
-- =============================================================

BEGIN;
SELECT plan(12);


-- ============================================================
-- TEST FIXTURE — mirror users.csv
-- ============================================================
-- SET role postgres (superuser) untuk bypass FORCE RLS saat seed.
-- Kalau test framework sudah jalan as postgres, ini no-op.
SET LOCAL ROLE postgres;

INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test',   'Budi Santoso',    'admin',   '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000002', 'sari@kalatask.test',   'Sari Wijaya',     'manager', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test',   'Andi Pratama',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000004', 'dewi@kalatask.test',   'Dewi Lestari',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000005', 'rangga@kalatask.test', 'Rangga Saputra',  'manager', '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000006', 'indah@kalatask.test',  'Indah Permata',   'member',  '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000007', 'bayu@kalatask.test',   'Bayu Hermawan',   'member',  '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000008', 'maya@kalatask.test',   'Maya Anggraini',  'viewer',  '00000000-0000-0000-0000-00000000bbbb');


-- ============================================================
-- HELPER (session-local) — impersonate user via JWT claim
-- ============================================================
-- pg_temp schema = session-local, auto-drop saat session end.
-- set_config(... is_local=true) = transaction-scope JWT claim override.
CREATE OR REPLACE FUNCTION pg_temp.impersonate(user_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('sub', user_uuid::text, 'role', 'authenticated')::text,
    true
  );
END;
$$;


-- ============================================================
-- TEST 1: anon SELECT users → 0 rows
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.users),
  0,
  'anon: SELECT users returns 0 rows (no policy for anon role)'
);


-- ============================================================
-- TEST 2: member team A (Andi) SELECT → 4 team A users only
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.users),
  4,
  'member team A: SELECT users returns only 4 team A members'
);


-- ============================================================
-- TEST 3: member team B (Indah) SELECT → 4 team B users only
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.users),
  4,
  'member team B: SELECT users returns only 4 team B members'
);


-- ============================================================
-- TEST 4: admin (Budi) SELECT → all 8 users
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.users),
  8,
  'admin: SELECT users returns all 8 users (cross-team)'
);


-- ============================================================
-- TEST 5: viewer (Maya) INSERT → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.users (email, full_name, role) VALUES ('hacker@kalatask.test', 'Hacker', 'admin') $$,
  '42501',
  NULL,
  'viewer: INSERT user throws 42501 (insufficient_privilege)'
);


-- ============================================================
-- TEST 6: member (Andi) INSERT → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.users (email, full_name, role) VALUES ('mole@kalatask.test', 'Mole', 'member') $$,
  '42501',
  NULL,
  'member: INSERT user throws 42501'
);


-- ============================================================
-- TEST 7: admin (Budi) INSERT → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-00000000ff09', 'newhire@kalatask.test', 'New Hire', 'member', '00000000-0000-0000-0000-00000000aaaa');

SELECT is(
  (SELECT email FROM public.users WHERE id = '00000000-0000-0000-0000-00000000ff09'),
  'newhire@kalatask.test',
  'admin: INSERT new user succeeds'
);


-- ============================================================
-- TEST 8: member (Andi) self UPDATE → full_name changes, role locked
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

UPDATE public.users
SET full_name = 'Andi Pratama Updated',
    role = 'admin'  -- attempt privilege escalation
WHERE id = '00000000-0000-0000-0000-000000000003';

SELECT results_eq(
  $$ SELECT full_name, role FROM public.users WHERE id = '00000000-0000-0000-0000-000000000003' $$,
  $$ VALUES ('Andi Pratama Updated', 'member') $$,
  'member self UPDATE: full_name changes but role locked (field_lock trigger)'
);


-- ============================================================
-- TEST 9: member (Andi) UPDATE other team A user (Dewi) → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.users
  SET full_name = 'Hacked Dewi'
  WHERE id = '00000000-0000-0000-0000-000000000004'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  0,
  'member: UPDATE other team A user returns 0 rowcount (RLS USING blocks row)'
);


-- ============================================================
-- TEST 10: admin (Budi) UPDATE any user role → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.users
SET role = 'manager'
WHERE id = '00000000-0000-0000-0000-000000000004';

SELECT is(
  (SELECT role FROM public.users WHERE id = '00000000-0000-0000-0000-000000000004'),
  'manager',
  'admin: UPDATE any user role succeeds (field_lock bypassed via is_admin)'
);


-- ============================================================
-- TEST 11: viewer (Maya) DELETE → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000007'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  0,
  'viewer: DELETE user returns 0 rowcount (RLS USING fail, no policy match)'
);


-- ============================================================
-- TEST 12: admin (Budi) DELETE → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000007'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  1,
  'admin: DELETE user returns 1 rowcount'
);


-- ============================================================
-- FINISH + ROLLBACK (test data tidak persist)
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
