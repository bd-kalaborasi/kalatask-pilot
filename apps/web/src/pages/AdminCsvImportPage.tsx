/**
 * AdminCsvImportPage — F15 admin-only CSV import (Sprint 4 Step 8 + 9).
 *
 * Flow per ADR-005:
 *   1. Upload .csv (max 5MB)
 *   2. papaparse parse di browser
 *   3. Client-side validation preview (10 row sample)
 *   4. Commit → bulk_import_tasks RPC dry_run=false
 *   5. Server response summary + per-row result
 *   6. Error report download
 *
 * Permission: admin only — Member/Manager/Viewer redirect ke "/".
 * Bundle: papaparse lazy-loaded via dynamic import to keep initial
 * bundle clean.
 */
import { useCallback, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  ALL_HEADERS,
  MAX_FILE_SIZE_BYTES,
  buildErrorReportCsv,
  rowsToImportPayload,
  summarize,
  validateRow,
  type CsvRow,
  type CsvRowValidation,
} from '@/lib/csvImport';

type Phase = 'idle' | 'parsing' | 'preview' | 'submitting' | 'done';

interface ServerSummary {
  total: number;
  valid: number;
  warning: number;
  error: number;
  imported: number;
}

interface ServerRowResult {
  row: number;
  status: string;
  issues: { field: string; message: string }[];
  task_id: string | null;
}

interface ServerResponse {
  dry_run: boolean;
  summary: ServerSummary;
  rows: ServerRowResult[];
}

