-- =============================================================
-- Migration: 20260429100000_create_mom_import_schema
--
-- Tujuan: Sprint 5 — F9 MoM Import (rename dari "Cowork integration" per
--   ADR-007 v2). 4 tabel baru + 2 column additive di tasks. RLS pola
--   Sprint 1-4.5 (admin/manager/member/viewer matrix).
--
-- 4 tabel:
--   1. user_aliases — master alias mapping ("Pak Joko" → user_uuid)
--      auto-populated dari users.full_name + first_name via trigger,
--      seed-able dari MAPPING_KARYAWAN_FINAL_V2.csv.
--   2. mom_imports — parent record per uploaded MoM file (raw markdown,
--      parse summary, approval status).
--   3. mom_import_items — per ACTION-XXX item dengan PIC resolution
--      (confidence HIGH/MEDIUM/LOW/UNRESOLVED), candidates jsonb,
--      decision (create/update/skip/reject) post-review.
--   4. usage_snapshots — F16 daily snapshot (DB size, MAU, top tables).
--
-- tasks ADD COLUMN (additive):
--   - source_mom_import_id uuid FK
--   - source_action_id text
--
-- Enable extension fuzzystrmatch untuk Levenshtein resolver.
--
-- Refer:
--   - ADR-007 v2 (MoM Import Hybrid agent-parse + batch RPC)
--   - Sprint 5 plan
--   - PRD §3.2 F9 (rename) + §3.2 F16 (usage)
--
-- Reversal:
--   ALTER TABLE public.tasks DROP COLUMN IF EXISTS source_action_id;
--   ALTER TABLE public.tasks DROP COLUMN IF EXISTS source_mom_import_id;
--   DROP TABLE IF EXISTS public.usage_snapshots CASCADE;
--   DROP TABLE IF EXISTS public.mom_import_items CASCADE;
--   DROP TABLE IF EXISTS public.mom_imports CASCADE;
--   DROP TABLE IF EXISTS public.user_aliases CASCADE;
--
-- Author: Claude Code (Sprint 5 Step 1)
-- =============================================================


-- ============================================================
-- 0. Enable extension untuk Levenshtein resolver (Step 3)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;


-- ============================================================
-- 1. user_aliases — master alias mapping
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_aliases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  alias_text  text NOT NULL,
  alias_type  text NOT NULL CHECK (alias_type IN ('full_name','nickname','honorific','manual','seed')),
  confidence  text CHECK (confidence IN ('CONFIRMED','HIGH','MEDIUM','LOW')),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, alias_text)
);

COMMENT ON TABLE public.user_aliases IS
  'Master alias mapping untuk MoM PIC resolution (F9). Auto-populate dari users full_name/first_name via trigger. Seed-able dari MAPPING_KARYAWAN_FINAL_V2.csv.';

-- Index untuk resolver lookup (case-insensitive exact + LIKE prefix)
CREATE INDEX IF NOT EXISTS idx_user_aliases_lower_alias
  ON public.user_aliases (lower(alias_text));
CREATE INDEX IF NOT EXISTS idx_user_aliases_user
  ON public.user_aliases (user_id);

CREATE TRIGGER trg_user_aliases_set_updated_at
  BEFORE UPDATE ON public.user_aliases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 2. mom_imports — parent record per uploaded MoM file
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mom_imports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       text NOT NULL,
  mom_date        date,
  title           text,
  uploaded_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  raw_markdown    text NOT NULL,
  parse_status    text NOT NULL DEFAULT 'parsed'
                    CHECK (parse_status IN ('parsed','partial_error','error')),
  parse_summary   jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_status text NOT NULL DEFAULT 'pending_review'
                    CHECK (approval_status IN ('pending_review','auto_approved','approved','rejected')),
  approved_by     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  approved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.mom_imports IS
  'Parent per uploaded MoM. raw_markdown stored untuk audit + re-parse. approval_status auto_approved kalau semua items HIGH confidence.';

CREATE INDEX IF NOT EXISTS idx_mom_imports_status_created
  ON public.mom_imports (approval_status, created_at DESC);

