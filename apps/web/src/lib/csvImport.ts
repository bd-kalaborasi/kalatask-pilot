/**
 * CSV import client-side helpers (F15 Sprint 4 Step 8 — ADR-005).
 *
 * Pure functions: parse, validate, format. Tidak depend Supabase di sini.
 * Server-side bulk_import_tasks RPC = single source of truth untuk
 * authoritative validation. Client-side validation = UX preview only.
 */

export const REQUIRED_HEADERS = [
  'title',
  'project_name',
  'status',
  'priority',
] as const;

export const OPTIONAL_HEADERS = [
  'description',
  'assignee_email',
  'deadline',
  'estimated_hours',
] as const;

export const ALL_HEADERS = [
  ...REQUIRED_HEADERS,
  ...OPTIONAL_HEADERS,
] as const;

export const STATUS_VALUES = [
  'todo',
  'in_progress',
  'review',
  'done',
  'blocked',
] as const;
export const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const;

export type CsvRowStatus = 'valid' | 'warning' | 'error';

export interface CsvRow {
  title?: string | null;
  description?: string | null;
  assignee_email?: string | null;
  project_name?: string | null;
  status?: string | null;
  priority?: string | null;
  deadline?: string | null;
  estimated_hours?: string | null;
}

export interface CsvRowValidation {
  rowIndex: number;
  status: CsvRowStatus;
  issues: { field: string; message: string }[];
  data: CsvRow;
}

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (PRD §13)

export function validateRow(row: CsvRow, rowIndex: number): CsvRowValidation {
  const issues: { field: string; message: string }[] = [];

  const title = row.title?.trim() ?? '';
  const projectName = row.project_name?.trim() ?? '';
  const status = row.status?.trim() ?? 'todo';
  const priority = row.priority?.trim() ?? 'medium';
  const deadline = row.deadline?.trim() ?? '';
  const estimatedHours = row.estimated_hours?.trim() ?? '';

  if (!title) {
    issues.push({ field: 'title', message: 'wajib diisi' });
  }
  if (!projectName) {
    issues.push({ field: 'project_name', message: 'wajib diisi' });
  }
  if (status && !STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])) {
    issues.push({
      field: 'status',
      message: `"${status}" bukan status valid (todo|in_progress|review|done|blocked)`,
    });
  }
  if (priority && !PRIORITY_VALUES.includes(priority as (typeof PRIORITY_VALUES)[number])) {
    issues.push({
      field: 'priority',
      message: `"${priority}" bukan priority valid (low|medium|high|urgent)`,
    });
  }
  if (deadline) {
    const isIso = /^\d{4}-\d{2}-\d{2}$/.test(deadline);
    if (!isIso || Number.isNaN(new Date(deadline).getTime())) {
      issues.push({
        field: 'deadline',
        message: 'format YYYY-MM-DD',
      });
    }
  }
  if (estimatedHours) {
    const n = Number(estimatedHours);
    if (!Number.isInteger(n) || n <= 0) {
      issues.push({
        field: 'estimated_hours',
        message: 'integer positif',
      });
    }
  }

  const errorCount = issues.length;
  let resultStatus: CsvRowStatus = 'valid';

  if (errorCount > 0) {
    resultStatus = 'error';
  }

  // Warning kalau assignee_email diisi (server akan check FK lookup)
  // Client tidak punya users data, jadi mark as info-only di UI.
  // Server RPC = authoritative final status.

  return {
    rowIndex,
    status: resultStatus,
    issues,
    data: row,
  };
}

export function summarize(validations: CsvRowValidation[]) {
  return validations.reduce(
    (acc, v) => {
      acc.total += 1;
      acc[v.status] += 1;
      return acc;
    },
    { total: 0, valid: 0, warning: 0, error: 0 },
  );
}

export function rowsToImportPayload(rows: CsvRow[]): Record<string, unknown>[] {
  return rows.map((r) => ({
    title: r.title ?? null,
    description: r.description ?? null,
    assignee_email: r.assignee_email ?? null,
    project_name: r.project_name ?? null,
    status: r.status ?? null,
    priority: r.priority ?? null,
    deadline: r.deadline ?? null,
    estimated_hours: r.estimated_hours ?? null,
  }));
}

export function buildErrorReportCsv(
  rows: { row: number; status: string; issues: { field: string; message: string }[] }[],
): string {
  const headers = ['row', 'status', 'issues'];
  const lines = [headers.join(',')];
  for (const r of rows) {
    if (r.status === 'error') {
      const issuesStr = r.issues
        .map((i) => `${i.field}: ${i.message}`)
        .join('; ');
      lines.push(
        `${r.row},${r.status},"${issuesStr.replace(/"/g, '""')}"`,
      );
    }
  }
  return lines.join('\n');
}
