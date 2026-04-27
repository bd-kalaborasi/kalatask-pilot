-- =============================================================
-- Migration: 20260427120150_add_grants_users
--
-- Tujuan: Tambah explicit GRANT untuk public.users — RLS-protected
--   table butuh table-level privilege di-grant supaya RLS sempat fire.
--   Tanpa ini, query throws "42501: permission denied for table"
--   SEBELUM RLS evaluasi.
--
-- Root cause: Migration users (20260427120100) di-apply via Supabase
--   Dashboard SQL Editor yang connect sebagai `postgres` role. Default
--   ACL untuk public schema yang di-set oleh `postgres` cuma kasih
--   Dxtm (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) ke anon/authenticated/
--   service_role — alias zero CRUD access. Solusi: explicit GRANT.
--
-- Refer:
--   - Migration sebelumnya: 20260427120100_create_users_table.sql
--   - Skill issue tracker: docs/skill-issues.md (GRANT pattern gap)
--   - PostgreSQL docs: https://www.postgresql.org/docs/current/sql-grant.html
--
-- Dependencies:
--   - 20260427120100_create_users_table.sql (public.users harus exist)
--
-- Reversal (forward-only fix preferred):
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.users FROM authenticated;
--   REVOKE SELECT, INSERT, UPDATE, DELETE ON public.users FROM service_role;
--   REVOKE SELECT ON public.users FROM anon;
--
-- Author: Claude Code (skills: supabase-migration, rls-policy-writer)
-- =============================================================


-- ============================================================
-- 1. authenticated — full CRUD (RLS handles row-level filtering)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;


-- ============================================================
-- 2. service_role — full CRUD (Edge Function context, bypasses RLS)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO service_role;


-- ============================================================
-- 3. anon — SELECT only (RLS denies all rows since no policy TO anon)
-- ============================================================
-- Trade-off: GRANT SELECT to anon = test #1 (anon SELECT → 0 rows) passes
-- via RLS empty result. Alternative defense-in-depth: NO grant + update
-- test #1 expectation ke `throws_ok '42501'`. Pilot pilih lenient untuk
-- semantic clarity test; reconsider saat scale-up production (revoke
-- anon GRANT pada tabel dengan PII).
GRANT SELECT ON public.users TO anon;


-- =============================================================
-- TODO (skill update needed):
--   Skills `supabase-migration` + `rls-policy-writer` Pattern A-F
--   tidak include GRANT statements. Bug filed di docs/skill-issues.md.
-- =============================================================
