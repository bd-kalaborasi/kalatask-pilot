import { describe, expect, it } from 'vitest';
import { buildGanttTasks } from './GanttView';
import type { TaskWithAssignee } from '@/lib/tasks';

function makeTask(partial: Partial<TaskWithAssignee>): TaskWithAssignee {
  return {
    id: partial.id ?? 'id',
    project_id: 'p1',
    parent_id: null,
    title: partial.title ?? 'Task',
    description: null,
    assignee_id: null,
    created_by: null,
    status: partial.status ?? 'todo',
    priority: 'medium',
    deadline: partial.deadline ?? null,
    estimated_hours: partial.estimated_hours ?? null,
    start_date: partial.start_date ?? null,
    source: 'manual',
    source_file_id: null,
    needs_review: false,
    completed_at: null,
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-01T00:00:00Z',
    assignee: null,
  };
}

describe('buildGanttTasks (F3 AC-3)', () => {
  it('skip task tanpa deadline', () => {
    const tasks = [makeTask({ id: 't1', deadline: null })];
    expect(buildGanttTasks(tasks)).toEqual([]);
  });

  it('milestone untuk task dengan deadline tanpa estimated_hours', () => {
    const tasks = [makeTask({ id: 't1', deadline: '2026-05-15' })];
    const out = buildGanttTasks(tasks);
    expect(out).toHaveLength(1);
    expect(out[0]?.start).toBe('2026-05-15');
    expect(out[0]?.end).toBe('2026-05-15');
    expect(out[0]?.custom_class).toBe('bar-milestone');
  });

  it('bar untuk task dengan deadline + estimated_hours (derive start)', () => {
    const tasks = [
      makeTask({ id: 't1', deadline: '2026-05-15', estimated_hours: 16 }),
    ];
    const out = buildGanttTasks(tasks);
    expect(out[0]?.end).toBe('2026-05-15');
    // 16h / 8h-per-day = 2 days, jadi start = end - 2 + 1 = 14-05
    expect(out[0]?.start).toBe('2026-05-14');
    expect(out[0]?.custom_class).toBeUndefined();
  });

  it('use start_date over derived calc kalau ada', () => {
    const tasks = [
      makeTask({
        id: 't1',
        deadline: '2026-05-15',
        estimated_hours: 100,
        start_date: '2026-05-10',
      }),
    ];
    const out = buildGanttTasks(tasks);
    expect(out[0]?.start).toBe('2026-05-10');
    expect(out[0]?.end).toBe('2026-05-15');
  });

  it('progress 100 untuk status done', () => {
    const tasks = [
      makeTask({ id: 't1', deadline: '2026-05-15', status: 'done' }),
    ];
    expect(buildGanttTasks(tasks)[0]?.progress).toBe(100);
  });

  it('progress 0 untuk blocked', () => {
    const tasks = [
      makeTask({ id: 't1', deadline: '2026-05-15', status: 'blocked' }),
    ];
    expect(buildGanttTasks(tasks)[0]?.progress).toBe(0);
  });
});
