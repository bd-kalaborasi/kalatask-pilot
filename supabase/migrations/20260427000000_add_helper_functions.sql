-- =============================================================
-- Migration: 20260427000000_add_helper_functions
--
-- Tujuan: Foundation utility functions yang dipakai semua migration
--   berikutnya (tabel, RLS policy, trigger). Migration paling awal
--   di sequence; tidak ada dependency.
--
--   Functions di file ini:
--     1. set_updated_at()         — trigger fn untuk audit kolom updated_at
--     2. current_user_role()      — return role dari auth.uid()
--     3. is_admin()               — boolean: role = 'admin'
--     4. is_manager()             — boolean: role = 'manager'
--     5. is_member()              — boolean: role = 'member'
--     6. is_viewer()              — boolean: role = 'viewer'
--     7. is_authenticated()       — boolean: auth.uid() IS NOT NULL
--     8. current_user_team_id()   — return team_id dari auth.uid()
--
-- Refer:
--   - PRD §7 (Database Schema)
--   - ADR-002 (RLS Strategy) — RLS pasangan helper functions
--   - Skill: .claude/skills/supabase-migration/SKILL.md (Pattern E)
--
-- Dependencies: NONE (foundation migration).
--
-- Reverse-dependency: SEMUA tabel migration berikutnya akan reference
--   set_updated_at() (trigger) dan role check functions (RLS USING).
--   Drop functions ini akan break trigger + RLS di banyak tempat.
--   Pakai CASCADE di reversal di bawah.
--
-- Reversal (forward-only fix preferred — lihat skill workflow):
--   DROP FUNCTION IF EXISTS public.current_user_team_id() CASCADE;
--   DROP FUNCTION IF EXISTS public.is_authenticated()      CASCADE;
--   DROP FUNCTION IF EXISTS public.is_viewer()             CASCADE;
--   DROP FUNCTION IF EXISTS public.is_member()             CASCADE;
--   DROP FUNCTION IF EXISTS public.is_manager()            CASCADE;
--   DROP FUNCTION IF EXISTS public.is_admin()              CASCADE;
--   DROP FUNCTION IF EXISTS public.current_user_role()     CASCADE;
--   DROP FUNCTION IF EXISTS public.set_updated_at()        CASCADE;
--
-- IMPORTANT: Functions yang reference public.users (yang BELUM ADA saat
--   migration ini apply) pakai LANGUAGE plpgsql, BUKAN sql. Postgres
--   eager-validate LANGUAGE sql function body saat CREATE — kalau table
--   yang di-reference belum ada, error 42P01 "relation does not exist".
--   plpgsql lazy-validate name resolution di runtime, jadi CREATE FUNCTION
--   sukses meskipun public.users belum exist. Function akan tetap ERROR
--   kalau dipanggil sebelum public.users dibuat di migration berikutnya
--   (20260427120100_create_users_table.sql).
--
--   Language per function:
--     - set_updated_at:  plpgsql (mandatory untuk trigger fn, akses NEW)
--     - current_user_role, is_admin/manager/member/viewer,
--       current_user_team_id: plpgsql (lazy validation untuk public.users)
--     - is_authenticated: sql (no public.users ref, aman LANGUAGE sql)
--
-- Author: Claude Code (skill: supabase-migration)
-- =============================================================


-- ============================================================
-- 1. set_updated_at — trigger function untuk kolom audit
-- ============================================================
-- LANGUAGE plpgsql wajib untuk trigger function (akses NEW/OLD).
-- Tidak butuh SECURITY DEFINER: trigger fire di context user yang
-- meng-update, dan hanya update kolom dari row yang sama (NEW).
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at IS
  'Trigger fn — set updated_at = now() saat row di-update. Dipakai semua tabel dengan kolom audit updated_at.';


