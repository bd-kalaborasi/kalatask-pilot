-- =============================================================
-- Migration: 20260428120000_add_onboarding_support
--
-- Tujuan: Sprint 4 F10 onboarding support — sample data infrastructure.
--   1. ADD COLUMN projects.is_sample (additive, default false) — flag
--      project sample dari first-login auto-populate.
--   2. CREATE FUNCTION create_onboarding_sample(p_user_id) — SECURITY
--      DEFINER, insert 1 sample project + 5 sample tasks owned by user.
--   3. ADD RLS untuk lifecycle sample project ownership (Member dapat
--      UPDATE/DELETE own sample project — untuk AC-3 soft-archive).
--
-- DESIGN DECISIONS:
--   - Column NOT NULL DEFAULT false → existing 3 demo seed projects
--     (Sprint 2 sprint_2_demo_seed.sql) otomatis is_sample=false.
--     PostgreSQL 11+ ADD COLUMN dengan DEFAULT = O(1) metadata-only.
--   - SECURITY DEFINER untuk bypass RLS (Member tidak punya INSERT
--     project policy — by design Sprint 1).
--   - Idempotent: kalau user sudah punya sample project, return existing
--     project_id tanpa duplicate insert.
--   - Sample tasks variasi 5 status (todo, in_progress, review, done,
--     blocked) — covers PRD F10 line 252 spec.
--   - Q5 owner answer (b) client-side trigger via AuthContext — RPC
--     dipanggil dari React, bukan DB trigger pada auth.users.
--
-- RLS additions:
--   - projects_update_own_sample: auth.uid()=owner_id AND is_sample=true
--   - projects_delete_own_sample: same
--   - projects_select_own_sample: ensure visible regardless transitive
--   - tasks_update_own_sample_via_project: allow owner update sample
--     tasks (any field, bypass member field lock untuk demo flexibility)
--
-- Refer:
--   - PRD §3.1 F10 line 127-131
--   - PRD §3.2 Feature 6 line 243-262 (acceptance criteria AC-1 to AC-5)
--   - ADR-002 (RLS strategy)
--   - Sprint 4 plan Step 1
--
-- Dependencies:
--   - 20260427140000_create_projects_table.sql
--   - 20260427150000_create_tasks_table.sql
--   - 20260427150200_fix_rls_cycle_member_projects.sql (member_has_task_in_project helper)
--
-- Reversal:
--   DROP POLICY IF EXISTS "tasks_update_own_sample_via_project" ON public.tasks;
--   DROP POLICY IF EXISTS "projects_select_own_sample" ON public.projects;
--   DROP POLICY IF EXISTS "projects_delete_own_sample" ON public.projects;
--   DROP POLICY IF EXISTS "projects_update_own_sample" ON public.projects;
--   DROP FUNCTION IF EXISTS public.create_onboarding_sample(uuid);
--   ALTER TABLE public.projects DROP COLUMN IF EXISTS is_sample;
--
-- Author: Claude Code (Sprint 4 Step 1)
-- =============================================================


-- ============================================================
-- 1. ADD COLUMN projects.is_sample (additive, no side effect)
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.is_sample IS
  'F10 onboarding flag — true untuk project sample auto-create saat first login. False untuk semua project user-created (default).';

-- Partial index: query sample projects per user (untuk idempotency check)
CREATE INDEX IF NOT EXISTS idx_projects_is_sample_owner
  ON public.projects (owner_id, is_sample)
  WHERE is_sample = true;


