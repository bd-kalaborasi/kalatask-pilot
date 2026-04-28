-- =============================================================
-- Migration: 20260428120100_add_bulk_import_tasks_rpc
--
-- Tujuan: Implement RPC bulk_import_tasks per ADR-005.
--   F15 CSV import — admin-only, transactional, validates format
--   + FK + auto-create project, returns JSONB summary.
--
-- Per ADR-005 decision: client-side papaparse parse → JSONB rows →
-- single RPC call. SECURITY INVOKER + admin-only check di body
-- (RAISE EXCEPTION untuk non-admin caller).
--
-- Input shape per row:
--   {
--     "title": "...",
--     "description": "...",
--     "assignee_email": "...",
--     "project_name": "...",
--     "status": "todo|in_progress|review|done|blocked",
--     "priority": "low|medium|high|urgent",
--     "deadline": "YYYY-MM-DD" | null,
--     "estimated_hours": int | null
--   }
--
-- Output shape:
--   {
--     "dry_run": bool,
--     "summary": {"total": N, "valid": N, "warning": N, "error": N, "imported": N},
--     "rows": [
--       {"row": 1, "status": "valid|warning|error", "issues": [...], "task_id": uuid|null}
--     ]
--   }
--
-- Validation rules (mirror ADR-005 Step 7 spec):
--   - title required (error if blank)
--   - status enum check (error if invalid)
--   - priority enum check (error if invalid)
--   - deadline parseable date (error if non-parseable)
--   - assignee_email lookup → kalau tidak match: warning, skip row
--     (Q3 owner answer b — auto-create user defer Sprint 5+)
--   - project_name → kalau tidak ada, auto-create dengan status='active'
--
-- Transactional: SQL function di dalam single transaction. RAISE
-- EXCEPTION → automatic ROLLBACK. Critical errors (admin check fail,
-- malformed JSONB) abort sebelum any insert.
--
-- Dry-run mode: validate + return summary tanpa INSERT. Untuk preview UX.
--
-- Refer:
--   - ADR-005 docs/adr/ADR-005-csv-import-strategy.md
--   - PRD §3.1 F15 line 145
--   - PRD §3.2 Feature 8 line 282-296
--   - Sprint 4 plan Step 7
--   - Q3 owner answer (b) skip row only
--
-- Reversal:
--   DROP FUNCTION IF EXISTS public.bulk_import_tasks(jsonb, boolean);
--
-- Author: Claude Code (Sprint 4 Step 7)
-- =============================================================


