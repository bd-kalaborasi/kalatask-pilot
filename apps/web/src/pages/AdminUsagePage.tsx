/**
 * AdminUsagePage — Sprint 5 Step 10 (F16).
 *
 * Route: /admin/usage
 * 3 progress bar (DB / Storage / MAU) dengan threshold visual:
 *   - < 70% green
 *   - 70-90% kuning
 *   - >= 90% merah
 * Top 5 tables breakdown.
 * Refresh button refetch.
 *
 * Storage size deferred per Sprint 5 plan Q5 (PostgREST limited).
 */
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

interface UsageSummary {
  database: { size_mb: number; limit_mb: number; utilization_pct: number };
  storage: { size_mb: number | null; limit_mb: number; utilization_pct: number | null; note?: string };
  mau_current_month: number | null;
  mau_limit: number;
  top_tables: { table: string; size_mb: number }[];
  alerts: { level: 'warning' | 'critical'; message: string }[];
  captured_at: string;
}

export function AdminUsagePage() {
  const { profile, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_usage_summary');
    if (error) {
      showToast({ tone: 'error', message: `Gagal load usage: ${error.message}` });
      setLoading(false);
      return;
    }
    setSummary(data as UsageSummary);
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    if (profile?.role === 'admin') void refresh();
  }, [profile, refresh]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }
  if (profile.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Usage Monitoring</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Konsumsi resource Supabase free tier — DB, Storage, MAU.
            </p>
          </div>
          <Button onClick={() => void refresh()} disabled={loading} variant="outline">
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </Button>
        </div>

        {summary && (
          <>
            {summary.alerts.length > 0 && (
              <div className="space-y-2">
                {summary.alerts.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-md border p-3 ${
                      a.level === 'critical'
                        ? 'border-red-300 bg-red-50 text-red-900'
                        : 'border-amber-300 bg-amber-50 text-amber-900'
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {a.level === 'critical' ? '🚨' : '⚠️'} {a.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <UsageCard
                label="Database"
                current={summary.database.size_mb}
                limit={summary.database.limit_mb}
                pct={summary.database.utilization_pct}
                unit="MB"
              />
              <UsageCard
                label="Storage"
                current={summary.storage.size_mb}
                limit={summary.storage.limit_mb}
                pct={summary.storage.utilization_pct}
                unit="MB"
                note={summary.storage.note}
              />
              <UsageCard
                label="MAU (30 hari)"
                current={summary.mau_current_month}
                limit={summary.mau_limit}
                pct={
                  summary.mau_current_month !== null
                    ? Math.round((summary.mau_current_month / summary.mau_limit) * 1000) / 10
                    : null
                }
                unit="user"
              />
            </div>

            {summary.top_tables && summary.top_tables.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top tabel terbesar</CardTitle>
                  <CardDescription>5 tabel teratas berdasarkan ukuran storage.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {summary.top_tables.slice(0, 5).map((t) => (
                      <li
                        key={t.table}
                        className="flex items-baseline justify-between border-b pb-1 last:border-0"
                      >
                        <span className="font-mono text-sm">{t.table}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {t.size_mb} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <p className="text-xs text-muted-foreground font-mono">
              Captured at: {new Date(summary.captured_at).toLocaleString('id-ID')}
            </p>
          </>
        )}
      </main>
    </div>
  );
}

interface UsageCardProps {
  label: string;
  current: number | null;
  limit: number;
  pct: number | null;
  unit: string;
  note?: string;
}

function UsageCard({ label, current, limit, pct, unit, note }: UsageCardProps) {
  const tone = pct === null ? 'muted' : pct >= 90 ? 'critical' : pct >= 70 ? 'warning' : 'normal';

  const barColor: Record<typeof tone, string> = {
    normal: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-red-500',
    muted: 'bg-zinc-300',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {current === null && note ? (
          // Friendly placeholder for unavailable metric (Sprint 6 polish)
          <div className="space-y-2">
            <p className="text-base font-medium text-zinc-700">Segera tersedia</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{note}</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-2xl font-semibold font-mono">
              {current ?? '—'} <span className="text-sm font-normal text-muted-foreground">/ {limit} {unit}</span>
            </p>
            <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
              <div
                className={`h-full ${barColor[tone]} transition-all`}
                style={{ width: `${Math.min(100, pct ?? 0)}%` }}
              />
            </div>
            <p
              className={`text-xs font-mono ${
                tone === 'critical' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-zinc-600'
              }`}
            >
              {pct !== null ? `${pct}%` : '—'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
