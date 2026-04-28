/**
 * URL filter state — encode/decode filter ke query string (deep linking +
 * persist on refresh).
 *
 * Convention: filter params prefixed dengan `f.` untuk avoid clash dengan
 * other query params (mis. ?view=kanban, ?page=2). Per Sprint 2 plan R8.
 *
 * Status: comma-separated list (e.g., ?f.status=todo,in_progress)
 * Team: single value (e.g., ?f.team=00000000-0000-0000-0000-00000000aaaa)
 */
import {
  PROJECT_STATUS_VALUES,
  type ProjectStatus,
} from '@/components/project/ProjectStatusBadge';
import type { ProjectsFilter } from '@/lib/projects';
import {
  TASK_PRIORITY_VALUES,
  TASK_STATUS_VALUES,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/tasks';
import {
  GROUP_BY_VALUES,
  type GroupBy,
  type TasksFilter,
} from '@/lib/tasksFilter';

const PARAM_STATUS = 'f.status';
const PARAM_TEAM = 'f.team';
const PARAM_TASK_STATUS = 'f.tstatus';
const PARAM_TASK_PRIORITY = 'f.tprio';
const PARAM_TASK_ASSIGNEE = 'f.tassignee';
const PARAM_GROUP_BY = 'group';
const PARAM_VIEW = 'view';

export type TaskView = 'list' | 'kanban' | 'gantt';

export const TASK_VIEW_VALUES: readonly TaskView[] = [
  'list',
  'kanban',
  'gantt',
] as const;

export function readProjectsFilterFromUrl(
  searchParams: URLSearchParams,
): ProjectsFilter {
  const statusRaw = searchParams.get(PARAM_STATUS);
  const statuses: ProjectStatus[] = statusRaw
    ? statusRaw
        .split(',')
        .filter((s): s is ProjectStatus =>
          PROJECT_STATUS_VALUES.includes(s as ProjectStatus),
        )
    : [];
  const teamId = searchParams.get(PARAM_TEAM) ?? '';
  return { statuses, teamId };
}

export function writeProjectsFilterToUrl(
  filter: ProjectsFilter,
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (filter.statuses.length > 0) {
    next.set(PARAM_STATUS, filter.statuses.join(','));
  } else {
    next.delete(PARAM_STATUS);
  }
  if (filter.teamId) {
    next.set(PARAM_TEAM, filter.teamId);
  } else {
    next.delete(PARAM_TEAM);
  }
  return next;
}

// ============================================================
// Tasks filter + view state (List/Kanban/Gantt)
// ============================================================

export function readTasksFilterFromUrl(
  searchParams: URLSearchParams,
): TasksFilter {
  const statusRaw = searchParams.get(PARAM_TASK_STATUS);
  const statuses: TaskStatus[] = statusRaw
    ? statusRaw
        .split(',')
        .filter((s): s is TaskStatus =>
          TASK_STATUS_VALUES.includes(s as TaskStatus),
        )
    : [];
  const priorityRaw = searchParams.get(PARAM_TASK_PRIORITY);
  const priorities: TaskPriority[] = priorityRaw
    ? priorityRaw
        .split(',')
        .filter((p): p is TaskPriority =>
          TASK_PRIORITY_VALUES.includes(p as TaskPriority),
        )
    : [];
  const assigneeId = searchParams.get(PARAM_TASK_ASSIGNEE) ?? '';
  return { statuses, priorities, assigneeId };
}

export function writeTasksFilterToUrl(
  filter: TasksFilter,
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (filter.statuses.length > 0) {
    next.set(PARAM_TASK_STATUS, filter.statuses.join(','));
  } else {
    next.delete(PARAM_TASK_STATUS);
  }
  if (filter.priorities.length > 0) {
    next.set(PARAM_TASK_PRIORITY, filter.priorities.join(','));
  } else {
    next.delete(PARAM_TASK_PRIORITY);
  }
  if (filter.assigneeId) {
    next.set(PARAM_TASK_ASSIGNEE, filter.assigneeId);
  } else {
    next.delete(PARAM_TASK_ASSIGNEE);
  }
  return next;
}

export function readGroupByFromUrl(searchParams: URLSearchParams): GroupBy {
  const raw = searchParams.get(PARAM_GROUP_BY);
  if (raw && GROUP_BY_VALUES.includes(raw as GroupBy)) {
    return raw as GroupBy;
  }
  return 'none';
}

export function writeGroupByToUrl(
  groupBy: GroupBy,
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (groupBy === 'none') {
    next.delete(PARAM_GROUP_BY);
  } else {
    next.set(PARAM_GROUP_BY, groupBy);
  }
  return next;
}

export function readViewFromUrl(
  searchParams: URLSearchParams,
  fallback: TaskView = 'list',
): TaskView {
  const raw = searchParams.get(PARAM_VIEW);
  if (raw && TASK_VIEW_VALUES.includes(raw as TaskView)) {
    return raw as TaskView;
  }
  return fallback;
}

export function writeViewToUrl(
  view: TaskView,
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (view === 'list') {
    next.delete(PARAM_VIEW);
  } else {
    next.set(PARAM_VIEW, view);
  }
  return next;
}
