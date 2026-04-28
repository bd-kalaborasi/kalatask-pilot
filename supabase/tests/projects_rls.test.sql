-- =============================================================
-- Test: projects_rls
-- Migration tested: 20260427140000_create_projects_table.sql
-- Refer: ADR-002 + Sprint 1 Step 7 brief 2026-04-28 (Option C hybrid)
--
-- Coverage: 21 assertions covering 4 role × CRUD + Manager ownership scope:
--
-- SELECT (7):
--   1. anon SELECT → 0 rows (anon blocked, no policy)
--   2. member team A SELECT → 0 rows (EXPLICIT DENY — no Member policy)
--   3. member team B SELECT → 0 rows (explicit deny)
--   4. admin SELECT → 4 rows (cross-team)
--   5. viewer SELECT → 4 rows (cross-team, ADR-002 management overview)
--   6. manager team A SELECT → 2 rows (Sari's projects via ownership)
--   7. manager team B SELECT → 2 rows (Rangga's projects via ownership)
--
-- INSERT (5):
--   8. anon INSERT → throws 42501 (no GRANT INSERT for anon)
--   9. member INSERT → throws 42501
--   10. viewer INSERT → throws 42501
--   11. manager team A INSERT (owner_id = self) → success
--   12. admin INSERT → success
--
-- UPDATE (4):
--   13. manager team A UPDATE own project → success
--   14. manager team A UPDATE OTHER manager project (Rangga) → 0 rowcount
--   15. member UPDATE → 0 rowcount
--   16. admin UPDATE any → success
--
-- DELETE (5):
--   17. manager team A DELETE own → 1 rowcount
--   18. manager team A DELETE OTHER manager → 0 rowcount
--   19. member DELETE → 0 rowcount
--   20. viewer DELETE → 0 rowcount
--   21. admin DELETE → 1 rowcount
--
-- Fixture:
--   - 2 teams (Team A, Team B)
--   - 8 users (mirror users.csv: 1 admin, 2 manager, 4 member, 1 viewer)
--   - 4 projects (mirror projects.csv: 2 owned Sari/team A, 2 Rangga/team B)
--
-- Run: supabase test db (CLI) atau Dashboard SQL Editor wrap di
--      BEGIN/ROLLBACK manual. Atau MCP execute_sql via TEMP table aggregation.
--
-- Note: konsisten dengan pola users_rls.test.sql + teams_rls.test.sql
-- (single-file shot untuk Checkpoint 2 manual run).
-- =============================================================

BEGIN;
SELECT plan(21);


-- ============================================================
-- TEST FIXTURE — teams + users + projects
-- ============================================================
SET LOCAL ROLE postgres;

INSERT INTO public.teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha', 'Tim pilot fixture A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Team Beta',  'Tim pilot fixture B');

INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test',   'Budi Santoso',    'admin',   '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000002', 'sari@kalatask.test',   'Sari Wijaya',     'manager', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test',   'Andi Pratama',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000004', 'dewi@kalatask.test',   'Dewi Lestari',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000005', 'rangga@kalatask.test', 'Rangga Saputra',  'manager', '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000006', 'indah@kalatask.test',  'Indah Permata',   'member',  '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000007', 'bayu@kalatask.test',   'Bayu Hermawan',   'member',  '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000008', 'maya@kalatask.test',   'Maya Anggraini',  'viewer',  '00000000-0000-0000-0000-00000000bbbb');

INSERT INTO public.projects (id, name, description, owner_id, status, completed_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Pilot Onboarding Materials', 'Penyusunan materi onboarding pilot',  '00000000-0000-0000-0000-000000000002', 'planning',  NULL),
  ('00000000-0000-0000-0000-0000000000a2', 'Q2 Sprint Planning',         'Roadmap dan task breakdown Q2',       '00000000-0000-0000-0000-000000000002', 'active',    NULL),
  ('00000000-0000-0000-0000-0000000000b1', 'Customer Feedback Survey',   'Survey eksternal untuk product feedback', '00000000-0000-0000-0000-000000000005', 'active', NULL),
  ('00000000-0000-0000-0000-0000000000b2', 'Q1 Retrospective Report',    'Hasil retro Q1 yang sudah final',     '00000000-0000-0000-0000-000000000005', 'completed', '2026-04-15 10:00:00+07');


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
-- TEST 1: anon SELECT projects → 0 rows
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  0,
  'anon: SELECT projects returns 0 rows (no policy for anon role)'
);


-- ============================================================
-- TEST 2: member team A (Andi) SELECT → 0 rows (EXPLICIT DENY)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  0,
  'member team A: SELECT projects returns 0 rows (no Member policy = explicit deny Sprint 1)'
);


-- ============================================================
-- TEST 3: member team B (Indah) SELECT → 0 rows (EXPLICIT DENY)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  0,
  'member team B: SELECT projects returns 0 rows (no Member policy = explicit deny Sprint 1)'
);


-- ============================================================
-- TEST 4: admin (Budi) SELECT → 4 rows (cross-team)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  4,
  'admin: SELECT projects returns all 4 projects (cross-team)'
);


