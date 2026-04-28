/**
 * Tasks filter + grouping — pure functions for List view.
 *
 * F3 AC-4 (grouping by project/assignee/status) + F11.b (per-view filter).
 */
import type {
  TaskPriority,
  TaskStatus,
  TaskWithAssignee,
} from '@/lib/tasks';

export type GroupBy = 'none' | 'status' | 'assignee' | 'priority';

export const GROUP_BY_VALUES: readonly GroupBy[] = [
  'none',
  'status',
  'assignee',
  'priority',
] as const;

export interface TasksFilter {
  statuses: TaskStatus[];
  priorities: TaskPriority[];
  assigneeId: string;
}

export const EMPTY_TASKS_FILTER: TasksFilter = {
  statuses: [],
  priorities: [],
  assigneeId: '',
};

export function applyTasksFilter(
  tasks: TaskWithAssignee[],
  filter: TasksFilter,
): TaskWithAssignee[] {
  return tasks.filter((t) => {
    if (filter.statuses.length > 0 && !filter.statuses.includes(t.status)) {
      return false;
    }
    if (
      filter.priorities.length > 0 &&
      !filter.priorities.includes(t.priority)
    ) {
      return false;
    }
    if (filter.assigneeId) {
      if (filter.assigneeId === '__unassigned__') {
        if (t.assignee_id !== null) return false;
      } else if (t.assignee_id !== filter.assigneeId) {
        return false;
      }
    }
    return true;
  });
}

export interface TaskGroup {
  key: string;
  label: string;
  tasks: TaskWithAssignee[];
}

const STATUS_ORDER: TaskStatus[] = [
  'todo',
  'in_progress',
  'review',
  'done',
  'blocked',
];

const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

export function groupTasks(
  tasks: TaskWithAssignee[],
  groupBy: GroupBy,
): TaskGroup[] {
  if (groupBy === 'none') {
    return [{ key: 'all', label: 'Semua', tasks }];
  }

  const map = new Map<string, { label: string; tasks: TaskWithAssignee[] }>();

  for (const t of tasks) {
    let key: string;
    let label: string;
    if (groupBy === 'status') {
      key = t.status;
      label = labelStatus(t.status);
    } else if (groupBy === 'priority') {
      key = t.priority;
      label = capitalize(t.priority);
    } else {
      // assignee
      key = t.assignee_id ?? '__unassigned__';
      label = t.assignee?.full_name ?? 'Unassigned';
    }
    const existing = map.get(key);
    if (existing) {
      existing.tasks.push(t);
    } else {
      map.set(key, { label, tasks: [t] });
    }
  }

  const groups: TaskGroup[] = Array.from(map.entries()).map(([key, value]) => ({
    key,
    label: value.label,
    tasks: value.tasks,
  }));

  // Sort groups deterministically
  if (groupBy === 'status') {
    groups.sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.key as TaskStatus) -
        STATUS_ORDER.indexOf(b.key as TaskStatus),
    );
  } else if (groupBy === 'priority') {
    groups.sort(
      (a, b) =>
        PRIORITY_ORDER.indexOf(a.key as TaskPriority) -
        PRIORITY_ORDER.indexOf(b.key as TaskPriority),
    );
  } else {
    groups.sort((a, b) => a.label.localeCompare(b.label));
  }

  return groups;
}

function labelStatus(s: TaskStatus): string {
  if (s === 'in_progress') return 'In Progress';
  return capitalize(s);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