-- ============================================================
-- 2. FUNCTION create_onboarding_sample(p_user_id)
-- ============================================================
-- SECURITY DEFINER → bypass RLS untuk INSERT project + tasks.
-- Idempotent: skip kalau user sudah punya sample project (re-call safe).
-- LANGUAGE plpgsql untuk control flow (IF EXISTS, RETURN early).
CREATE OR REPLACE FUNCTION public.create_onboarding_sample(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_project_id uuid;
  v_existing_id uuid;
BEGIN
  -- Guard: user_id wajib non-null
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id cannot be NULL';
  END IF;

  -- Idempotency check — kalau sudah ada sample project untuk user ini, return existing
  SELECT id INTO v_existing_id
  FROM public.projects
  WHERE owner_id = p_user_id AND is_sample = true
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- INSERT sample project
  INSERT INTO public.projects (name, description, owner_id, status, is_sample)
  VALUES (
    'Project Contoh — Hapus saja',
    'Project sample untuk perkenalan dengan KalaTask. Hapus saja kalau sudah selesai eksplorasi.',
    p_user_id,
    'active',
    true
  )
  RETURNING id INTO v_project_id;

  -- INSERT 5 sample tasks variasi status (PRD F10 line 252)
  INSERT INTO public.tasks (project_id, title, description, assignee_id, created_by, status, priority, deadline, source)
  VALUES
    (
      v_project_id,
      'Bikin task pertama kamu',
      'Coba klik tombol "+" atau "Buat task" untuk bikin task baru. Task ini contoh aja, bisa kamu edit atau hapus.',
      p_user_id, p_user_id,
      'todo', 'medium', CURRENT_DATE + INTERVAL '7 days', 'manual'
    ),
    (
      v_project_id,
      'Coba switch view ke Kanban',
      'Klik tab "Kanban" di atas. Task bakal muncul sebagai kartu yang bisa di-drag antar kolom status.',
      p_user_id, p_user_id,
      'in_progress', 'medium', CURRENT_DATE + INTERVAL '3 days', 'manual'
    ),
    (
      v_project_id,
      'Lihat detail task ini',
      'Klik judul task untuk buka detail. Di sini kamu bisa update status, deskripsi, dan deadline.',
      p_user_id, p_user_id,
      'review', 'low', CURRENT_DATE + INTERVAL '5 days', 'manual'
    ),
    (
      v_project_id,
      'Cek workload kamu',
      'Buka menu "Workload" untuk lihat task yang lagi kamu pegang. Sprint 3 lho, sudah jadi.',
      p_user_id, p_user_id,
      'done', 'high', CURRENT_DATE - INTERVAL '1 day', 'manual'
    ),
    (
      v_project_id,
      'Task yang ke-blocked (contoh)',
      'Status "blocked" dipakai kalau task nunggu sesuatu. Kamu bisa coba ubah status di view manapun.',
      p_user_id, p_user_id,
      'blocked', 'urgent', CURRENT_DATE + INTERVAL '10 days', 'manual'
    );

  RETURN v_project_id;
END;
$$;

COMMENT ON FUNCTION public.create_onboarding_sample(uuid) IS
  'F10 sample data — insert 1 project + 5 task variasi status untuk user. Idempotent (skip kalau sudah ada). SECURITY DEFINER bypass RLS. Q5 owner answer (b) client-side trigger.';

-- Grant execute ke authenticated supaya RPC callable dari frontend
GRANT EXECUTE ON FUNCTION public.create_onboarding_sample(uuid) TO authenticated;


-- ============================================================
-- 3. RLS — Sample project ownership lifecycle
-- ============================================================
-- Existing policies tidak cover scenario:
-- - Member sebagai owner (existing policies hanya admin/manager INSERT)
-- - User UPDATE/DELETE own sample (existing tidak ada)
-- Add 3 policy projects + 1 policy tasks untuk lifecycle sample.

-- 3a. SELECT — own sample (explicit, supplement existing transitive)
CREATE POLICY "projects_select_own_sample" ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    is_sample = true
    AND owner_id = auth.uid()
  );

COMMENT ON POLICY "projects_select_own_sample" ON public.projects IS
  'F10: user lihat own sample project. Supplement existing transitive RLS untuk admin/manager/viewer (yang bisa juga lihat sample mereka via existing policies).';


-- 3b. UPDATE — own sample (untuk soft-archive AC-3)
CREATE POLICY "projects_update_own_sample" ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    is_sample = true
    AND owner_id = auth.uid()
  )
  WITH CHECK (
    is_sample = true
    AND owner_id = auth.uid()
  );

COMMENT ON POLICY "projects_update_own_sample" ON public.projects IS
  'F10 AC-3: user dapat UPDATE own sample project (typically untuk archive). WITH CHECK same — prevent rename to non-sample.';


-- 3c. DELETE — own sample (untuk hard-delete kalau user pilih)
CREATE POLICY "projects_delete_own_sample" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    is_sample = true
    AND owner_id = auth.uid()
  );

COMMENT ON POLICY "projects_delete_own_sample" ON public.projects IS
  'F10: user dapat DELETE own sample project (cascade delete sample tasks via FK).';


-- 3d. tasks_update_own_sample_via_project — Member dapat UPDATE sample task
-- tanpa kena field lock trigger (sample task untuk demo, perlu flexibility).
-- Note: trigger tasks_member_field_lock akan tetap fire untuk Member —
-- tapi ini policy buka path UPDATE; field lock di trigger separate concern.
-- Untuk Sprint 4 keep simple: Member sample tasks update via existing
-- assignee policy + field lock trigger (status/description/completed_at OK).
-- Kalau perlu full edit, owner bisa archive project saja (existing UPDATE
-- own sample handles).

-- Tidak perlu policy tasks tambahan — sample task assigned ke user,
-- existing tasks_select_member_assignee + tasks_update_member_assignee_limited
-- sudah cover. Field lock trigger membatasi field tapi acceptable untuk demo.


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. Verify column exists, all existing rows is_sample=false:
--      SELECT name, is_sample FROM public.projects;
--      → semua existing demo seed harus is_sample=false
--
--   2. Verify function exists + SECURITY DEFINER:
--      SELECT proname, prosecdef FROM pg_proc
--      WHERE proname = 'create_onboarding_sample';
--      → prosecdef = true
--
--   3. Verify policies created:
--      SELECT polname FROM pg_policy
--      WHERE polrelid = 'public.projects'::regclass
--      ORDER BY polname;
--      → projects_*_own_sample (3 policies)
--
--   4. Idempotency test:
--      SELECT public.create_onboarding_sample('00000000-0000-0000-0000-000000000003');
--      → returns project_id
--      SELECT public.create_onboarding_sample('00000000-0000-0000-0000-000000000003');
--      → returns SAME project_id (no duplicate)
-- =============================================================
