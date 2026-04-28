import { describe, expect, it } from 'vitest';
import {
  readGroupByFromUrl,
  readProjectsFilterFromUrl,
  readTasksFilterFromUrl,
  readViewFromUrl,
  writeGroupByToUrl,
  writeProjectsFilterToUrl,
  writeTasksFilterToUrl,
  writeViewToUrl,
} from './filterUrlState';

describe('readProjectsFilterFromUrl', () => {
  it('returns empty filter saat URL bersih', () => {
    const params = new URLSearchParams('');
    expect(readProjectsFilterFromUrl(params)).toEqual({
      statuses: [],
      teamId: '',
    });
  });

  it('parse single status', () => {
    const params = new URLSearchParams('f.status=active');
    expect(readProjectsFilterFromUrl(params).statuses).toEqual(['active']);
  });

  it('parse multi status (comma separated)', () => {
    const params = new URLSearchParams('f.status=planning,active,on_hold');
    expect(readProjectsFilterFromUrl(params).statuses).toEqual([
      'planning',
      'active',
      'on_hold',
    ]);
  });

  it('reject invalid status enum (defensive)', () => {
    const params = new URLSearchParams('f.status=hacker,active');
    expect(readProjectsFilterFromUrl(params).statuses).toEqual(['active']);
  });

  it('parse team id', () => {
    const params = new URLSearchParams(
      'f.team=00000000-0000-0000-0000-00000000aaaa',
    );
    expect(readProjectsFilterFromUrl(params).teamId).toBe(
      '00000000-0000-0000-0000-00000000aaaa',
    );
  });
});

describe('writeProjectsFilterToUrl', () => {
  it('skip empty filter', () => {
    const next = writeProjectsFilterToUrl(
      { statuses: [], teamId: '' },
      new URLSearchParams(''),
    );
    expect(next.toString()).toBe('');
  });

  it('write single status', () => {
    const next = writeProjectsFilterToUrl(
      { statuses: ['active'], teamId: '' },
      new URLSearchParams(''),
    );
    expect(next.get('f.status')).toBe('active');
  });

  it('write multi status', () => {
    const next = writeProjectsFilterToUrl(
      { statuses: ['planning', 'active'], teamId: '' },
      new URLSearchParams(''),
    );
    expect(next.get('f.status')).toBe('planning,active');
  });

  it('preserve unrelated params', () => {
    const initial = new URLSearchParams('view=kanban&page=2');
    const next = writeProjectsFilterToUrl(
      { statuses: ['active'], teamId: '' },
      initial,
    );
    expect(next.get('view')).toBe('kanban');
    expect(next.get('page')).toBe('2');
    expect(next.get('f.status')).toBe('active');
  });

  it('roundtrip read → write → read preserves filter', () => {
    const original = {
      statuses: ['planning', 'completed'] as const,
      teamId: '00000000-0000-0000-0000-00000000aaaa',
    };
    const written = writeProjectsFilterToUrl(
      { statuses: [...original.statuses], teamId: original.teamId },
      new URLSearchParams(''),
    );
    const reparsed = readProjectsFilterFromUrl(written);
    expect(reparsed.statuses).toEqual(original.statuses);
    expect(reparsed.teamId).toBe(original.teamId);
  });
});

// ============================================================
// Tasks filter URL state (Step 7)
// ============================================================
describe('readTasksFilterFromUrl', () => {
  it('empty saat URL bersih', () => {
    expect(readTasksFilterFromUrl(new URLSearchParams(''))).toEqual({
      statuses: [],
      priorities: [],
      assigneeId: '',
    });
  });

  it('parse tasks status + priority + assignee', () => {
    const params = new URLSearchParams(
      'f.tstatus=todo,blocked&f.tprio=urgent&f.tassignee=u1',
    );
    expect(readTasksFilterFromUrl(params)).toEqual({
      statuses: ['todo', 'blocked'],
      priorities: ['urgent'],
      assigneeId: 'u1',
    });
  });

  it('reject invalid task status enum', () => {
    const params = new URLSearchParams('f.tstatus=hacker,todo');
    expect(readTasksFilterFromUrl(params).statuses).toEqual(['todo']);
  });
});

describe('writeTasksFilterToUrl', () => {
  it('write tasks filter dan preserve unrelated params', () => {
    const next = writeTasksFilterToUrl(
      { statuses: ['done'], priorities: ['high'], assigneeId: 'u1' },
      new URLSearchParams('view=kanban'),
    );
    expect(next.get('view')).toBe('kanban');
    expect(next.get('f.tstatus')).toBe('done');
    expect(next.get('f.tprio')).toBe('high');
    expect(next.get('f.tassignee')).toBe('u1');
  });
});

describe('view + groupBy URL state', () => {
  it('readViewFromUrl default fallback "list"', () => {
    expect(readViewFromUrl(new URLSearchParams(''))).toBe('list');
  });

  it('readViewFromUrl parse valid value', () => {
    expect(readViewFromUrl(new URLSearchParams('view=kanban'))).toBe('kanban');
    expect(readViewFromUrl(new URLSearchParams('view=gantt'))).toBe('gantt');
  });

  it('readViewFromUrl reject invalid value', () => {
    expect(readViewFromUrl(new URLSearchParams('view=hacker'))).toBe('list');
  });

  it('writeViewToUrl skip param untuk default "list"', () => {
    const out = writeViewToUrl('list', new URLSearchParams('view=kanban'));
    expect(out.has('view')).toBe(false);
  });

  it('writeViewToUrl set non-default value', () => {
    const out = writeViewToUrl('gantt', new URLSearchParams(''));
    expect(out.get('view')).toBe('gantt');
  });

  it('readGroupByFromUrl default "none"', () => {
    expect(readGroupByFromUrl(new URLSearchParams(''))).toBe('none');
  });

  it('writeGroupByToUrl skip param untuk default "none"', () => {
    const out = writeGroupByToUrl(
      'none',
      new URLSearchParams('group=status'),
    );
    expect(out.has('group')).toBe(false);
  });

  it('writeGroupByToUrl set non-default value', () => {
    const out = writeGroupByToUrl('priority', new URLSearchParams(''));
    expect(out.get('group')).toBe('priority');
  });

  it('roundtrip view + groupBy + filter compose tanpa clash', () => {
    let params = new URLSearchParams('');
    params = writeViewToUrl('kanban', params);
    params = writeGroupByToUrl('status', params);
    params = writeTasksFilterToUrl(
      { statuses: ['blocked'], priorities: [], assigneeId: '' },
      params,
    );
    expect(readViewFromUrl(params)).toBe('kanban');
    expect(readGroupByFromUrl(params)).toBe('status');
    expect(readTasksFilterFromUrl(params).statuses).toEqual(['blocked']);
  });
});
