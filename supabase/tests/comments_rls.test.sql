-- =============================================================
-- Test: comments_rls
-- Migration tested:
--   - 20260428130000_create_comments_table.sql
-- Refer: ADR-008, ADR-002, Sprint 4.5 Step 1+2
--
-- Coverage: 8 assertions
--   1. Table exists + RLS forced
--   2. 6 policies created (split per role per operation)
--   3. user_can_access_task helper SECURITY DEFINER
--   4. Realtime publication includes comments
--   5. Body CHECK constraint rejects empty
--   6. Body CHECK constraint rejects > 2000 char
--   7. is_system default false
--   8. Indexes present (task_id+created_at, author_id partial)
-- =============================================================

BEGIN;
SELECT plan(8);

SET LOCAL ROLE postgres;


-- ============================================================
-- TEST 1: Table exists + RLS forced
-- ============================================================
SELECT is(
  (SELECT (relrowsecurity AND relforcerowsecurity)
   FROM pg_class WHERE relname='comments'),
  true,
  'comments table RLS enabled + forced'
);


-- ============================================================
-- TEST 2: 6 policies created
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM pg_policy
   WHERE polrelid='public.comments'::regclass),
  6,
  '6 RLS policies created (split per role per op)'
);


-- ============================================================
-- TEST 3: user_can_access_task SECURITY DEFINER
-- ============================================================
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname='user_can_access_task'),
  true,
  'user_can_access_task helper SECURITY DEFINER'
);


-- ============================================================
-- TEST 4: Realtime publication includes comments
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM pg_publication_tables
   WHERE tablename='comments' AND pubname='supabase_realtime'),
  1,
  'comments included in supabase_realtime publication'
);


-- ============================================================
-- TEST 5: Body CHECK rejects empty string
-- ============================================================
SELECT throws_ok(
  $$INSERT INTO public.comments (task_id, author_id, body)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      '00000000-0000-0000-0000-000000000001',
      ''
    )$$,
  '23514',
  NULL,
  'CHECK rejects empty body'
);


-- ============================================================
-- TEST 6: Body CHECK rejects > 2000 char
-- ============================================================
SELECT throws_ok(
  format(
    $$INSERT INTO public.comments (task_id, author_id, body)
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        '00000000-0000-0000-0000-000000000001',
        %L
      )$$,
    repeat('x', 2001)
  ),
  '23514',
  NULL,
  'CHECK rejects body > 2000 char'
);


-- ============================================================
-- TEST 7: is_system default false
-- ============================================================
SELECT is(
  (SELECT column_default FROM information_schema.columns
   WHERE table_schema='public' AND table_name='comments'
     AND column_name='is_system'),
  'false',
  'is_system default false'
);


-- ============================================================
-- TEST 8: Indexes present
-- ============================================================
SELECT is(
  (SELECT count(*)::int FROM pg_indexes
   WHERE schemaname='public' AND tablename='comments'
     AND indexname IN ('idx_comments_task_created','idx_comments_author')),
  2,
  'idx_comments_task_created + idx_comments_author indexes exist'
);


SELECT * FROM finish();
ROLLBACK;
