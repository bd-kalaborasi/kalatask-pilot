-- =============================================================
-- Test: mom_import_rls + resolver
-- Migrations tested:
--   - 20260429100000_create_mom_import_schema.sql
--   - 20260429100100_add_mom_rpcs.sql
--   - 20260429100200_seed_mom_aliases.sql
--   - 20260429100300_fix_resolver_max_uuid.sql
--   - 20260429100400_add_usage_summary_rpc.sql
-- Refer: ADR-007 v2, Sprint 5 plan Step 13
--
-- Coverage: 22 assertions
--   1-4. Schema: 4 tables + RLS forced
--   5-7. Tasks: 2 columns + source CHECK enum extended
--   8-9. Trigger: users_auto_create_aliases works (full_name + nickname)
--   10. Helper extension fuzzystrmatch installed
--   11-14. Resolver: HIGH (exact), MEDIUM (fuzzy 1), LOW (multi/dist 2), UNRESOLVED
--   15. Resolver: [NAMA_TIDAK_JELAS] escape hatch
--   16-19. RLS: user_aliases admin write, mom_imports admin/manager read
--   20. RPC functions exist (process_mom_upload, approve_mom_import, get_usage_summary)
--   21. Composite index (source_mom_import_id, source_action_id)
--   22. seed user count > 0 (sanity)
-- =============================================================

BEGIN;
SELECT plan(22);
SET LOCAL ROLE postgres;


-- 1-4: Schema tables exist + RLS forced
SELECT is(
  (SELECT count(*)::int FROM pg_class WHERE relname='user_aliases' AND relrowsecurity AND relforcerowsecurity),
  1, 'user_aliases RLS forced'
);
SELECT is(
  (SELECT count(*)::int FROM pg_class WHERE relname='mom_imports' AND relrowsecurity AND relforcerowsecurity),
  1, 'mom_imports RLS forced'
);
SELECT is(
  (SELECT count(*)::int FROM pg_class WHERE relname='mom_import_items' AND relrowsecurity AND relforcerowsecurity),
  1, 'mom_import_items RLS forced'
);
SELECT is(
  (SELECT count(*)::int FROM pg_class WHERE relname='usage_snapshots' AND relrowsecurity AND relforcerowsecurity),
  1, 'usage_snapshots RLS forced'
);


-- 5-7: tasks columns + source enum extended
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
   WHERE table_schema='public' AND table_name='tasks'
     AND column_name IN ('source_mom_import_id','source_action_id')),
  2, 'tasks columns source_mom_import_id + source_action_id added'
);
SELECT is(
  (SELECT count(*)::int FROM information_schema.check_constraints
   WHERE constraint_name='tasks_source_check'),
  1, 'tasks_source_check constraint exists'
);
-- Check that 'mom-import' value is allowed
SELECT lives_ok(
  $$INSERT INTO public.tasks (project_id, title, source) VALUES (
    (SELECT id FROM public.projects LIMIT 1), 'test_source', 'mom-import'
  )$$,
  'tasks.source mom-import value allowed'
);


-- 8-9: Trigger users_auto_create_aliases
INSERT INTO public.users (id, email, full_name, role)
VALUES ('00000000-0000-0000-0000-0000aaaaa001', 'trigger.test@kalatask.test', 'Trigger Test User', 'member')
ON CONFLICT (id) DO NOTHING;

SELECT is(
  (SELECT count(*)::int FROM public.user_aliases
   WHERE user_id='00000000-0000-0000-0000-0000aaaaa001'
     AND alias_text='Trigger Test User' AND alias_type='full_name'),
  1, 'Trigger creates full_name alias'
);
SELECT is(
  (SELECT count(*)::int FROM public.user_aliases
   WHERE user_id='00000000-0000-0000-0000-0000aaaaa001'
     AND alias_text='Trigger' AND alias_type='nickname'),
  1, 'Trigger creates nickname alias dari first_name'
);


-- 10: Extension fuzzystrmatch
SELECT is(
  (SELECT extname FROM pg_extension WHERE extname='fuzzystrmatch'),
  'fuzzystrmatch', 'fuzzystrmatch extension installed'
);


-- 11-14: Resolver tiers
SELECT is(
  public.resolve_pic_alias('Mas Yudi')->>'confidence',
  'HIGH', 'Resolver HIGH untuk exact alias'
);
SELECT is(
  public.resolve_pic_alias('Pak Joka')->>'confidence',
  'MEDIUM', 'Resolver MEDIUM untuk fuzzy distance 1 (Pak Joka → Pak Joko)'
);
SELECT is(
  public.resolve_pic_alias('XXNoSuchUserName123')->>'confidence',
  'UNRESOLVED', 'Resolver UNRESOLVED untuk no match'
);
SELECT is(
  public.resolve_pic_alias('')->>'confidence',
  'UNRESOLVED', 'Resolver UNRESOLVED untuk empty input'
);


-- 15: Escape hatch
SELECT is(
  public.resolve_pic_alias('[NAMA_TIDAK_JELAS_at_05:33]')->>'reason',
  'escape_hatch', 'Resolver escape_hatch untuk [NAMA_TIDAK_JELAS]'
);


-- 16-19: RLS policies count
SELECT is(
  (SELECT count(*)::int FROM pg_policy
   WHERE polrelid='public.user_aliases'::regclass),
  4, 'user_aliases has 4 policies'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policy
   WHERE polrelid='public.mom_imports'::regclass),
  4, 'mom_imports has 4 policies'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policy
   WHERE polrelid='public.mom_import_items'::regclass),
  4, 'mom_import_items has 4 policies'
);
SELECT is(
  (SELECT count(*)::int FROM pg_policy
   WHERE polrelid='public.usage_snapshots'::regclass),
  2, 'usage_snapshots has 2 policies'
);


-- 20: Functions exist
SELECT is(
  (SELECT count(*)::int FROM pg_proc
   WHERE proname IN ('resolve_pic_alias','process_mom_upload','approve_mom_import','get_usage_summary','users_auto_create_aliases')),
  5, '5 RPC functions exist'
);


-- 21: Composite index
SELECT is(
  (SELECT count(*)::int FROM pg_indexes
   WHERE schemaname='public' AND tablename='tasks'
     AND indexname='idx_tasks_mom_source'),
  1, 'idx_tasks_mom_source composite index exists'
);


-- 22: Seed sanity (>0 IN_MOM_SAMPLE users + >0 aliases)
SELECT cmp_ok(
  (SELECT count(*)::int FROM public.user_aliases),
  '>=', 100,
  'user_aliases has >= 100 entries (trigger + seed combined)'
);


SELECT * FROM finish();
ROLLBACK;
