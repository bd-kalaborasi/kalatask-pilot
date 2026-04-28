-- =============================================================
-- Test: teams_rls
-- Migration tested:
--   - 20260427130000_create_teams_table.sql (teams + RLS + GRANT)
--   - 20260427130100_add_fk_users_team_id.sql (FK ON DELETE SET NULL)
-- Refer: ADR-002 + Sprint 1 Step 6 brief 2026-04-28
--
-- Coverage: 13 assertions across 4 role × CRUD operations + FK behavior:
--   1.  anon SELECT → 0 rows (anon blocked by RLS, no policy match)
--   2.  member team A SELECT → 1 row (Team A only — own team scope)
--   3.  member team B SELECT → 1 row (Team B only — own team scope)
--   4.  admin SELECT → 2 rows (all teams)
--   5.  viewer SELECT → 2 rows (cross-team per ADR-002)
--   6.  member INSERT → throws 42501 (insufficient_privilege)
--   7.  viewer INSERT → throws 42501
--   8.  admin INSERT → success (1 new row, Team Gamma)
--   9.  member UPDATE Team A → 0 rowcount (RLS USING fail)
--   10. admin UPDATE Team A description → success
--   11. member DELETE Team A → 0 rowcount (RLS USING fail)
--   12. admin DELETE Team B → 1 rowcount
--   13. FK ON DELETE SET NULL → users yang anggota Team B punya team_id NULL
--
-- Fixture: 2 teams (mirror seed/teams.csv) + 8 users (mirror users.csv).
-- Loading: inline INSERT (CSV COPY tidak portable di Dashboard).
--
-- Run: supabase test db (butuh Supabase CLI installed + linked)
-- Atau via Dashboard SQL Editor — wrap manual di BEGIN/ROLLBACK.
--
-- Note: deviation dari skill rls-tester convention "1 file = 1 scenario",
-- konsisten dengan keputusan di users_rls.test.sql — single-file shot
-- untuk owner manual run di Checkpoint 2.
-- =============================================================

BEGIN;
SELECT plan(13);


-- ============================================================
-- TEST FIXTURE — mirror teams.csv + users.csv
-- ============================================================
SET LOCAL ROLE postgres;

-- Insert teams DULU (FK target untuk users.team_id)
INSERT INTO public.teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha', 'Tim pilot fixture A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Team Beta',  'Tim pilot fixture B');

-- Insert users (FK team_id otomatis valid karena teams sudah exist)
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
-- TEST 1: anon SELECT teams → 0 rows
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.teams),
  0,
  'anon: SELECT teams returns 0 rows (no policy for anon role)'
);


-- ============================================================
-- TEST 2: member team A (Andi) SELECT → 1 row (Team A only)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.teams),
  1,
  'member team A: SELECT teams returns only Team A (own team scope)'
);


-- ============================================================
-- TEST 3: member team B (Indah) SELECT → 1 row (Team B only)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.teams),
  1,
  'member team B: SELECT teams returns only Team B (own team scope)'
);


-- ============================================================
-- TEST 4: admin (Budi) SELECT → 2 rows (all teams)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.teams),
  2,
  'admin: SELECT teams returns all 2 teams (cross-team)'
);


-- ============================================================
-- TEST 5: viewer (Maya) SELECT → 2 rows (cross-team per ADR-002)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.teams),
  2,
  'viewer: SELECT teams returns all 2 teams (cross-team, ADR-002 management overview)'
);


-- ============================================================
-- TEST 6: member (Andi) INSERT → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.teams (name, description) VALUES ('Team Hacker', 'unauthorized') $$,
  '42501',
  NULL,
  'member: INSERT team throws 42501 (insufficient_privilege)'
);


-- ============================================================
-- TEST 7: viewer (Maya) INSERT → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.teams (name, description) VALUES ('Team Viewer Sneak', 'unauthorized') $$,
  '42501',
  NULL,
  'viewer: INSERT team throws 42501'
);


-- ============================================================
-- TEST 8: admin (Budi) INSERT → success (Team Gamma)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

INSERT INTO public.teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-00000000cccc', 'Team Gamma', 'Tim baru hasil insert admin');

SELECT is(
  (SELECT name FROM public.teams WHERE id = '00000000-0000-0000-0000-00000000cccc'),
  'Team Gamma',
  'admin: INSERT new team succeeds'
);


-- ============================================================
-- TEST 9: member (Andi) UPDATE Team A → 0 rowcount (RLS USING fail)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.teams
  SET description = 'Hacked by Andi'
  WHERE id = '00000000-0000-0000-0000-00000000aaaa'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  0,
  'member: UPDATE team returns 0 rowcount (RLS USING blocks — admin only policy)'
);


-- ============================================================
-- TEST 10: admin (Budi) UPDATE Team A description → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.teams
SET description = 'Tim pilot fixture A — updated by admin'
WHERE id = '00000000-0000-0000-0000-00000000aaaa';

SELECT is(
  (SELECT description FROM public.teams WHERE id = '00000000-0000-0000-0000-00000000aaaa'),
  'Tim pilot fixture A — updated by admin',
  'admin: UPDATE team description succeeds'
);


-- ============================================================
-- TEST 11: member (Andi) DELETE Team A → 0 rowcount (RLS USING fail)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.teams WHERE id = '00000000-0000-0000-0000-00000000aaaa'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  0,
  'member: DELETE team returns 0 rowcount (RLS USING fail, admin only policy)'
);


-- ============================================================
-- TEST 12: admin (Budi) DELETE Team B → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.teams WHERE id = '00000000-0000-0000-0000-00000000bbbb'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  1,
  'admin: DELETE Team B returns 1 rowcount'
);


-- ============================================================
-- TEST 13: FK ON DELETE SET NULL — users Team B otomatis team_id NULL
-- ============================================================
-- Setelah TEST 12 DELETE Team B, 4 user yang sebelumnya anggota Team B
-- (Rangga/Indah/Bayu/Maya) seharusnya punya team_id = NULL otomatis
-- via FK ON DELETE SET NULL behavior.
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.users WHERE team_id IS NULL),
  4,
  'FK ON DELETE SET NULL: 4 users (ex-Team B) ter-orphan dengan team_id NULL'
);


-- ============================================================
-- FINISH + ROLLBACK (test data tidak persist)
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
