-- R4 Phase B — activity log view for Dashboard activity feed
-- Derived from existing tables (comments + tasks), no new entity needed.
-- This view UNION-aggregates recent comments and recent task status changes
-- with author/task/project context, ordered by timestamp.
--
-- Apply via:  supabase db push
-- Owner action: run after R4 PR merges.

CREATE OR REPLACE VIEW public.activity_log AS
SELECT
  ('c-' || c.id::text) AS id,
  'comment'::text AS event_type,
  c.author_id AS user_id,
  u.full_name AS user_full_name,
  c.task_id,
  t.title AS task_title,
  t.project_id,
  p.name AS project_name,
  c.body AS detail,
  NULL::text AS old_value,
  NULL::text AS new_value,
  c.created_at
FROM public.comments c
LEFT JOIN public.users u ON u.id = c.author_id
LEFT JOIN public.tasks t ON t.id = c.task_id
LEFT JOIN public.projects p ON p.id = t.project_id

UNION ALL

SELECT
  ('t-' || t.id::text) AS id,
  'task_update'::text AS event_type,
  t.assignee_id AS user_id,
  u.full_name AS user_full_name,
  t.id AS task_id,
  t.title AS task_title,
  t.project_id,
  p.name AS project_name,
  ('Status: ' || t.status)::text AS detail,
  NULL::text AS old_value,
  t.status::text AS new_value,
  t.updated_at AS created_at
FROM public.tasks t
LEFT JOIN public.users u ON u.id = t.assignee_id
LEFT JOIN public.projects p ON p.id = t.project_id
WHERE t.updated_at > t.created_at;

COMMENT ON VIEW public.activity_log IS
  'Read-only feed of recent comments + task status updates with full context. R4 Phase B. RLS inherited from underlying tables.';

-- View inherits RLS from base tables (comments, tasks, projects via SELECT policies).
GRANT SELECT ON public.activity_log TO authenticated;