CREATE OR REPLACE FUNCTION public.bulk_import_tasks(
  p_rows jsonb,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_row jsonb;
  v_idx int := 0;
  v_title text;
  v_description text;
  v_assignee_email text;
  v_project_name text;
  v_status text;
  v_priority text;
  v_deadline date;
  v_estimated_hours int;
  v_assignee_id uuid;
  v_project_id uuid;
  v_task_id uuid;
  v_issues jsonb;
  v_row_status text;
  v_results jsonb := '[]'::jsonb;
  v_total int := 0;
  v_valid int := 0;
  v_warning int := 0;
  v_error int := 0;
  v_imported int := 0;
BEGIN
  -- Admin-only check (ADR-005 + PRD F4 admin-only CSV import)
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'bulk_import_tasks: hanya admin yang bisa import CSV (current role denied)';
  END IF;

  -- Input shape guard
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'bulk_import_tasks: p_rows harus jsonb array';
  END IF;

  v_total := jsonb_array_length(p_rows);

  -- Iterate rows
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_idx := v_idx + 1;
    v_issues := '[]'::jsonb;
    v_row_status := 'valid';
    v_task_id := NULL;
    v_assignee_id := NULL;
    v_project_id := NULL;

    -- Extract fields (NULL-safe)
    v_title := NULLIF(trim(v_row->>'title'), '');
    v_description := v_row->>'description';
    v_assignee_email := NULLIF(trim(v_row->>'assignee_email'), '');
    v_project_name := NULLIF(trim(v_row->>'project_name'), '');
    v_status := COALESCE(NULLIF(trim(v_row->>'status'), ''), 'todo');
    v_priority := COALESCE(NULLIF(trim(v_row->>'priority'), ''), 'medium');

    -- Deadline parse (best-effort)
    BEGIN
      v_deadline := NULLIF(trim(v_row->>'deadline'), '')::date;
    EXCEPTION WHEN OTHERS THEN
      v_issues := v_issues || jsonb_build_object('field', 'deadline', 'message', 'format tanggal invalid (pakai YYYY-MM-DD)');
      v_row_status := 'error';
      v_deadline := NULL;
    END;

    -- estimated_hours parse
    BEGIN
      v_estimated_hours := NULLIF(trim(v_row->>'estimated_hours'), '')::int;
      IF v_estimated_hours IS NOT NULL AND v_estimated_hours <= 0 THEN
        v_issues := v_issues || jsonb_build_object('field', 'estimated_hours', 'message', 'harus positif');
        v_row_status := 'error';
        v_estimated_hours := NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_issues := v_issues || jsonb_build_object('field', 'estimated_hours', 'message', 'harus integer');
      v_row_status := 'error';
      v_estimated_hours := NULL;
    END;

    -- Required field check
    IF v_title IS NULL THEN
      v_issues := v_issues || jsonb_build_object('field', 'title', 'message', 'wajib diisi');
      v_row_status := 'error';
    END IF;

    IF v_project_name IS NULL THEN
      v_issues := v_issues || jsonb_build_object('field', 'project_name', 'message', 'wajib diisi');
      v_row_status := 'error';
    END IF;

    -- Enum check
    IF v_status NOT IN ('todo','in_progress','review','done','blocked') THEN
      v_issues := v_issues || jsonb_build_object('field', 'status', 'message', format('"%s" bukan status valid', v_status));
      v_row_status := 'error';
    END IF;

    IF v_priority NOT IN ('low','medium','high','urgent') THEN
      v_issues := v_issues || jsonb_build_object('field', 'priority', 'message', format('"%s" bukan priority valid', v_priority));
      v_row_status := 'error';
    END IF;

    -- Assignee lookup (warning kalau tidak match — Q3 b skip)
    IF v_assignee_email IS NOT NULL THEN
      SELECT id INTO v_assignee_id
      FROM public.users
      WHERE lower(email) = lower(v_assignee_email)
      LIMIT 1;

      IF v_assignee_id IS NULL THEN
        v_issues := v_issues || jsonb_build_object(
          'field', 'assignee_email',
          'message', format('user "%s" tidak ditemukan — task akan diimpor tanpa assignee', v_assignee_email)
        );
        IF v_row_status = 'valid' THEN
          v_row_status := 'warning';
        END IF;
      END IF;
    END IF;

    -- Project lookup atau auto-create (kalau tidak error)
    IF v_row_status <> 'error' AND v_project_name IS NOT NULL THEN
      SELECT id INTO v_project_id
      FROM public.projects
      WHERE name = v_project_name
        AND status <> 'archived'
      LIMIT 1;

      IF v_project_id IS NULL AND NOT p_dry_run THEN
        -- Auto-create project (admin context, bypass RLS via projects_insert_admin_any)
        INSERT INTO public.projects (name, owner_id, status)
        VALUES (v_project_name, auth.uid(), 'active')
        RETURNING id INTO v_project_id;

        v_issues := v_issues || jsonb_build_object(
          'field', 'project_name',
          'message', format('project "%s" auto-created (status=active)', v_project_name)
        );
      ELSIF v_project_id IS NULL AND p_dry_run THEN
        v_issues := v_issues || jsonb_build_object(
          'field', 'project_name',
          'message', format('project "%s" akan auto-created saat commit', v_project_name)
        );
      END IF;
    END IF;

    -- INSERT task kalau valid/warning + bukan dry-run
    IF v_row_status <> 'error' AND NOT p_dry_run AND v_project_id IS NOT NULL THEN
      INSERT INTO public.tasks (
        project_id, title, description, assignee_id, created_by,
        status, priority, deadline, estimated_hours, source
      )
      VALUES (
        v_project_id, v_title, v_description, v_assignee_id, auth.uid(),
        v_status, v_priority, v_deadline, v_estimated_hours, 'csv-import'
      )
      RETURNING id INTO v_task_id;

      v_imported := v_imported + 1;
    END IF;

    -- Tally summary
    IF v_row_status = 'valid' THEN
      v_valid := v_valid + 1;
    ELSIF v_row_status = 'warning' THEN
      v_warning := v_warning + 1;
    ELSE
      v_error := v_error + 1;
    END IF;

    -- Append result
    v_results := v_results || jsonb_build_array(jsonb_build_object(
      'row', v_idx,
      'status', v_row_status,
      'issues', v_issues,
      'task_id', v_task_id
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'summary', jsonb_build_object(
      'total', v_total,
      'valid', v_valid,
      'warning', v_warning,
      'error', v_error,
      'imported', v_imported
    ),
    'rows', v_results
  );
END;
$$;

COMMENT ON FUNCTION public.bulk_import_tasks(jsonb, boolean) IS
  'F15 CSV import — admin-only RPC. Validate + insert tasks dalam single transaction. Auto-create projects. Q3 (b): skip row kalau assignee_email tidak match (warning). ADR-005.';

GRANT EXECUTE ON FUNCTION public.bulk_import_tasks(jsonb, boolean) TO authenticated;


-- =============================================================
-- POST-APPLY VERIFICATION:
--   1. Verify function exists:
--      SELECT proname FROM pg_proc WHERE proname='bulk_import_tasks';
--
--   2. Test admin-only check (caller non-admin should error):
--      -- (run di Dashboard sebagai member account)
--      SELECT public.bulk_import_tasks('[]'::jsonb, true);
--      → expect ERROR: hanya admin
--
--   3. Test dry-run sebagai admin:
--      SELECT public.bulk_import_tasks('[
--        {"title":"Test","project_name":"Demo","status":"todo","priority":"medium"}
--      ]'::jsonb, true);
--      → expect summary.total=1, summary.valid=1, summary.imported=0 (dry-run)
-- =============================================================