CREATE TRIGGER trg_mom_imports_set_updated_at
  BEFORE UPDATE ON public.mom_imports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 3. mom_import_items — per ACTION-XXX item dengan PIC resolution
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mom_import_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mom_import_id       uuid NOT NULL REFERENCES public.mom_imports(id) ON DELETE CASCADE ON UPDATE CASCADE,
  action_id           text NOT NULL,
  raw_pic             text,
  pic_resolved_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  pic_confidence      text NOT NULL CHECK (pic_confidence IN ('HIGH','MEDIUM','LOW','UNRESOLVED')),
  pic_candidates      jsonb NOT NULL DEFAULT '[]'::jsonb,
  title               text NOT NULL,
  description         text,
  deadline            date,
  priority            text CHECK (priority IN ('low','medium','high','urgent')),
  estimated_hours     integer CHECK (estimated_hours IS NULL OR estimated_hours > 0),
  project_name        text,
  status_initial      text NOT NULL DEFAULT 'todo' CHECK (status_initial IN ('todo','in_progress','review','done','blocked')),
  decision            text CHECK (decision IN ('create','update','skip','reject')),
  target_task_id      uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  reviewed_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mom_import_id, action_id)
);

COMMENT ON TABLE public.mom_import_items IS
  'Per ACTION-XXX item dari MoM. pic_confidence locked enum untuk gating: HIGH=exact alias, MEDIUM=fuzzy ≤1, LOW=multi atau distance 2, UNRESOLVED=no match.';

CREATE INDEX IF NOT EXISTS idx_mom_items_import_action
  ON public.mom_import_items (mom_import_id, action_id);
CREATE INDEX IF NOT EXISTS idx_mom_items_confidence
  ON public.mom_import_items (mom_import_id, pic_confidence);


-- ============================================================
-- 4. usage_snapshots — F16 daily snapshot
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usage_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at     timestamptz NOT NULL DEFAULT now(),
  db_size_mb      numeric(10,2),
  storage_size_mb numeric(10,2),
  mau_count       integer,
  top_tables      jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_files       jsonb NOT NULL DEFAULT '[]'::jsonb,
  alerts          jsonb NOT NULL DEFAULT '[]'::jsonb
);

COMMENT ON TABLE public.usage_snapshots IS
  'F16 admin usage monitoring snapshot. Daily insert via Edge Function usage-snapshot. Retention 90 hari recommended.';

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_captured
  ON public.usage_snapshots (captured_at DESC);


-- ============================================================
-- 5. tasks ADD COLUMN (additive)
-- ============================================================
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS source_mom_import_id uuid REFERENCES public.mom_imports(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_action_id text;

COMMENT ON COLUMN public.tasks.source_mom_import_id IS
  'FK ke mom_imports. NULL untuk task non-MoM origin. Sprint 5.';
COMMENT ON COLUMN public.tasks.source_action_id IS
  'Action ID dari MoM (mis. ACTION-001). Composite (source_mom_import_id, source_action_id) = dedup key. Sprint 5.';

-- Index untuk dedup lookup
CREATE INDEX IF NOT EXISTS idx_tasks_mom_source
  ON public.tasks (source_mom_import_id, source_action_id)
  WHERE source_mom_import_id IS NOT NULL;

-- Update tasks.source CHECK to include 'mom-import'
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_source_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_source_check
  CHECK (source IN ('manual','cowork-agent','csv-import','mom-import'));


-- ============================================================
-- 6. RLS — admin write, admin/manager read aliases
-- ============================================================

-- 6a. user_aliases: read all authenticated, write admin only
ALTER TABLE public.user_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_aliases FORCE  ROW LEVEL SECURITY;

CREATE POLICY "user_aliases_select_authenticated" ON public.user_aliases
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "user_aliases_insert_admin" ON public.user_aliases
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "user_aliases_update_admin" ON public.user_aliases
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "user_aliases_delete_admin" ON public.user_aliases
  FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_aliases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_aliases TO service_role;


-- 6b. mom_imports: admin+manager read, admin write
ALTER TABLE public.mom_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mom_imports FORCE  ROW LEVEL SECURITY;

CREATE POLICY "mom_imports_select_admin_manager" ON public.mom_imports
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_manager());

