-- =============================================================
-- Test: tasks_rls
-- Migration tested:
--   - 20260427150000_create_tasks_table.sql (tasks + RLS + GRANT + triggers)
--   - 20260427150100_update_member_select_projects.sql (Step 7 defer resolve)
-- Refer: ADR-002 line 69-87 + Sprint 1 Step 8 brief 2026-04-28
--
-- Coverage: 33 assertions:
--   SELECT (1-8): anon / admin / viewer / 2 manager / 3 member assignee
--   INSERT (9-14): anon/viewer/member denied; manager+admin scoped
--   UPDATE (15-21): member field lock + manager scope + admin all
--   DELETE (22-26): member/viewer denied; manager scope + admin all
--   completed_at trigger (27-28): auto-set + revert
--   Member projects transitive (29-30): Step 7 defer resolve
--   FK CASCADE/SET NULL (31-33): destructive integrity tests
--
-- Fixture: 2 teams + 8 users + 4 projects + 12 tasks (mirror seed/tasks.csv).
-- Loading: inline INSERT.
--
-- Test execution order designed untuk avoid mutation cross-contamination:
--   1-21 read+light mutation, 22-26 specific deletes, 27-28 status flip,
--   29-30 transitive verify (state intact), 31-33 destructive last.
--
-- Run: supabase test db (CLI), Dashboard wrap manual BEGIN/ROLLBACK,
--      atau MCP execute_sql via TEMP table aggregation pattern.
-- =============================================================

BEGIN;
SELECT plan(33);


-- ============================================================
-- TEST FIXTURE — teams + users + projects + tasks
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

-- 12 tasks per fixture seed
INSERT INTO public.tasks (id, project_id, parent_id, title, description, assignee_id, created_by, status, priority, deadline, estimated_hours, start_date, source, source_file_id, needs_review, completed_at) VALUES
  ('00000000-0000-0000-0000-100000000001', '00000000-0000-0000-0000-0000000000a1', NULL,                                   'Draft onboarding deck',         'Slide deck untuk new hire onboarding', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo',        'high',   '2026-05-15', 8,    '2026-05-01', 'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000002', '00000000-0000-0000-0000-0000000000a1', NULL,                                   'Review mentor handbook',        'Review materi mentor handbook',        '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'in_progress', 'medium', '2026-05-20', 4,    NULL,         'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000003', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-100000000001', 'Slide template setup',          'Subtask: setup template Powerpoint',   '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo',        'low',    '2026-05-10', 2,    NULL,         'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000004', '00000000-0000-0000-0000-0000000000a2', NULL,                                   'Define Q2 OKR',                 'Sprint planning ritual untuk Q2',      NULL,                                   '00000000-0000-0000-0000-000000000002', 'todo',        'urgent', '2026-05-05', 16,   '2026-05-02', 'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000005', '00000000-0000-0000-0000-0000000000a2', NULL,                                   'Plan Q2 retrospective',         'Schedule retro session',               '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'review',      'high',   '2026-05-25', 3,    NULL,         'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000006', '00000000-0000-0000-0000-0000000000a2', NULL,                                   'Setup velocity tracking',       'Implement velocity dashboard',         NULL,                                   '00000000-0000-0000-0000-000000000002', 'todo',        'medium', NULL,         NULL, NULL,         'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000007', '00000000-0000-0000-0000-0000000000b1', NULL,                                   'Distribute survey link',        'Send to 50 customers',                 '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'todo',        'high',   '2026-05-12', 2,    NULL,         'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-100000000008', '00000000-0000-0000-0000-0000000000b1', NULL,                                   'Compile feedback report',       'Aggregate Q1 customer feedback',       '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'done',        'medium', '2026-04-20', 12,   '2026-04-10', 'manual', NULL, false, '2026-04-19 14:30:00+07'),
  ('00000000-0000-0000-0000-100000000009', '00000000-0000-0000-0000-0000000000b1', NULL,                                   'Address blocker dari vendor',   'Wait for vendor reply on integration', '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'blocked',     'urgent', '2026-05-01', NULL, NULL,         'manual', NULL, false, NULL),
  ('00000000-0000-0000-0000-10000000000a', '00000000-0000-0000-0000-0000000000b2', NULL,                                   'Q1 retro doc finalization',     'Finalize retrospective document',      '00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000005', 'done',        'high',   '2026-04-15', 6,    '2026-04-05', 'manual', NULL, false, '2026-04-14 16:00:00+07'),
  ('00000000-0000-0000-0000-10000000000b', '00000000-0000-0000-0000-0000000000b2', NULL,                                   'Action items follow-up',        'Follow up post-retro action items',    '00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000005', 'done',        'medium', '2026-04-18', 4,    NULL,         'manual', NULL, false, '2026-04-17 11:00:00+07'),
  ('00000000-0000-0000-0000-10000000000c', '00000000-0000-0000-0000-0000000000b2', NULL,                                   'Archive Q1 docs',               'Archive doc-doc Q1 ke shared drive',   NULL,                                   '00000000-0000-0000-0000-000000000005', 'done',        'low',    '2026-04-25', 2,    NULL,         'manual', NULL, false, '2026-04-24 09:00:00+07');


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
-- TEST 1: anon SELECT tasks → 0 rows
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  0,
  'anon: SELECT tasks returns 0 rows (no policy for anon role)'
);


