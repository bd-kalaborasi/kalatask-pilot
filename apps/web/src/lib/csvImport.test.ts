/**
 * csvImport client-side validation unit tests.
 */
import { describe, expect, it } from 'vitest';
import {
  buildErrorReportCsv,
  rowsToImportPayload,
  summarize,
  validateRow,
} from './csvImport';

describe('validateRow', () => {
  it('passes valid row', () => {
    const v = validateRow(
      {
        title: 'Task A',
        project_name: 'Demo',
        status: 'todo',
        priority: 'medium',
      },
      1,
    );
    expect(v.status).toBe('valid');
    expect(v.issues).toEqual([]);
  });

  it('errors on missing title', () => {
    const v = validateRow({ project_name: 'X' }, 2);
    expect(v.status).toBe('error');
    expect(v.issues.some((i) => i.field === 'title')).toBe(true);
  });

  it('errors on invalid status enum', () => {
    const v = validateRow(
      {
        title: 'A',
        project_name: 'X',
        status: 'invalid',
        priority: 'medium',
      },
      3,
    );
    expect(v.issues.some((i) => i.field === 'status')).toBe(true);
  });

  it('errors on invalid priority enum', () => {
    const v = validateRow(
      {
        title: 'A',
        project_name: 'X',
        status: 'todo',
        priority: 'super-mega',
      },
      4,
    );
    expect(v.issues.some((i) => i.field === 'priority')).toBe(true);
  });

  it('errors on bad deadline format', () => {
    const v = validateRow(
      {
        title: 'A',
        project_name: 'X',
        status: 'todo',
        priority: 'medium',
        deadline: '2026/12/01',
      },
      5,
    );
    expect(v.issues.some((i) => i.field === 'deadline')).toBe(true);
  });

  it('errors on non-positive estimated_hours', () => {
    const v = validateRow(
      {
        title: 'A',
        project_name: 'X',
        status: 'todo',
        priority: 'medium',
        estimated_hours: '-3',
      },
      6,
    );
    expect(v.issues.some((i) => i.field === 'estimated_hours')).toBe(true);
  });

  it('passes empty optional fields', () => {
    const v = validateRow(
      {
        title: 'A',
        project_name: 'X',
        status: 'todo',
        priority: 'medium',
        description: '',
        deadline: '',
        estimated_hours: '',
      },
      7,
    );
    expect(v.status).toBe('valid');
  });
});

describe('summarize', () => {
  it('counts validations by status', () => {
    const result = summarize([
      { rowIndex: 1, status: 'valid', issues: [], data: {} },
      { rowIndex: 2, status: 'error', issues: [], data: {} },
      { rowIndex: 3, status: 'warning', issues: [], data: {} },
      { rowIndex: 4, status: 'valid', issues: [], data: {} },
    ]);
    expect(result).toEqual({ total: 4, valid: 2, warning: 1, error: 1 });
  });
});

describe('rowsToImportPayload', () => {
  it('normalizes empty fields to null', () => {
    const out = rowsToImportPayload([
      { title: 'A', project_name: 'X' },
    ]);
    expect(out[0]).toMatchObject({
      title: 'A',
      project_name: 'X',
      description: null,
      deadline: null,
    });
  });
});

describe('buildErrorReportCsv', () => {
  it('outputs only error rows', () => {
    const csv = buildErrorReportCsv([
      { row: 1, status: 'valid', issues: [] },
      {
        row: 2,
        status: 'error',
        issues: [{ field: 'title', message: 'wajib' }],
      },
    ]);
    expect(csv).toContain('2,error');
    expect(csv).not.toContain('1,valid');
    expect(csv).toContain('title: wajib');
  });

  it('escapes embedded quotes', () => {
    const csv = buildErrorReportCsv([
      {
        row: 3,
        status: 'error',
        issues: [{ field: 'x', message: 'has "quotes" in it' }],
      },
    ]);
    expect(csv).toContain('""quotes""');
  });
});
