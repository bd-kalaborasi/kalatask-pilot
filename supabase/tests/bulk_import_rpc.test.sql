-- =============================================================
-- Test: bulk_import_rpc
-- Migrations tested:
--   - 20260428120100_add_bulk_import_tasks_rpc.sql
-- Refer: ADR-005, Sprint 4 Step 7
--
-- Coverage: 8 assertions verifying:
--   1. Function exists + SECURITY INVOKER (prosecdef=false)
--   2. Returns JSONB object dengan summary + rows
--   3. dry_run=true → summary.imported = 0
--   4. Empty array input → summary.total = 0
--   5. Invalid status enum → row marked error
--   6. Missing title → row marked error
--   7. Unknown assignee_email → row marked warning (Q3 b)
--   8. Auto-create project di non-dry-run
-- =============================================================

BEGIN;
SELECT plan(8);

SET LOCAL ROLE postgres;

-- Fixture admin user
INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'budi@kalatask.test', 'Budi', 'admin',  '00000000-0000-0000-0000-00000000aaaa')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TEST 1: Function exists + SECURITY INVOKER
-- ============================================================
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname='bulk_import_tasks'),
  false,
  'bulk_import_tasks SECURITY INVOKER (prosecdef=false)'
);


-- ============================================================
-- TEST 2: Returns JSONB object dengan summary + rows
--   Catatan: caller di test = postgres (superuser), is_admin() return false
--   karena auth.uid() NULL — RAISE EXCEPTION expected.
--   Skip caller authorization test (manual via Dashboard) — verify shape
--   via direct function call dengan auth.uid context simulation.
-- ============================================================
-- Set auth.uid() simulation
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

SELECT is(
  jsonb_typeof(public.bulk_import_tasks('[]'::jsonb, true)),
  'object',
  'returns jsonb object'
);


-- ============================================================
-- TEST 3: dry_run=true → summary.imported = 0
-- ============================================================
SELECT is(
  ((public.bulk_import_tasks(
    jsonb_build_array(
      jsonb_build_object(
        'title','Test1','project_name','Demo CSV','status','todo','priority','medium'
      )
    ),
    true
  ))->'summary'->>'imported')::int,
  0,
  'dry_run=true → imported=0'
);


-- ============================================================
-- TEST 4: Empty array → total=0
-- ============================================================
SELECT is(
  ((public.bulk_import_tasks('[]'::jsonb, true))->'summary'->>'total')::int,
  0,
  'empty array → total=0'
);


-- ============================================================
-- TEST 5: Invalid status enum → row error
-- ============================================================
SELECT is(
  ((public.bulk_import_tasks(
    jsonb_build_array(
      jsonb_build_object(
        'title','Bad','project_name','X','status','invalidstatus','priority','medium'
      )
    ),
    true
  ))->'summary'->>'error')::int,
  1,
  'invalid status enum → 1 error'
);


-- ============================================================
-- TEST 6: Missing title → row error
-- ============================================================
SELECT is(
  ((public.bulk_import_tasks(
    jsonb_build_array(
      jsonb_build_object(
        'project_name','X','status','todo','priority','medium'
      )
    ),
    true
  ))->'summary'->>'error')::int,
  1,
  'missing title → 1 error'
);


-- ============================================================
-- TEST 7: Unknown assignee_email → row warning (Q3 b)
-- ============================================================
SELECT is(
  ((public.bulk_import_tasks(
    jsonb_build_array(
      jsonb_build_object(
        'title','Hi','project_name','Demo CSV','status','todo','priority','medium',
        'assignee_email','ghost@nowhere.test'
      )
    ),
    true
  ))->'summary'->>'warning')::int,
  1,
  'unknown assignee_email → 1 warning (Q3 b skip)'
);


-- ============================================================
-- TEST 8: Auto-create project di commit (non-dry-run)
-- ============================================================
DO $$
DECLARE
  v_result jsonb;
BEGIN
  v_result := public.bulk_import_tasks(
    jsonb_build_array(
      jsonb_build_object(
        'title','Task baru','project_name','AutoCreate Demo Sprint4',
        'status','todo','priority','medium'
      )
    ),
    false
  );
END $$;

SELECT is(
  (SELECT count(*)::int FROM public.projects WHERE name='AutoCreate Demo Sprint4'),
  1,
  'auto-create project di commit non-dry-run'
);


SELECT * FROM finish();
ROLLBACK;
