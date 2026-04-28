-- =============================================================
-- Test: projects_status_lifecycle
-- Migration tested: 20260427140000_create_projects_table.sql
-- Refer: ADR-002, F14 (PRD §3.1 line 144), Sprint 2 Step 2
--
-- Coverage: 6 assertions verifying project status UPDATE permission
-- per role + field preservation:
--   1. admin UPDATE any project status → success
--   2. manager UPDATE own project status → success
--   3. manager UPDATE OTHER manager's project status → 0 rowcount (RLS USING block)
--   4. member UPDATE project status → 0 rowcount (no Member UPDATE policy)
--   5. viewer UPDATE project status → 0 rowcount (no Viewer UPDATE policy)
--   6. status UPDATE preserves other field values (name, description unchanged)
--
-- Fixture: 2 teams + 5 users + 2 projects (test-scoped UUIDs).
-- Pattern: BEGIN/ROLLBACK transaction-rollback (Sprint 1 RLS test convention).
-- ON CONFLICT (id) DO NOTHING di setup INSERTs supaya idempotent terhadap
-- state DB:
--   - Empty DB (dev): semua INSERT proceed normal
--   - Post-Sprint-1-auth-seed (current): teams + 4 users sudah persisten,
--     ON CONFLICT skip duplicate rows. User 005 (rangga) inserted fresh.
--   - Post-Sprint-2-demo-seed: project a1/b1 UUIDs distinct dari dXXX seed.
-- ROLLBACK at end wipe rangga + projects; persistent teams/users untouched.
--
-- Run: MCP execute_sql via TEMP table aggregation pattern, atau Dashboard
-- SQL Editor (paste isi file → Run).
-- =============================================================

BEGIN;
SELECT plan(6);


-- ============================================================
-- TEST FIXTURE — teams + users + projects
-- ============================================================
SET LOCAL ROLE postgres;

-- Teams: ON CONFLICT DO NOTHING — Team Alpha/Beta likely persisten dari
-- Sprint 1 auth_users_seed.sql. Skip duplicate, reuse existing UUID.
INSERT INTO public.teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha', 'Tim pilot fixture A'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Team Beta',  'Tim pilot fixture B')
ON CONFLICT (id) DO NOTHING;

-- Users: ON CONFLICT DO NOTHING — 4 user (001/002/003/008) persisten dari
-- auth_users_seed.sql. Email/full_name yang persisten akan tetap dipakai
-- (skip new values di test fixture). User 005 (rangga manager Team Beta)
-- TIDAK ada di auth seed → fresh INSERT untuk transaction scope.
-- ROLLBACK at end wipe rangga 005, persistent users untouched.
INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test',   'Budi Santoso',    'admin',   '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000002', 'sari@kalatask.test',   'Sari Wijaya',     'manager', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test',   'Andi Pratama',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000005', 'rangga@kalatask.test', 'Rangga Saputra',  'manager', '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000008', 'maya@kalatask.test',   'Maya Anggraini',  'viewer',  '00000000-0000-0000-0000-00000000bbbb')
ON CONFLICT (id) DO NOTHING;

-- Projects: test-scoped UUIDs (...a1, ...b1) — distinct dari demo seed
-- (...d1100/d2200/d3300). No conflict possible. INSERT plain.
INSERT INTO public.projects (id, name, description, owner_id, status) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Project Alpha One',  'Owner Sari',   '00000000-0000-0000-0000-000000000002', 'planning'),
  ('00000000-0000-0000-0000-0000000000b1', 'Project Beta One',   'Owner Rangga', '00000000-0000-0000-0000-000000000005', 'planning');


-- Helper: impersonate user via JWT claim
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
-- TEST 1: admin UPDATE any project status → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.projects
SET status = 'active'
WHERE id = '00000000-0000-0000-0000-0000000000b1';

SELECT is(
  (SELECT status FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000b1'),
  'active',
  'admin: UPDATE project status (cross-team) succeeds — F14 lifecycle'
);


-- ============================================================
-- TEST 2: manager UPDATE own project status → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

UPDATE public.projects
SET status = 'on_hold'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

SELECT is(
  (SELECT status FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1'),
  'on_hold',
  'manager (Sari): UPDATE own project status succeeds — F14 lifecycle'
);


-- ============================================================
-- TEST 3: manager UPDATE OTHER manager project → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.projects
  SET status = 'archived'
  WHERE id = '00000000-0000-0000-0000-0000000000b1'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM updated)
SELECT is(c, 0,
  'manager (Sari): UPDATE Rangga project status → 0 rowcount (RLS USING ownership block)') FROM counted;


-- ============================================================
-- TEST 4: member UPDATE project status → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.projects
  SET status = 'completed'
  WHERE id = '00000000-0000-0000-0000-0000000000a1'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM updated)
SELECT is(c, 0,
  'member (Andi): UPDATE project status → 0 rowcount (no Member UPDATE policy)') FROM counted;


-- ============================================================
-- TEST 5: viewer UPDATE project status → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.projects
  SET status = 'archived'
  WHERE id = '00000000-0000-0000-0000-0000000000a1'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM updated)
SELECT is(c, 0,
  'viewer (Maya): UPDATE project status → 0 rowcount (no Viewer UPDATE policy)') FROM counted;


-- ============================================================
-- TEST 6: status UPDATE preserves other fields (no field lock issue)
-- ============================================================
-- Setup: capture original name + description
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

UPDATE public.projects
SET status = 'completed'
WHERE id = '00000000-0000-0000-0000-0000000000a1';

SELECT results_eq(
  $$ SELECT name, description FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1' $$,
  $$ VALUES ('Project Alpha One'::text, 'Owner Sari'::text) $$,
  'status UPDATE preserves other fields (name + description unchanged)'
);


-- ============================================================
-- FINISH + ROLLBACK
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
