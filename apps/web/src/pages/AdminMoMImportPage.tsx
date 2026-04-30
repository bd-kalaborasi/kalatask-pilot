/**
 * AdminMoMImportPage — Sprint 5 Step 8.
 *
 * Route: /admin/mom-import
 * - List previous imports + status badge
 * - Upload section: drag-drop .md file (max 5MB), parse client-side via
 *   parseMoM, send to process_mom_upload RPC
 * - Navigate ke /admin/mom-import/:id setelah upload
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  fetchMoMImports,
  parseMoM,
  uploadMoM,
  type MoMImportRow,
} from '@/lib/momImport';
import { formatDateID } from '@/lib/formatDate';

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const APPROVAL_LABEL: Record<string, string> = {
  pending_review: '🔍 Butuh Review',
  auto_approved: '✅ Auto-Approved',
  approved: '✅ Approved',
  rejected: '❌ Rejected',
};

const APPROVAL_STYLE: Record<string, string> = {
  pending_review: 'bg-feedback-warning-bg text-feedback-warning',
  auto_approved:  'bg-feedback-success-bg text-feedback-success',
  approved:       'bg-feedback-success-bg text-feedback-success',
  rejected:       'bg-feedback-danger-bg text-feedback-danger',
};

export function AdminMoMImportPage() {
  const { profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [imports, setImports] = useState<MoMImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadImports = useCallback(async () => {
    setLoading(true);
    const list = await fetchMoMImports();
    setImports(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadImports();
  }, [loadImports]);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_BYTES) {
        showToast({ tone: 'error', message: 'File terlalu besar — max 5 MB.' });
        return;
      }
      if (!file.name.toLowerCase().endsWith('.md')) {
        showToast({ tone: 'error', message: 'Format file harus .md (Markdown).' });
        return;
      }

      setUploading(true);
      try {
        const text = await file.text();
        const parsed = parseMoM(text);

        if (parsed.actions.length === 0) {
          showToast({
            tone: 'error',
            message: 'MoM tidak punya ACTION items. Cek format Plaud Template v2.',
          });
          setUploading(false);
          return;
        }

        const importId = await uploadMoM({
          file_name: file.name,
          raw_markdown: text,
          parsed,
        });

        if (!importId) {
          showToast({ tone: 'error', message: 'Upload gagal — tidak ada ID returned.' });
          setUploading(false);
          return;
        }

        showToast({
          tone: 'success',
          message: `${parsed.actions.length} action items diparsing. Buka review queue.`,
        });
        navigate(`/admin/mom-import/${importId}`);
      } catch (e) {
        showToast({
          tone: 'error',
          message: `Upload gagal: ${(e as Error).message}`,
        });
      } finally {
        setUploading(false);
      }
    },
    [navigate, showToast],
  );

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  if (profile.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="font-display text-headline-md text-on-surface">
            Import Notulensi (MoM)
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Convert action items rapat jadi tugas otomatis — upload <strong>.md</strong> hasil
            Plaud Template v2, sistem parse PIC + deadline, kamu review &amp; approve sebelum jadi tugas.
          </p>
          <p className="text-body-sm text-on-surface-variant/80">
            <strong>Beda dengan Import Tugas (CSV)?</strong> CSV untuk bulk-create tugas terencana
            dari spreadsheet (langsung jadi tugas). MoM untuk konversi rapat ad-hoc (review queue dulu).
          </p>
        </header>

        <section className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden">
          <header className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
            <h2 className="font-display text-title-md font-bold text-on-surface">
              1. Upload MoM file
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">
              Format Plaud Template v2 (.md). Maksimal 5 MB. Drop file atau klik untuk pilih.
            </p>
          </header>
          <div className="p-6">
            <label
              className={`block rounded-kt-lg border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-primary-container bg-primary-container/5' : 'border-outline-variant hover:border-primary-container/60'
              } ${uploading ? 'opacity-50 cursor-wait' : ''}`}
              onDragEnter={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFile(file);
              }}
            >
              <input
                type="file"
                accept=".md,text/markdown"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="hidden"
              />
              {uploading ? (
                <p className="text-body-md text-on-surface-variant">⏳ Parsing & uploading...</p>
              ) : (
                <>
                  <div className="text-4xl mb-2" aria-hidden="true">📤</div>
                  <p className="text-label-lg font-semibold text-on-surface">
                    Tarik file ke sini atau klik untuk pilih
                  </p>
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    .md (Plaud Template v2), max 5 MB
                  </p>
                </>
              )}
            </label>
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden">
          <header className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
            <h2 className="font-display text-title-md font-bold text-on-surface">
              2. Riwayat Import
            </h2>
            <p className="text-body-sm text-on-surface-variant mt-1">50 import terakhir.</p>
          </header>
          <div className="p-6">
            {loading && <p className="text-body-md text-on-surface-variant">Memuat...</p>}

            {!loading && imports.length === 0 && (
              <EmptyState
                compact
                icon="📄"
                title="Belum ada MoM ter-import"
                body="Upload MoM pertama kamu di kotak atas. Setelah parsing, kamu bisa review dan approve."
              />
            )}

            {!loading && imports.length > 0 && (
              <div className="overflow-x-auto rounded-kt-md border border-outline-variant">
                <table className="min-w-full text-body-md">
                  <thead className="bg-surface-container-low text-left text-label-md uppercase tracking-wide text-on-surface-variant">
                    <tr>
                      <th className="px-3 py-2">Tanggal MoM</th>
                      <th className="px-3 py-2">File</th>
                      <th className="px-3 py-2">Total / HIGH / MEDIUM / LOW / UNRESOLVED</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {imports.map((m) => {
                      const s = m.parse_summary || {};
                      return (
                        <tr key={m.id}>
                          <td className="px-3 py-2 font-mono text-xs">
                            {m.mom_date ? formatDateID(m.mom_date) : '—'}
                          </td>
                          <td className="px-3 py-2 max-w-xs truncate" title={m.file_name}>
                            {m.file_name}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {s.total ?? 0} / {s.high ?? 0} / {s.medium ?? 0} / {s.low ?? 0} / {s.unresolved ?? 0}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${APPROVAL_STYLE[m.approval_status] ?? ''}`}
                            >
                              {APPROVAL_LABEL[m.approval_status] ?? m.approval_status}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              to={`/admin/mom-import/${m.id}`}
                              className="text-label-md font-semibold text-primary-container hover:underline underline-offset-4"
                            >
                              Buka →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