-- ============================================================
-- TEST 5: viewer (Maya) SELECT → 4 rows (cross-team)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  4,
  'viewer: SELECT projects returns all 4 projects (cross-team, ADR-002 management overview)'
);


-- ============================================================
-- TEST 6: manager team A (Sari) SELECT → 2 rows (her projects)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  2,
  'manager team A (Sari): SELECT projects returns 2 own projects (ownership scope, ADR-002)'
);


-- ============================================================
-- TEST 7: manager team B (Rangga) SELECT → 2 rows (his projects)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000005');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  2,
  'manager team B (Rangga): SELECT projects returns 2 own projects (ownership scope, ADR-002)'
);


-- ============================================================
-- TEST 8: anon INSERT → throws 42501 (no GRANT INSERT for anon)
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ INSERT INTO public.projects (name, owner_id) VALUES ('Anon Sneak', '00000000-0000-0000-0000-000000000001') $$,
  '42501',
  NULL,
  'anon: INSERT project throws 42501 (no GRANT INSERT, hits privilege check)'
);


-- ============================================================
-- TEST 9: member (Andi) INSERT → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.projects (name, owner_id) VALUES ('Member Sneak', '00000000-0000-0000-0000-000000000003') $$,
  '42501',
  NULL,
  'member: INSERT project throws 42501 (no Member INSERT policy)'
);


-- ============================================================
-- TEST 10: viewer (Maya) INSERT → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.projects (name, owner_id) VALUES ('Viewer Sneak', '00000000-0000-0000-0000-000000000008') $$,
  '42501',
  NULL,
  'viewer: INSERT project throws 42501 (no Viewer INSERT policy)'
);


-- ============================================================
-- TEST 11: manager team A (Sari) INSERT (owner_id = self) → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

INSERT INTO public.projects (id, name, description, owner_id, status) VALUES
  ('00000000-0000-0000-0000-0000000000a3', 'Sari New Project', 'Project baru by Sari', '00000000-0000-0000-0000-000000000002', 'planning');

SELECT is(
  (SELECT name FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a3'),
  'Sari New Project',
  'manager team A (Sari): INSERT project dengan owner_id = self succeeds'
);


-- ============================================================
-- TEST 12: admin (Budi) INSERT → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

INSERT INTO public.projects (id, name, description, owner_id, status) VALUES
  ('00000000-0000-0000-0000-0000000000ad', 'Admin Proxy Project', 'Admin assign ke Rangga', '00000000-0000-0000-0000-000000000005', 'active');

SELECT is(
  (SELECT name FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000ad'),
  'Admin Proxy Project',
  'admin: INSERT project (proxy assign owner) succeeds'
);


-- ============================================================
-- TEST 13: manager team A (Sari) UPDATE own project A1 → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

UPDATE public.projects
SET description = 'Updated by Sari herself'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (SELECT description FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1'),
  'Updated by Sari herself',
  'manager team A (Sari): UPDATE own project succeeds'
);


-- ============================================================
-- TEST 14: manager team A (Sari) UPDATE Rangga's project → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.projects
  SET description = 'Hacked by Sari'
  WHERE id = '00000000-0000-0000-0000-0000000000b1'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  0,
  'manager team A (Sari): UPDATE Rangga project returns 0 rowcount (RLS USING blocks — ownership-based)'
);


-- ============================================================
-- TEST 15: member (Andi) UPDATE → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.projects
  SET description = 'Member Hack'
  WHERE id = '00000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM updated),
  0,
  'member: UPDATE project returns 0 rowcount (no Member UPDATE policy)'
);


-- ============================================================
-- TEST 16: admin (Budi) UPDATE any project → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.projects
SET status = 'on_hold'
WHERE id = '00000000-0000-0000-0000-0000000000b1';

SELECT is(
  (SELECT status FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000b1'),
  'on_hold',
  'admin: UPDATE any project succeeds (cross-ownership)'
);


-- ============================================================
-- TEST 17: manager team A (Sari) DELETE own project A2 → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a2'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  1,
  'manager team A (Sari): DELETE own project returns 1 rowcount'
);


-- ============================================================
-- TEST 18: manager team A (Sari) DELETE Rangga's project → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000b2'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  0,
  'manager team A (Sari): DELETE Rangga project returns 0 rowcount (RLS USING blocks)'
);


-- ============================================================
-- TEST 19: member (Andi) DELETE → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  0,
  'member: DELETE project returns 0 rowcount (no Member DELETE policy)'
);


-- ============================================================
-- TEST 20: viewer (Maya) DELETE → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  0,
  'viewer: DELETE project returns 0 rowcount (no Viewer DELETE policy)'
);


-- ============================================================
-- TEST 21: admin (Budi) DELETE → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1'
  RETURNING 1
)
SELECT is(
  (SELECT count(*)::int FROM deleted),
  1,
  'admin: DELETE any project returns 1 rowcount'
);


-- ============================================================
-- FINISH + ROLLBACK
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
