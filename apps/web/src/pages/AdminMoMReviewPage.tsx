/**
 * AdminMoMReviewPage — Sprint 5 Step 9.
 *
 * Route: /admin/mom-import/:id
 * Review queue dengan confidence-grouped display.
 * - HIGH items: auto-create checked by default
 * - MEDIUM/LOW: show candidates, admin pilih dropdown PIC user
 * - UNRESOLVED: text input "skip" atau manual user lookup
 *
 * Approve button → call approve_mom_import RPC + display tasks_created.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfidenceBadge } from '@/components/mom/ConfidenceBadge';
import {
  approveMoMImport,
  fetchMoMImportById,
  updateItemDecision,
  type MoMImportRow,
  type MoMItemRow,
} from '@/lib/momImport';

type Decision = 'create' | 'skip' | 'reject';

export function AdminMoMReviewPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [parent, setParent] = useState<MoMImportRow | null>(null);
  const [items, setItems] = useState<MoMItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [picOverrides, setPicOverrides] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { parent: p, items: i } = await fetchMoMImportById(id);
    setParent(p);
    setItems(i);
    // Default decisions: HIGH → create, others → skip until admin chooses
    const dec: Record<string, Decision> = {};
    const overr: Record<string, string | null> = {};
    for (const item of i) {
      if (item.decision) {
        dec[item.id] = item.decision as Decision;
      } else if (item.pic_confidence === 'HIGH') {
        dec[item.id] = 'create';
      } else {
        dec[item.id] = 'skip';
      }
      overr[item.id] = item.pic_resolved_user_id;
    }
    setDecisions(dec);
    setPicOverrides(overr);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  if (profile.role !== 'admin') return <Navigate to="/" replace />;

  async function handleApprove() {
    if (!id) return;
    setSubmitting(true);
    try {
      // Persist all decisions first
      for (const item of items) {
        const dec = decisions[item.id] ?? 'skip';
        const pic = picOverrides[item.id] ?? null;
        await updateItemDecision(item.id, dec, pic);
      }
      // Then commit approval
      const result = await approveMoMImport(id);
      showToast({
        tone: 'success',
        message: `${result.tasks_created} task ter-create dari ${result.items_processed} item.`,
      });
      await reload();
    } catch (e) {
      showToast({ tone: 'error', message: `Approve gagal: ${(e as Error).message}` });
    } finally {
      setSubmitting(false);
    }
  }

  function setItemDecision(itemId: string, dec: Decision) {
    setDecisions((prev) => ({ ...prev, [itemId]: dec }));
  }

  function setItemPic(itemId: string, userId: string) {
    setPicOverrides((prev) => ({ ...prev, [itemId]: userId || null }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat review...</p>
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="min-h-screen bg-canvas">
        <AppHeader />
        <main className="max-w-dashboard mx-auto px-6 py-8">
          <p className="text-sm text-destructive">MoM tidak ditemukan.</p>
        </main>
      </div>
    );
  }

  const summary = parent.parse_summary;
  const isApproved = parent.approval_status === 'approved';
  const groups = {
    HIGH: items.filter((i) => i.pic_confidence === 'HIGH'),
    MEDIUM: items.filter((i) => i.pic_confidence === 'MEDIUM'),
    LOW: items.filter((i) => i.pic_confidence === 'LOW'),
    UNRESOLVED: items.filter((i) => i.pic_confidence === 'UNRESOLVED'),
  };

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin/mom-import">← Balik ke Import MoM</Link>
          </Button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold">{parent.title || parent.file_name}</h2>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {parent.file_name} · {parent.mom_date ?? '—'}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan resolusi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <Stat label="Total" value={summary.total ?? 0} />
              <Stat label="HIGH" value={summary.high ?? 0} tone="success" />
              <Stat label="MEDIUM" value={summary.medium ?? 0} tone="warning" />
              <Stat label="LOW" value={summary.low ?? 0} tone="orange" />
              <Stat label="UNRESOLVED" value={summary.unresolved ?? 0} tone="danger" />
            </div>

            {!isApproved && (summary.high ?? 0) > 0 && (
              <div className="border-t pt-4">
                <Button
                  size="lg"
                  onClick={() => {
                    // Approve only HIGH-confidence items (auto-default decision)
                    const highOnly: Record<string, Decision> = {};
                    for (const item of items) {
                      if (item.pic_confidence === 'HIGH') {
                        highOnly[item.id] = 'create';
                      } else {
                        highOnly[item.id] = 'skip';
                      }
                    }
                    setDecisions(highOnly);
                    void handleApprove();
                  }}
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting
                    ? 'Memproses...'
                    : `Approve HIGH saja (${summary.high} item) — auto-buat tugas`}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Item MEDIUM, LOW, UNRESOLVED akan di-skip. Edit per item dulu kalau mau dimasukkan.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {(['HIGH', 'MEDIUM', 'LOW', 'UNRESOLVED'] as const).map((conf) =>
          groups[conf].length > 0 ? (
            <ItemGroup
              key={conf}
              confidence={conf}
              items={groups[conf]}
              decisions={decisions}
              picOverrides={picOverrides}
              onDecision={setItemDecision}
              onPicChange={setItemPic}
              disabled={isApproved}
            />
          ) : null,
        )}

        {!isApproved && (
          <div className="sticky bottom-4 flex justify-end">
            <Button onClick={() => void handleApprove()} disabled={submitting}>
              {submitting ? 'Memproses...' : 'Approve & buat tugas'}
            </Button>
          </div>
        )}

        {isApproved && (
          <div className="rounded-md border bg-emerald-50 p-4">
            <p className="text-sm font-medium text-emerald-800">
              ✅ Sudah ter-approve. Tugas yang dibuat bisa kamu lihat di halaman project.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

interface ItemGroupProps {
  confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';
  items: MoMItemRow[];
  decisions: Record<string, Decision>;
  picOverrides: Record<string, string | null>;
  onDecision: (id: string, dec: Decision) => void;
  onPicChange: (id: string, userId: string) => void;
  disabled: boolean;
}

function ItemGroup({
  confidence,
  items,
  decisions,
  picOverrides,
  onDecision,
  onPicChange,
  disabled,
}: ItemGroupProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ConfidenceBadge confidence={confidence} />
          <span>{items.length} item</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-md border p-3 space-y-2">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-medium text-sm leading-tight">
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {item.action_id}
                </span>
                {item.title}
              </p>
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-3 text-xs">
              <span>
                Raw PIC:{' '}
                <span className="font-mono">{item.raw_pic ?? '—'}</span>
              </span>
              {item.deadline && <span>Deadline: {item.deadline}</span>}
              {item.priority && <span>Priority: {item.priority}</span>}
              {item.project_name && <span>Project: {item.project_name}</span>}
            </div>

            {item.pic_candidates.length > 0 && confidence !== 'HIGH' && (
              <div>
                <p className="text-xs font-medium mb-1">Pilih PIC:</p>
                <select
                  disabled={disabled}
                  value={picOverrides[item.id] ?? ''}
                  onChange={(e) => onPicChange(item.id, e.target.value)}
                  className="w-full rounded-md border px-2 py-1 text-sm"
                >
                  <option value="">— Pilih atau biarkan unassigned —</option>
                  {item.pic_candidates.map((c) => (
                    <option key={c.user_id} value={c.user_id}>
                      {c.full_name} (distance {c.distance})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 text-xs">
              {(['create', 'skip', 'reject'] as const).map((dec) => (
                <label key={dec} className="inline-flex items-center gap-1">
                  <input
                    type="radio"
                    name={`dec-${item.id}`}
                    value={dec}
                    checked={decisions[item.id] === dec}
                    onChange={() => onDecision(item.id, dec)}
                    disabled={disabled}
                  />
                  {dec === 'create'
                    ? '✅ Create task'
                    : dec === 'skip'
                    ? '⏭️ Skip'
                    : '❌ Reject'}
                </label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'orange' | 'danger';
}) {
  const cls: Record<NonNullable<typeof tone>, string> = {
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    orange: 'text-orange-700',
    danger: 'text-red-700',
  };
  return (
    <div className="rounded-md border bg-surface p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ? cls[tone] : ''}`}>{value}</p>
    </div>
  );
}
