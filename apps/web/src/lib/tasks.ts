/**
 * Tasks data layer — types + fetch.
 *
 * RLS Sprint 1:
 * - admin/viewer: lihat semua task
 * - manager: lihat task di project visible (ownership atau team transitive)
 * - member: lihat task assigned ke dirinya
 *
 * Field lock UPDATE Sprint 1: member only allowed status, completed_at,
 * description (trigger reset other fields ke OLD).
 */
import { supabase } from '@/lib/supabase';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskSource = 'manual' | 'cowork-agent' | 'csv-import';

export const TASK_STATUS_VALUES: readonly TaskStatus[] = [
  'todo',
  'in_progress',
  'review',
  'done',
  'blocked',
] as const;

export const TASK_PRIORITY_VALUES: readonly TaskPriority[] = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export interface Task {
  id: string;
  project_id: string;
  parent_id: string | null;
  title: string;
  description: string | null;
  assignee_id: string | null;
  created_by: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null; // DATE → ISO string
  estimated_hours: number | null;
  start_date: string | null;
  source: TaskSource;
  source_file_id: string | null;
  needs_review: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskWithAssignee extends Task {
  assignee: {
    id: string;
    full_name: string;
  } | null;
}

const TASK_SELECT_COLUMNS =
  'id, project_id, parent_id, title, description, assignee_id, created_by, status, priority, deadline, estimated_hours, start_date, source, source_file_id, needs_review, completed_at, created_at, updated_at, assignee:users!tasks_assignee_id_fkey (id, full_name)';

export async function fetchTasksByProject(
  projectId: string,
): Promise<TaskWithAssignee[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT_COLUMNS)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithAssignee[];
}

export async function fetchTaskById(
  taskId: string,
): Promise<TaskWithAssignee | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT_COLUMNS)
    .eq('id', taskId)
    .maybeSingle();
  if (error) {
    console.error('[tasks] fetchTaskById failed:', error);
    return null;
  }
  return (data as unknown as TaskWithAssignee | null) ?? null;
}

export interface UpdateTaskStatusArgs {
  id: string;
  status: TaskStatus;
}

export async function updateTaskStatus({
  id,
  status,
}: UpdateTaskStatusArgs): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}