-- ============================================================
-- 2. current_user_role — get app role of current authenticated user
-- ============================================================
-- SECURITY DEFINER + STABLE rationale:
--   1. SECURITY DEFINER bypass RLS pada public.users — penting untuk
--      avoid recursive policy lookup (RLS policy public.users akan
--      panggil current_user_role(), yang kalau enforce RLS lagi =
--      infinite recursion / deadlock).
--   2. STABLE bikin Postgres bisa cache hasilnya dalam 1 query.
-- search_path locked = security best practice; prevent search_path
-- attack di mana attacker bikin tabel public.users palsu di schema lain.
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid());
END;
$$;

COMMENT ON FUNCTION public.current_user_role IS
  'Get app role (admin/manager/member/viewer) untuk auth.uid() saat ini. Returns NULL kalau anon atau user tidak ada di public.users. SECURITY DEFINER untuk avoid recursive RLS lookup. ADR-002.';


-- ============================================================
-- 3a. is_admin — boolean shortcut
-- ============================================================
-- coalesce(...,false) supaya return false (bukan NULL) saat
-- current_user_role() return NULL. NULL di RLS USING clause = row
-- ditolak, tapi explicit false lebih predictable untuk testing.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN coalesce(public.current_user_role() = 'admin', false);
END;
$$;

COMMENT ON FUNCTION public.is_admin IS
  'True kalau current_user_role() = admin. False otherwise (termasuk anon dan user yang tidak terdaftar).';


-- ============================================================
-- 3b. is_manager
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN coalesce(public.current_user_role() = 'manager', false);
END;
$$;

COMMENT ON FUNCTION public.is_manager IS
  'True kalau current_user_role() = manager. False otherwise.';


-- ============================================================
-- 3c. is_member
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN coalesce(public.current_user_role() = 'member', false);
END;
$$;

COMMENT ON FUNCTION public.is_member IS
  'True kalau current_user_role() = member. False otherwise.';


-- ============================================================
-- 3d. is_viewer
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_viewer()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN coalesce(public.current_user_role() = 'viewer', false);
END;
$$;

COMMENT ON FUNCTION public.is_viewer IS
  'True kalau current_user_role() = viewer. Viewer = manajemen read-only (PRD F4). False otherwise.';


-- ============================================================
-- 4. is_authenticated — boolean check session JWT valid
-- ============================================================
-- SECURITY DEFINER untuk konsistensi dengan helper lain. Sebenarnya
-- tidak strictly perlu (auth.uid() callable dari semua role) — tapi
-- supaya semua RLS helper konsisten dipanggil dari context yang sama.
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL;
$$;

COMMENT ON FUNCTION public.is_authenticated IS
  'True kalau ada session JWT valid (auth.uid() not null). False untuk anon. Pakai sebagai gate awal di RLS sebelum role check.';


-- ============================================================
-- 5. current_user_team_id — get team_id of current authenticated user
-- ============================================================
-- Dipakai RLS pada tasks/projects untuk filter scope ke team-nya user.
-- Returns NULL kalau anon, user tidak terdaftar, atau team_id null
-- (admin/viewer biasanya tidak punya team).
CREATE OR REPLACE FUNCTION public.current_user_team_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth
AS $$
BEGIN
  RETURN (SELECT team_id FROM public.users WHERE id = auth.uid());
END;
$$;

COMMENT ON FUNCTION public.current_user_team_id IS
  'Get team_id dari user yang sedang login. Returns NULL kalau anon, user tidak ada di public.users, atau team_id null. SECURITY DEFINER untuk bypass RLS pada public.users. Dipakai RLS di tasks/projects untuk filter team scope.';


-- =============================================================
-- TODO (next migrations):
--   20260427120100_create_users_table.sql      — public.users (resolves
--                                                  deferred reference)
--   20260427120200_add_rls_users.sql           — RLS pakai is_admin() dst
--   20260427130000_create_teams_table.sql      — public.teams
--   20260427130100_add_rls_teams.sql
--   ...
-- =============================================================
