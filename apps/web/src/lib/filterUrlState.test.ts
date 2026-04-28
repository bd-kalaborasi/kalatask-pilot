import { describe, expect, it } from 'vitest';
import {
  readProjectsFilterFromUrl,
  writeProjectsFilterToUrl,
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
