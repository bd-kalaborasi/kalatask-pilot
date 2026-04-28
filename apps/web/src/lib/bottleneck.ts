/**
 * Bottleneck data layer — F6 task stuck detection.
 *
 * Pattern: pure SQL query via supabase client (no new RPC needed).
 * Filter: status NOT IN (done, blocked) AND updated_at < (now - X days).
 * X dari app_settings.bottleneck_threshold_days (default 3 per Q4).
 */
import { supabase } from '@/lib/supabase';
import type { TaskWithAssignee } from '@/lib/tasks';

const TASK_SELECT_COLUMNS =
  'id, project_id, parent_id, title, description, assignee_id, created_by, status, priority, deadline, estimated_hours, start_date, source, source_file_id, needs_review, completed_at, created_at, updated_at, assignee:users!tasks_assignee_id_fkey (id, full_name)';

/**
 * Fetch threshold dari app_settings, fallback default kalau missing.
 */
export async function fetchBottleneckThreshold(): Promise<number> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'bottleneck_threshold_days')
    .maybeSingle();

  if (error) throw error;
  if (!data) return 3;

  const raw = (data as { value: unknown }).value;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? 3 : parsed;
  }
  return 3;
}

/**
 * Fetch tasks yang masuk bottleneck criteria.
 * RLS auto-scope per role.
 */
export async function fetchBottleneckTasks(
  thresholdDays: number,
): Promise<TaskWithAssignee[]> {
  const cutoffISO = new Date(
    Date.now() - thresholdDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT_COLUMNS)
    .in('status', ['todo', 'in_progress', 'review'])
    .lt('updated_at', cutoffISO)
    .order('updated_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as TaskWithAssignee[];
}

/**
 * Pure: cek apakah task qualifies sebagai bottleneck. Untuk client-side
 * filtering kalau perlu.
 */
export function isBottleneck(
  task: { status: string; updated_at: string },
  thresholdDays: number,
  now: Date = new Date(),
): boolean {
  if (!['todo', 'in_progress', 'review'].includes(task.status)) return false;
  const updated = new Date(task.updated_at);
  if (Number.isNaN(updated.getTime())) return false;
  const ageDays = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > thresholdDays;
}

/**
 * Compute hari sejak last update (untuk display).
 */
export function daysSinceUpdate(
  iso: string,
  now: Date = new Date(),
): number {
  const updated = new Date(iso);
  if (Number.isNaN(updated.getTime())) return 0;
  return Math.floor(
    (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24),
  );
}
