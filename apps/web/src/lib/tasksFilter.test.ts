import { describe, expect, it } from 'vitest';
import {
  applyTasksFilter,
  groupTasks,
  type GroupBy,
  type TasksFilter,
} from './tasksFilter';
import type { TaskWithAssignee } from './tasks';

const ANY_DATE = '2026-04-28T00:00:00Z';

function task(partial: Partial<TaskWithAssignee>): TaskWithAssignee {
  return {
    id: partial.id ?? 'id',
    project_id: 'p1',
    parent_id: null,
    title: partial.title ?? 'Task',
    description: null,
    assignee_id: partial.assignee_id ?? null,
    created_by: null,
    status: partial.status ?? 'todo',
    priority: partial.priority ?? 'medium',
    deadline: null,
    estimated_hours: null,
    start_date: null,
    source: 'manual',
    source_file_id: null,
    needs_review: false,
    completed_at: null,
    created_at: ANY_DATE,
    updated_at: ANY_DATE,
    assignee: partial.assignee ?? null,
  };
}

const sample: TaskWithAssignee[] = [
  task({
    id: 't1',
    title: 'Task A',
    status: 'todo',
    priority: 'high',
    assignee_id: 'u1',
    assignee: { id: 'u1', full_name: 'Andi' },
  }),
  task({
    id: 't2',
    title: 'Task B',
    status: 'in_progress',
    priority: 'urgent',
    assignee_id: 'u2',
    assignee: { id: 'u2', full_name: 'Dewi' },
  }),
  task({
    id: 't3',
    title: 'Task C',
    status: 'done',
    priority: 'low',
    assignee_id: null,
    assignee: null,
  }),
];

describe('applyTasksFilter', () => {
  it('passthrough saat filter empty', () => {
    const empty: TasksFilter = { statuses: [], priorities: [], assigneeId: '' };
    expect(applyTasksFilter(sample, empty)).toHaveLength(3);
  });

  it('filter by status', () => {
    const result = applyTasksFilter(sample, {
      statuses: ['todo'],
      priorities: [],
      assigneeId: '',
    });
    expect(result.map((t) => t.id)).toEqual(['t1']);
  });

  it('filter by priority', () => {
    const result = applyTasksFilter(sample, {
      statuses: [],
      priorities: ['urgent', 'high'],
      assigneeId: '',
    });
    expect(result.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('filter by assigneeId', () => {
    const result = applyTasksFilter(sample, {
      statuses: [],
      priorities: [],
      assigneeId: 'u1',
    });
    expect(result.map((t) => t.id)).toEqual(['t1']);
  });

  it('filter by __unassigned__', () => {
    const result = applyTasksFilter(sample, {
      statuses: [],
      priorities: [],
      assigneeId: '__unassigned__',
    });
    expect(result.map((t) => t.id)).toEqual(['t3']);
  });
});

describe('groupTasks', () => {
  it.each<GroupBy>(['none', 'status', 'priority', 'assignee'])(
    'returns groups untuk groupBy "%s"',
    (groupBy) => {
      const groups = groupTasks(sample, groupBy);
      expect(groups.length).toBeGreaterThan(0);
      const totalTasks = groups.reduce((sum, g) => sum + g.tasks.length, 0);
      expect(totalTasks).toBe(sample.length);
    },
  );

  it('group "none" return single group', () => {
    const groups = groupTasks(sample, 'none');
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('Semua');
  });

  it('group by status sorts in canonical order', () => {
    const groups = groupTasks(sample, 'status');
    expect(groups.map((g) => g.key)).toEqual(['todo', 'in_progress', 'done']);
  });

  it('group by priority sorts urgent → low', () => {
    const groups = groupTasks(sample, 'priority');
    expect(groups.map((g) => g.key)).toEqual(['urgent', 'high', 'low']);
  });

  it('group by assignee uses Unassigned label untuk null', () => {
    const groups = groupTasks(sample, 'assignee');
    const labels = groups.map((g) => g.label);
    expect(labels).toContain('Unassigned');
    expect(labels).toContain('Andi');
    expect(labels).toContain('Dewi');
  });
});