-- ============================================================
-- TEST 2: admin SELECT → 12 rows (cross-team all)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  12,
  'admin: SELECT tasks returns all 12 (cross-team)'
);


-- ============================================================
-- TEST 3: viewer SELECT → 12 rows (cross-team)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  12,
  'viewer: SELECT tasks returns all 12 (cross-team management overview)'
);


-- ============================================================
-- TEST 4: manager Sari SELECT → 6 rows (tasks in projects A1+A2)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  6,
  'manager team A (Sari): SELECT tasks returns 6 (tasks in projects A1+A2 via project visibility)'
);


-- ============================================================
-- TEST 5: manager Rangga SELECT → 6 rows (tasks in projects B1+B2)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000005');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  6,
  'manager team B (Rangga): SELECT tasks returns 6 (tasks in projects B1+B2 via project visibility)'
);


-- ============================================================
-- TEST 6: member Andi SELECT → 2 rows (assigned t01, t03)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  2,
  'member team A (Andi): SELECT tasks returns 2 own assigned (t01, t03)'
);


-- ============================================================
-- TEST 7: member Dewi SELECT → 2 rows (assigned t02, t05)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  2,
  'member team A (Dewi): SELECT tasks returns 2 own assigned (t02, t05) — different from Andi proves filter'
);


-- ============================================================
-- TEST 8: member Indah SELECT → 3 rows (assigned t07, t09, t11)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000006');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.tasks),
  3,
  'member team B (Indah): SELECT tasks returns 3 own assigned (t07, t09, t11)'
);


-- ============================================================
-- TEST 9: anon INSERT → throws 42501 (no GRANT INSERT for anon)
-- ============================================================
RESET ROLE;
SET LOCAL ROLE anon;

SELECT throws_ok(
  $$ INSERT INTO public.tasks (project_id, title, created_by) VALUES ('00000000-0000-0000-0000-0000000000a1', 'Anon Hack', '00000000-0000-0000-0000-000000000001') $$,
  '42501',
  NULL,
  'anon: INSERT task throws 42501 (no GRANT INSERT for anon role)'
);


-- ============================================================
-- TEST 10: viewer INSERT → throws 42501 (no policy)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.tasks (project_id, title, created_by) VALUES ('00000000-0000-0000-0000-0000000000a1', 'Viewer Sneak', '00000000-0000-0000-0000-000000000008') $$,
  '42501',
  NULL,
  'viewer: INSERT task throws 42501 (no Viewer INSERT policy)'
);


-- ============================================================
-- TEST 11: member INSERT → throws 42501 (defer Sprint 1, no policy)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.tasks (project_id, title, created_by) VALUES ('00000000-0000-0000-0000-0000000000a1', 'Member Sneak', '00000000-0000-0000-0000-000000000003') $$,
  '42501',
  NULL,
  'member: INSERT task throws 42501 (defer Sprint 1, no Member INSERT policy)'
);


