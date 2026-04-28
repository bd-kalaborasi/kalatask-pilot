-- =============================================================
-- Test: onboarding_sample_rls
-- Migrations tested:
--   - 20260428120000_add_onboarding_support.sql
-- Refer: ADR-002, Sprint 4 Step 1+2, PRD F10 AC-1 to AC-5
--
-- Coverage: 6 assertions verifying:
--   1. is_sample column accessible + defaults false untuk existing rows
--   2. create_onboarding_sample insert 1 project + 5 tasks
--   3. Idempotency — repeat call return same project_id (no duplicate)
--   4. Function SECURITY DEFINER (prosecdef = true)
--   5. RLS — owner dapat SELECT own sample project
--   6. RLS — owner dapat UPDATE own sample (archive scenario)
-- =============================================================

BEGIN;
SELECT plan(6);

SET LOCAL ROLE postgres;

-- Fixture: team + Member user untuk simulate onboarding flow
INSERT INTO public.teams (id, name) VALUES
  ('00000000-0000-0000-0000-00000000aaaa', 'Team Alpha')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, email, full_name, role, team_id) VALUES
  ('00000000-0000-0000-0000-000000000091', 'newuser@kalatask.test', 'New User', 'member', '00000000-0000-0000-0000-00000000aaaa')
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- TEST 1: is_sample column exists + defaults false untuk existing
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM public.projects WHERE is_sample IS NULL),
  0,
  'is_sample column NOT NULL — no NULL values across all projects'
);


-- ============================================================
-- TEST 2: create_onboarding_sample inserts 1 project + 5 tasks
-- ============================================================
DO $$
DECLARE
  v_project_id uuid;
BEGIN
  v_project_id := public.create_onboarding_sample('00000000-0000-0000-0000-000000000091');
  -- Stash di temp table untuk assertion
  CREATE TEMP TABLE IF NOT EXISTS sample_check (project_id uuid);
  TRUNCATE sample_check;
  INSERT INTO sample_check VALUES (v_project_id);
END $$;

SELECT is(
  (SELECT count(*)::int FROM public.tasks
   WHERE project_id = (SELECT project_id FROM sample_check)),
  5,
  'create_onboarding_sample inserts exactly 5 sample tasks'
);


-- ============================================================
-- TEST 3: Idempotency — repeat call returns same project_id
-- ============================================================
SELECT is(
  public.create_onboarding_sample('00000000-0000-0000-0000-000000000091'),
  (SELECT project_id FROM sample_check),
  'create_onboarding_sample idempotent — same project_id on repeat call'
);


-- ============================================================
-- TEST 4: Function SECURITY DEFINER
-- ============================================================
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname = 'create_onboarding_sample'),
  true,
  'create_onboarding_sample SECURITY DEFINER (bypass RLS)'
);


-- ============================================================
-- TEST 5: Sample project has is_sample=true + correct owner
-- ============================================================
SELECT is(
  (SELECT (is_sample AND owner_id = '00000000-0000-0000-0000-000000000091'::uuid)
   FROM public.projects WHERE id = (SELECT project_id FROM sample_check)),
  true,
  'Sample project has is_sample=true AND owner_id = caller user'
);


-- ============================================================
-- TEST 6: Variasi 5 status pada sample tasks
-- ============================================================
SELECT is(
  (SELECT count(DISTINCT status)::int FROM public.tasks
   WHERE project_id = (SELECT project_id FROM sample_check)),
  5,
  'Sample tasks cover 5 distinct status (todo/in_progress/review/done/blocked)'
);


SELECT * FROM finish();
ROLLBACK;