CREATE POLICY "mom_imports_insert_admin" ON public.mom_imports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "mom_imports_update_admin" ON public.mom_imports
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "mom_imports_delete_admin" ON public.mom_imports
  FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mom_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mom_imports TO service_role;


-- 6c. mom_import_items: same pattern
ALTER TABLE public.mom_import_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mom_import_items FORCE  ROW LEVEL SECURITY;

CREATE POLICY "mom_items_select_admin_manager" ON public.mom_import_items
  FOR SELECT TO authenticated
  USING (public.is_admin() OR public.is_manager());

CREATE POLICY "mom_items_insert_admin" ON public.mom_import_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "mom_items_update_admin" ON public.mom_import_items
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "mom_items_delete_admin" ON public.mom_import_items
  FOR DELETE TO authenticated
  USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mom_import_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mom_import_items TO service_role;


-- 6d. usage_snapshots: admin only
ALTER TABLE public.usage_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_snapshots FORCE  ROW LEVEL SECURITY;

CREATE POLICY "usage_snapshots_select_admin" ON public.usage_snapshots
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "usage_snapshots_insert_admin" ON public.usage_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.usage_snapshots TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.usage_snapshots TO service_role;


-- ============================================================
-- 7. Trigger: auto-create alias dari users insert
-- ============================================================
-- Saat user baru ditambahkan, auto-create alias entries:
--   - full_name (HIGH, full_name)
--   - first_name (HIGH, nickname) — ambil token pertama
--   - "Pak {first}", "Bu {first}", "Mas {first}", "Mbak {first}" (LOW, honorific)
-- Trigger AFTER INSERT.
CREATE OR REPLACE FUNCTION public.users_auto_create_aliases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name text;
  v_honorific text;
BEGIN
  -- Insert full_name as HIGH alias
  INSERT INTO public.user_aliases (user_id, alias_text, alias_type, confidence)
  VALUES (NEW.id, NEW.full_name, 'full_name', 'HIGH')
  ON CONFLICT (user_id, alias_text) DO NOTHING;

  -- Extract first token sebagai nickname
  v_first_name := split_part(NEW.full_name, ' ', 1);
  IF v_first_name IS NOT NULL AND v_first_name <> '' AND v_first_name <> NEW.full_name THEN
    INSERT INTO public.user_aliases (user_id, alias_text, alias_type, confidence)
    VALUES (NEW.id, v_first_name, 'nickname', 'HIGH')
    ON CONFLICT (user_id, alias_text) DO NOTHING;

    -- Honorific variations (LOW karena potential collision)
    FOR v_honorific IN SELECT unnest(ARRAY['Pak','Bu','Mas','Mbak']) LOOP
      INSERT INTO public.user_aliases (user_id, alias_text, alias_type, confidence)
      VALUES (NEW.id, v_honorific || ' ' || v_first_name, 'honorific', 'LOW')
      ON CONFLICT (user_id, alias_text) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.users_auto_create_aliases() IS
  'Trigger fn: auto-populate user_aliases dari users.full_name. Sprint 5 F9.';

CREATE TRIGGER trg_users_auto_create_aliases
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.users_auto_create_aliases();


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. SELECT count(*) FROM information_schema.tables
--      WHERE table_schema='public'
--        AND table_name IN ('user_aliases','mom_imports','mom_import_items','usage_snapshots');
--      → 4
--   2. SELECT count(*) FROM information_schema.columns
--      WHERE table_schema='public' AND table_name='tasks'
--        AND column_name IN ('source_mom_import_id','source_action_id');
--      → 2
--   3. SELECT count(*) FROM pg_policy
--      WHERE polrelid::regclass::text IN
--        ('public.user_aliases','public.mom_imports','public.mom_import_items','public.usage_snapshots');
--      → 14 (4+4+4+2)
-- =============================================================
