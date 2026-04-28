-- =============================================================
-- Test: task_watchers_rls
-- Migration tested: 20260428100000_create_task_watchers.sql
-- Refer: ADR-002 line 102-107, Sprint 3 Step 2
--
-- Coverage: 8 assertions verifying RLS per role + ownership pattern:
--   1. anon SELECT → 0 rows
--   2. admin SELECT → semua watchers visible
--   3. member SELECT own task watchers → visible (task RLS allow)
--   4. member SELECT cross-team task watchers → 0 rows (task RLS block)
--   5. member INSERT self watcher → success
--   6. member INSERT other user watcher → throws 42501 (WITH CHECK fail)
--   7. member DELETE self watcher → success
--   8. admin INSERT any user watcher → success
--
-- Pattern: BEGIN/ROLLBACK + ON CONFLICT DO NOTHING (Sprint 2 fix lesson).
-- Idempotent terhadap state DB existing.
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
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test',   'Budi Santoso',    'admin',   '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000002', 'sari@kalatask.test',   'Sari Wijaya',     'manager', '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000003', 'andi@kalatask.test',   'Andi Pratama',    'member',  '00000000-0000-0000-0000-00000000aaaa'),
  ('00000000-0000-0000-0000-000000000005', 'rangga@kalatask.test', 'Rangga Saputra',  'manager', '00000000-0000-0000-0000-00000000bbbb'),
  ('00000000-0000-0000-0000-000000000008', 'maya@kalatask.test',   'Maya Anggraini',  'viewer',  '00000000-0000-0000-0000-00000000bbbb')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.projects (id, name, description, owner_id, status) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Project Alpha One', NULL, '00000000-0000-0000-0000-000000000002', 'active'),
  ('00000000-0000-0000-0000-0000000000b1', 'Project Beta One',  NULL, '00000000-0000-0000-0000-000000000005', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tasks (id, project_id, title, assignee_id, created_by, status, priority) VALUES
  ('00000000-0000-0000-0000-100000000a01', '00000000-0000-0000-0000-0000000000a1', 'Task Alpha', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo', 'medium'),
  ('00000000-0000-0000-0000-100000000b01', '00000000-0000-0000-0000-0000000000b1', 'Task Beta',  NULL,                                   '00000000-0000-0000-0000-000000000005', 'todo', 'medium')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.task_watchers (task_id, user_id) VALUES
  ('00000000-0000-0000-0000-100000000a01', '00000000-0000-0000-0000-000000000003'), -- Andi watch own task
  ('00000000-0000-0000-0000-100000000b01', '00000000-0000-0000-0000-000000000005')  -- Rangga watch own task
ON CONFLICT (task_id, user_id) DO NOTHING;

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
  (SELECT count(*)::int FROM public.task_watchers),
  0,
  'anon: SELECT task_watchers → 0 rows (no policy for anon)'
);


-- ============================================================
-- TEST 2: admin SELECT all → 2 rows (cross-team via task RLS)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.task_watchers),
  2,
  'admin: SELECT task_watchers → 2 rows (cross-team via task RLS auto-scope)'
);


-- ============================================================
-- TEST 3: member Andi SELECT own task watchers → 1 row (Task Alpha)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.task_watchers
   WHERE task_id = '00000000-0000-0000-0000-100000000a01'),
  1,
  'member Andi: SELECT own task watchers → 1 row (assignee task visible)'
);


-- ============================================================
-- TEST 4: member Andi SELECT cross-team task watchers → 0 rows
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.task_watchers
   WHERE task_id = '00000000-0000-0000-0000-100000000b01'),
  0,
  'member Andi: SELECT Beta task watchers → 0 rows (task RLS blocks cross-team)'
);


-- ============================================================
-- TEST 5: member Andi INSERT self watcher new task → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

-- Create a new task in Alpha untuk Andi watch (admin via earlier set role)
SET LOCAL ROLE postgres;
INSERT INTO public.tasks (id, project_id, title, assignee_id, created_by, status, priority) VALUES
  ('00000000-0000-0000-0000-100000000a02', '00000000-0000-0000-0000-0000000000a1', 'Task Alpha 2', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo', 'medium')
ON CONFLICT (id) DO NOTHING;

RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

INSERT INTO public.task_watchers (task_id, user_id) VALUES
  ('00000000-0000-0000-0000-100000000a02', '00000000-0000-0000-0000-000000000003');

SELECT is(
  (SELECT count(*)::int FROM public.task_watchers
   WHERE task_id = '00000000-0000-0000-0000-100000000a02' AND user_id = '00000000-0000-0000-0000-000000000003'),
  1,
  'member Andi: INSERT self watcher → success'
);


-- ============================================================
-- TEST 6: member Andi INSERT OTHER user watcher → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.task_watchers (task_id, user_id) VALUES ('00000000-0000-0000-0000-100000000a02', '00000000-0000-0000-0000-000000000004') $$,
  '42501',
  NULL,
  'member Andi: INSERT watcher untuk user lain → throws 42501 (WITH CHECK self-only)'
);


-- ============================================================
-- TEST 7: member Andi DELETE self watcher → success (1 rowcount)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.task_watchers
  WHERE task_id = '00000000-0000-0000-0000-100000000a02' AND user_id = '00000000-0000-0000-0000-000000000003'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 1,
  'member Andi: DELETE self watcher → 1 rowcount') FROM counted;


-- ============================================================
-- TEST 8: admin INSERT any user watcher → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

INSERT INTO public.task_watchers (task_id, user_id) VALUES
  ('00000000-0000-0000-0000-100000000a02', '00000000-0000-0000-0000-000000000004');

SELECT is(
  (SELECT count(*)::int FROM public.task_watchers
   WHERE task_id = '00000000-0000-0000-0000-100000000a02' AND user_id = '00000000-0000-0000-0000-000000000004'),
  1,
  'admin: INSERT watcher for other user → success'
);


-- ============================================================
-- FINISH + ROLLBACK
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
