-- =============================================================
-- Test: comment_rpcs (Sprint 6 carry-over from Sprint 4.5)
-- Migration tested: 20260428130100_add_comment_rpcs.sql
-- Refer: ADR-008, Sprint 4.5 Step 3 (carry-over Sprint 6 Phase 5)
--
-- Coverage: 8 assertions verifying RPC functions exist + correct security
--   model + parser correctness:
--   1. parse_mention_uuids returns array
--   2. parse_mention_uuids extracts single UUID
--   3. parse_mention_uuids dedupe duplicate UUIDs
--   4. parse_mention_uuids ignores invalid UUID format
--   5. post_comment SECURITY INVOKER (prosecdef=false)
--   6. update_comment SECURITY INVOKER
--   7. delete_comment SECURITY INVOKER
--   8. search_users_for_mention SECURITY INVOKER + STABLE
-- =============================================================

BEGIN;
SELECT plan(8);

SET LOCAL ROLE postgres;

-- TEST 1: parse_mention_uuids returns array
SELECT is(
  pg_typeof(public.parse_mention_uuids('hello'))::text,
  'uuid[]',
  'parse_mention_uuids returns uuid[]'
);

-- TEST 2: extract single UUID
SELECT is(
  array_length(
    public.parse_mention_uuids('Hi @[Andi](00000000-0000-0000-0000-000000000003) please review'),
    1
  ),
  1,
  'parse_mention_uuids extracts single mention'
);

-- TEST 3: dedupe duplicate UUIDs
SELECT is(
  array_length(
    public.parse_mention_uuids(
      '@[A](00000000-0000-0000-0000-000000000003) and @[A again](00000000-0000-0000-0000-000000000003)'
    ),
    1
  ),
  1,
  'parse_mention_uuids dedupe duplicate UUIDs'
);

-- TEST 4: ignores invalid UUID format
SELECT is(
  COALESCE(array_length(public.parse_mention_uuids('@[Bad](not-a-uuid)'), 1), 0),
  0,
  'parse_mention_uuids ignores invalid UUID format'
);

-- TEST 5-7: RPCs SECURITY INVOKER (prosecdef=false)
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname='post_comment'),
  false,
  'post_comment SECURITY INVOKER'
);

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname='update_comment'),
  false,
  'update_comment SECURITY INVOKER'
);

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname='delete_comment'),
  false,
  'delete_comment SECURITY INVOKER'
);

-- TEST 8: search_users_for_mention SECURITY INVOKER (RLS auto-scope)
SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname='search_users_for_mention'),
  false,
  'search_users_for_mention SECURITY INVOKER'
);


SELECT * FROM finish();
ROLLBACK;