-- ============================================================
-- TEST 12: manager Sari INSERT to own project A1 → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

INSERT INTO public.tasks (id, project_id, title, description, created_by, status, priority) VALUES
  ('00000000-0000-0000-0000-100000000099', '00000000-0000-0000-0000-0000000000a1', 'Sari New Task', 'Manager INSERT test', '00000000-0000-0000-0000-000000000002', 'todo', 'medium');

SELECT is(
  (SELECT title FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000099'),
  'Sari New Task',
  'manager team A (Sari): INSERT task to own project A1 succeeds'
);


-- ============================================================
-- TEST 13: manager Sari INSERT to other manager's project B1 → throws 42501
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$ INSERT INTO public.tasks (project_id, title, created_by) VALUES ('00000000-0000-0000-0000-0000000000b1', 'Sari Cross-Team Sneak', '00000000-0000-0000-0000-000000000002') $$,
  '42501',
  NULL,
  'manager team A (Sari): INSERT task to Rangga project throws 42501 (project not visible)'
);


-- ============================================================
-- TEST 14: admin INSERT → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

INSERT INTO public.tasks (id, project_id, title, description, created_by, status, priority) VALUES
  ('00000000-0000-0000-0000-100000000098', '00000000-0000-0000-0000-0000000000a1', 'Admin Test Task', 'Admin INSERT test', '00000000-0000-0000-0000-000000000001', 'todo', 'low');

SELECT is(
  (SELECT title FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000098'),
  'Admin Test Task',
  'admin: INSERT task succeeds'
);


-- ============================================================
-- TEST 15: member Andi UPDATE own task t01 status → success (allowed field)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET status = 'in_progress' WHERE id = '00000000-0000-0000-0000-100000000001';

SELECT is(
  (SELECT status FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000001'),
  'in_progress',
  'member (Andi): UPDATE own assigned task status succeeds (allowed field)'
);


-- ============================================================
-- TEST 16: member Andi UPDATE own task t01 description → success (allowed)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET description = 'Updated description by Andi' WHERE id = '00000000-0000-0000-0000-100000000001';

SELECT is(
  (SELECT description FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000001'),
  'Updated description by Andi',
  'member (Andi): UPDATE own assigned task description succeeds (allowed field)'
);


-- ============================================================
-- TEST 17: member Andi UPDATE t01 priority → field lock blocks
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET priority = 'urgent' WHERE id = '00000000-0000-0000-0000-100000000001';

SELECT is(
  (SELECT priority FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000001'),
  'high',
  'member (Andi): UPDATE priority blocked by field lock trigger (priority unchanged from fixture)'
);


-- ============================================================
-- TEST 18: member Andi UPDATE t02 (Dewi's task) → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.tasks SET status = 'done'
  WHERE id = '00000000-0000-0000-0000-100000000002'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM updated)
SELECT is(c, 0,
  'member (Andi): UPDATE Dewi assigned task returns 0 rowcount (RLS USING blocks - assignee mismatch)') FROM counted;


-- ============================================================
-- TEST 19: manager Sari UPDATE task in own project → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET description = 'Updated by manager Sari' WHERE id = '00000000-0000-0000-0000-100000000004';

SELECT is(
  (SELECT description FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000004'),
  'Updated by manager Sari',
  'manager (Sari): UPDATE task in own project succeeds (full field, manager bypass field lock)'
);


-- ============================================================
-- TEST 20: manager Sari UPDATE task in Rangga's project → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH updated AS (
  UPDATE public.tasks SET description = 'Sari Hacks Rangga'
  WHERE id = '00000000-0000-0000-0000-100000000007'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM updated)
SELECT is(c, 0,
  'manager (Sari): UPDATE task in Rangga project returns 0 rowcount (project not visible)') FROM counted;


-- ============================================================
-- TEST 21: admin UPDATE any task → success
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET priority = 'urgent' WHERE id = '00000000-0000-0000-0000-100000000005';

SELECT is(
  (SELECT priority FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000005'),
  'urgent',
  'admin: UPDATE any task succeeds (cross-ownership, full field)'
);


-- ============================================================
-- TEST 22: member Andi DELETE → 0 rowcount (no Member DELETE policy)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000001'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 0,
  'member (Andi): DELETE returns 0 rowcount (no Member DELETE policy)') FROM counted;


-- ============================================================
-- TEST 23: viewer Maya DELETE → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000008');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000001'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 0,
  'viewer (Maya): DELETE returns 0 rowcount (no Viewer DELETE policy)') FROM counted;


-- ============================================================
-- TEST 24: manager Sari DELETE task in own project A2 → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000006'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 1,
  'manager (Sari): DELETE task in own project A2 returns 1 rowcount') FROM counted;


-- ============================================================
-- TEST 25: manager Sari DELETE task in Rangga's project → 0 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000002');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.tasks WHERE id = '00000000-0000-0000-0000-10000000000b'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 0,
  'manager (Sari): DELETE task in Rangga project returns 0 rowcount (project not visible)') FROM counted;