export function AdminCsvImportPage() {
  const { profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [phase, setPhase] = useState<Phase>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [validations, setValidations] = useState<CsvRowValidation[]>([]);
  const [serverResponse, setServerResponse] = useState<ServerResponse | null>(
    null,
  );

  const summary = useMemo(() => summarize(validations), [validations]);
  const hasErrors = summary.error > 0;

  const handleFile = useCallback(
    async (file: File) => {
      setParseError(null);
      setServerResponse(null);
      setFileName(file.name);

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setParseError('File terlalu besar. Maksimal 5 MB.');
        setPhase('idle');
        return;
      }
      if (!file.name.toLowerCase().endsWith('.csv')) {
        setParseError('Format file harus .csv');
        setPhase('idle');
        return;
      }

      setPhase('parsing');
      try {
        // Lazy-load papaparse
        const Papa = (await import('papaparse')).default;
        Papa.parse<CsvRow>(file, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (result) => {
            const parsedRows = result.data;
            const validated = parsedRows.map((r, i) => validateRow(r, i + 1));
            setRows(parsedRows);
            setValidations(validated);
            setPhase('preview');
          },
          error: (err) => {
            setParseError(`Gagal parse CSV: ${err.message}`);
            setPhase('idle');
          },
        });
      } catch (e) {
        setParseError(`Gagal load parser: ${(e as Error).message}`);
        setPhase('idle');
      }
    },
    [],
  );

  const handleCommit = useCallback(async () => {
    if (rows.length === 0) return;
    setPhase('submitting');
    try {
      const payload = rowsToImportPayload(rows);
      const { data, error } = await supabase.rpc('bulk_import_tasks', {
        p_rows: payload,
        p_dry_run: false,
      });

      if (error) {
        showToast({
          tone: 'error',
          message: `Import gagal: ${error.message}`,
        });
        setPhase('preview');
        return;
      }

      const response = data as ServerResponse;
      setServerResponse(response);
      setPhase('done');
      const tone =
        response.summary.error > 0 || response.summary.warning > 0
          ? 'warning'
          : 'success';
      showToast({
        tone,
        message: `${response.summary.imported} task ter-import · ${response.summary.warning} warning · ${response.summary.error} error`,
      });
    } catch (e) {
      showToast({
        tone: 'error',
        message: `Import gagal: ${(e as Error).message}`,
      });
      setPhase('preview');
    }
  }, [rows, showToast]);

  const handleDownloadErrors = useCallback(() => {
    if (!serverResponse) return;
    const csv = buildErrorReportCsv(serverResponse.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csv-import-errors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [serverResponse]);

  const handleReset = useCallback(() => {
    setRows([]);
    setValidations([]);
    setServerResponse(null);
    setFileName(null);
    setParseError(null);
    setPhase('idle');
  }, []);

  // Profile loads async setelah session — wait sampai resolve sebelum
  // redirect (avoid false-positive redirect saat profile masih null).
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const previewRows = validations.slice(0, 10);

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <h2 className="text-headline font-semibold">Import Tugas (CSV)</h2>
          <p className="text-sm text-muted-foreground">
            Bulk-create tugas dari spreadsheet — upload <strong>.csv</strong> dengan kolom standard,
            sistem validate per row, kamu konfirmasi sebelum import. Maksimal 5 MB.
          </p>
          <p className="text-xs text-muted-foreground">
            <strong>Beda dengan Import Notulensi (MoM)?</strong> CSV untuk bulk planned tasks
            (langsung jadi tugas). MoM untuk konversi rapat ke action items (review queue dulu).
          </p>
          <p className="text-xs text-muted-foreground">
            Header wajib: <code className="text-xs">{ALL_HEADERS.join(', ')}</code>
          </p>
        </div>

        {phase === 'idle' && (
          <Card>
            <CardHeader>
              <CardTitle>1. Pilih file CSV</CardTitle>
              <CardDescription>
                Drag-drop atau klik tombol untuk upload.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-deep file:text-white hover:file:bg-brand-deep/90"
                style={{
                  // ensure file button uses brand color
                }}
              />
              {parseError && (
                <p className="mt-3 text-sm text-destructive">{parseError}</p>
              )}
            </CardContent>
          </Card>
        )}

        {phase === 'parsing' && (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-center text-muted-foreground">
                Parsing CSV... ⏳
              </p>
            </CardContent>
          </Card>
        )}

        {phase === 'preview' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>2. Preview validation</CardTitle>
                <CardDescription>
                  {fileName ? `File: ${fileName} · ` : ''}
                  {summary.total} total · {summary.valid} valid ·{' '}
                  {summary.warning} warning · {summary.error} error
                </CardDescription>
              </CardHeader>
              <CardContent>
                {validations.length === 0 ? (
                  <EmptyState
                    compact
                    icon="📄"
                    title="CSV kosong"
                    body="File ter-parse tapi tidak ada baris data. Cek header atau isi file."
                  />
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <table className="min-w-full text-sm">
                      <thead className="bg-surface-container text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2">#</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Project</th>
                          <th className="px-3 py-2">Issues</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {previewRows.map((v) => (
                          <tr key={v.rowIndex}>
                            <td className="px-3 py-2 font-mono text-xs">
                              {v.rowIndex}
                            </td>
                            <td className="px-3 py-2">
                              <StatusIcon status={v.status} />
                            </td>
                            <td className="px-3 py-2">
                              {v.data.title ?? <em className="text-muted-foreground/70">—</em>}
                            </td>
                            <td className="px-3 py-2">
                              {v.data.project_name ?? <em className="text-muted-foreground/70">—</em>}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {v.issues.length === 0
                                ? '—'
                                : v.issues
                                    .map((i) => `${i.field}: ${i.message}`)
                                    .join('; ')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {validations.length > 10 && (
                      <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                        Menampilkan 10 baris pertama. Total {validations.length} baris akan diproses saat commit.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => void handleCommit()}
                disabled={hasErrors || validations.length === 0}
              >
                {hasErrors
                  ? 'Fix error dulu untuk commit'
                  : `Commit ${summary.valid + summary.warning} task`}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Batal · Upload file lain
              </Button>
            </div>
          </>
        )}

        {phase === 'submitting' && (
          <Card>
            <CardContent className="py-8">
              <p className="text-sm text-center text-muted-foreground">
                Mengirim ke server... ⏳
              </p>
            </CardContent>
          </Card>
        )}

        {phase === 'done' && serverResponse && (
          <Card>
            <CardHeader>
              <CardTitle>3. Hasil import</CardTitle>
              <CardDescription>
                {serverResponse.summary.imported} task berhasil di-import dari{' '}
                {serverResponse.summary.total} baris.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <Stat label="Total" value={serverResponse.summary.total} />
                <Stat label="Imported" value={serverResponse.summary.imported} tone="success" />
                <Stat label="Valid" value={serverResponse.summary.valid} />
                <Stat label="Warning" value={serverResponse.summary.warning} tone="warning" />
                <Stat label="Error" value={serverResponse.summary.error} tone="danger" />
              </div>
              <div className="flex flex-wrap gap-3">
                {serverResponse.summary.error > 0 && (
                  <Button variant="outline" onClick={handleDownloadErrors}>
                    Download error report (CSV)
                  </Button>
                )}
                <Button onClick={handleReset}>Import file lain</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const map: Record<string, { emoji: string; color: string }> = {
    valid:   { emoji: '✅', color: 'text-feedback-success' },
    warning: { emoji: '⚠️', color: 'text-feedback-warning' },
    error:   { emoji: '❌', color: 'text-feedback-danger' },
  };
  const m = map[status] ?? map.valid;
  return (
    <span className={`inline-flex items-center gap-1 ${m.color}`}>
      <span aria-hidden="true">{m.emoji}</span>
      <span className="text-xs font-medium uppercase">{status}</span>
    </span>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const toneClass: Record<NonNullable<typeof tone>, string> = {
    success: 'text-feedback-success',
    warning: 'text-feedback-warning',
    danger:  'text-feedback-danger',
  };
  return (
    <div className="rounded-md border bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-2xl font-semibold ${tone ? toneClass[tone] : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
