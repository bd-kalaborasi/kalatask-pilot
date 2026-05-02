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

/**
 * Fetch tasks assigned to a specific user across all projects (RLS-aware).
 * Used by /tasks "Tugas Saya" personal task list (Sprint 6 patch r2).
 * Includes project name for context display.
 */
export interface TaskWithAssigneeAndProject extends TaskWithAssignee {
  project: {
    id: string;
    name: string;
    status: string;
  } | null;
}

export async function fetchTasksByAssignee(
  userId: string,
): Promise<TaskWithAssigneeAndProject[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `${TASK_SELECT_COLUMNS}, project:projects!tasks_project_id_fkey (id, name, status)`,
    )
    .eq('assignee_id', userId)
    .order('deadline', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as TaskWithAssigneeAndProject[];
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

export interface CreateTaskArgs {
  projectId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string | null;
  assigneeId?: string | null;
}

export async function createTask(
  args: CreateTaskArgs,
): Promise<TaskWithAssignee> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) throw new Error('Tidak ada session aktif');

  const payload = {
    project_id: args.projectId,
    title: args.title.trim(),
    description: args.description?.trim() || null,
    priority: args.priority ?? 'medium',
    deadline: args.deadline ?? null,
    assignee_id: args.assigneeId ?? null,
    created_by: uid,
    source: 'manual' as const,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select(TASK_SELECT_COLUMNS)
    .single();

  if (error) throw error;
  return data as unknown as TaskWithAssignee;
}