-- ============================================================
-- TEST 26: admin DELETE any task → 1 rowcount
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

WITH deleted AS (
  DELETE FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000008'
  RETURNING 1
), counted AS (SELECT count(*)::int AS c FROM deleted)
SELECT is(c, 1,
  'admin: DELETE any task returns 1 rowcount (t08, B1)') FROM counted;


-- ============================================================
-- TEST 27: admin UPDATE t02 status to 'done' → completed_at auto-set
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET status = 'done' WHERE id = '00000000-0000-0000-0000-100000000002';

SELECT isnt(
  (SELECT completed_at FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000002'),
  NULL,
  'completed_at trigger: UPDATE status to done auto-sets completed_at non-NULL'
);


-- ============================================================
-- TEST 28: admin UPDATE t02 status from 'done' to 'in_progress' → completed_at NULL
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

UPDATE public.tasks SET status = 'in_progress' WHERE id = '00000000-0000-0000-0000-100000000002';

SELECT is(
  (SELECT completed_at FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000002'),
  NULL,
  'completed_at trigger: UPDATE status from done revert completed_at to NULL'
);


-- ============================================================
-- TEST 29: member Andi SELECT projects → 1 (A1, transitive resolve)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000003');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  1,
  'member (Andi): SELECT projects returns 1 (A1 only, has assigned tasks t01+t03) — Step 7 defer RESOLVED'
);


-- ============================================================
-- TEST 30: member Dewi SELECT projects → 2 (A1+A2)
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000004');
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*)::int FROM public.projects),
  2,
  'member (Dewi): SELECT projects returns 2 (A1+A2, has assigned tasks t02+t05) — different count from Andi proves filter'
);


-- ============================================================
-- TEST 31: FK CASCADE — admin DELETE project A2, tasks dalam A2 ikut deleted
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a2';

SELECT is(
  (SELECT count(*)::int FROM public.tasks WHERE project_id = '00000000-0000-0000-0000-0000000000a2'),
  0,
  'FK ON DELETE CASCADE: DELETE project A2 cascade deletes all tasks in A2'
);


-- ============================================================
-- TEST 32: FK SET NULL — admin DELETE user Andi, task assignee_id → NULL
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000003';

SELECT is(
  (SELECT count(*)::int FROM public.tasks
   WHERE id IN ('00000000-0000-0000-0000-100000000001','00000000-0000-0000-0000-100000000003')
     AND assignee_id IS NULL),
  2,
  'FK ON DELETE SET NULL: DELETE user Andi → tasks t01 + t03 assignee_id NULL'
);


-- ============================================================
-- TEST 33: FK CASCADE subtask — admin DELETE parent t01, subtask t03 ikut
-- ============================================================
RESET ROLE;
SELECT pg_temp.impersonate('00000000-0000-0000-0000-000000000001');
SET LOCAL ROLE authenticated;

DELETE FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000001';

SELECT is(
  (SELECT count(*)::int FROM public.tasks WHERE id = '00000000-0000-0000-0000-100000000003'),
  0,
  'FK ON DELETE CASCADE (parent_id): DELETE parent task t01 cascade deletes subtask t03'
);


-- ============================================================
-- FINISH + ROLLBACK
-- ============================================================
SELECT * FROM finish();
ROLLBACK;
