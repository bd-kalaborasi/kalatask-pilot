/**
 * TasksFilterBar — filter UI untuk task list views.
 *
 * F11.b (per-view filter): status, priority, assignee.
 * Sprint 2 scope partial F11 — defer F11.a (global search) + F11.c (saved
 * filter) ke Sprint 3+ per Q4 owner answer.
 *
 * Plus grouping toggle (F3 AC-4).
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  TASK_STATUS_VALUES,
  TASK_PRIORITY_VALUES,
  type TaskPriority,
  type TaskStatus,
  type TaskWithAssignee,
} from '@/lib/tasks';
import { taskStatusLabel } from '@/components/task/TaskStatusBadge';
import { GROUP_BY_VALUES, type GroupBy, type TasksFilter } from '@/lib/tasksFilter';

interface TasksFilterBarProps {
  filter: TasksFilter;
  onFilterChange: (next: TasksFilter) => void;
  groupBy: GroupBy;
  onGroupByChange: (next: GroupBy) => void;
  /** Daftar assignee unique dari tasks current — untuk dropdown */
  tasks: TaskWithAssignee[];
}

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const GROUP_BY_LABEL: Record<GroupBy, string> = {
  none: 'Tanpa group',
  status: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
};

export function TasksFilterBar({
  filter,
  onFilterChange,
  groupBy,
  onGroupByChange,
  tasks,
}: TasksFilterBarProps) {
  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    let hasUnassigned = false;
    for (const t of tasks) {
      if (t.assignee_id && t.assignee) {
        map.set(t.assignee_id, t.assignee.full_name);
      } else {
        hasUnassigned = true;
      }
    }
    const result = Array.from(map.entries()).map(([id, name]) => ({
      id,
      name,
    }));
    result.sort((a, b) => a.name.localeCompare(b.name));
    if (hasUnassigned) {
      result.unshift({ id: '__unassigned__', name: 'Unassigned' });
    }
    return result;
  }, [tasks]);

  const activeCount = useMemo(() => {
    let n = filter.statuses.length + filter.priorities.length;
    if (filter.assigneeId) n += 1;
    return n;
  }, [filter]);

  function toggleStatus(s: TaskStatus) {
    const next = filter.statuses.includes(s)
      ? filter.statuses.filter((x) => x !== s)
      : [...filter.statuses, s];
    onFilterChange({ ...filter, statuses: next });
  }

  function togglePriority(p: TaskPriority) {
    const next = filter.priorities.includes(p)
      ? filter.priorities.filter((x) => x !== p)
      : [...filter.priorities, p];
    onFilterChange({ ...filter, priorities: next });
  }

  function reset() {
    onFilterChange({ statuses: [], priorities: [], assigneeId: '' });
  }

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-md bg-surface">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Filter</h3>
        <div className="flex items-center gap-2">
          <label htmlFor="task-group-by" className="text-xs text-muted-foreground">
            Group by
          </label>
          <select
            id="task-group-by"
            value={groupBy}
            onChange={(e) => onGroupByChange(e.target.value as GroupBy)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {GROUP_BY_VALUES.map((g) => (
              <option key={g} value={g}>
                {GROUP_BY_LABEL[g]}
              </option>
            ))}
          </select>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset ({activeCount})
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-wide text-muted-foreground">
            Status
          </legend>
          <div className="flex flex-wrap gap-2">
            {TASK_STATUS_VALUES.map((s) => {
              const active = filter.statuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent',
                  )}
                >
                  {taskStatusLabel(s)}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-wide text-muted-foreground">
            Priority
          </legend>
          <div className="flex flex-wrap gap-2">
            {TASK_PRIORITY_VALUES.map((p) => {
              const active = filter.priorities.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePriority(p)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent',
                  )}
                >
                  {PRIORITY_LABEL[p]}
                </button>
              );
            })}
          </div>
        </fieldset>

        {assigneeOptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="filter-assignee"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Assignee
            </label>
            <select
              id="filter-assignee"
              value={filter.assigneeId}
              onChange={(e) =>
                onFilterChange({ ...filter, assigneeId: e.target.value })
              }
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua assignee</option>
              {assigneeOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
