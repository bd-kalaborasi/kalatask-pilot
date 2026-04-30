/**
 * AdminUsagePage — F16 Usage Monitoring (Sprint 5 Step 10).
 *
 * Sprint 6 patch: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/08-admin-usage.html "Monitoring Penggunaan").
 *
 * Layout:
 * - AppHeader (existing horizontal)
 * - Page header: title + last-updated text + Refresh button (right)
 * - Health Banner (left-border accent, severity-tinted)
 * - 3 metric cards (DB / Storage / MAU) with progress bar + threshold pill
 * - 2-col split: Top tables (with mini progress bars), Alerts panel (empty-state friendly)
 * - Optimization tips callout (primary-container surface, 4-tip 2-col grid)
 *
 * Permission: admin only. Storage size deferred (PostgREST limit).
 */
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface UsageSummary {
  database: { size_mb: number; limit_mb: number; utilization_pct: number };
  storage: {
    size_mb: number | null;
    limit_mb: number;
    utilization_pct: number | null;
    note?: string;
  };
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

  const overallHealth = computeOverallHealth(summary);
  const lastUpdated = summary
    ? new Date(summary.captured_at).toLocaleString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'short',
      })
    : null;

  // Top tables: compute relative width vs largest entry
  const maxTableSize = summary && summary.top_tables.length > 0
    ? Math.max(...summary.top_tables.map((t) => t.size_mb))
    : 1;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        {/* Page header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">
              Monitoring Penggunaan
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Konsumsi resource Supabase free tier — DB, Storage, MAU.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-body-sm text-on-surface-variant font-medium">
                Terakhir: {lastUpdated}
              </span>
            )}
            <Button
              variant="outline"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? 'Refreshing…' : '↻ Segarkan'}
            </Button>
          </div>
        </header>

        {/* Health banner (overall summary) */}
        {summary && overallHealth && (
          <div
            className={`rounded-kt-md border-l-4 px-4 py-3 ${HEALTH_BANNER_CLASS[overallHealth.tone]}`}
            role="status"
            aria-live="polite"
            data-testid="usage-health-banner"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none" aria-hidden="true">
                {HEALTH_ICON[overallHealth.tone]}
              </span>
              <div className="flex-1">
                <p className="text-body-md font-semibold">{overallHealth.headline}</p>
                <p className="text-body-sm mt-0.5 opacity-80">{overallHealth.detail}</p>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <>
            {/* 3-metric strip */}
            <section
              aria-label="Metric utilization"
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              <UsageMetricCard
                label="Database"
                current={summary.database.size_mb}
                limit={summary.database.limit_mb}
                pct={summary.database.utilization_pct}
                unit="MB"
              />
              <UsageMetricCard
                label="Penyimpanan"
                current={summary.storage.size_mb}
                limit={summary.storage.limit_mb}
                pct={summary.storage.utilization_pct}
                unit="MB"
                note={summary.storage.note}
              />
              <UsageMetricCard
                label="MAU (30 hari)"
                current={summary.mau_current_month}
                limit={summary.mau_limit}
                pct={
                  summary.mau_current_month !== null
                    ? Math.round(
                        (summary.mau_current_month / summary.mau_limit) * 1000,
                      ) / 10
                    : null
                }
                unit="user"
              />
            </section>

            {/* 2-col: Top tables + Alerts panel */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Top tables */}
              <div className="bg-surface-container-lowest rounded-kt-lg border border-outline-variant shadow-brand-sm overflow-hidden">
                <header className="p-5 border-b border-outline-variant flex justify-between items-center">
                  <h2 className="text-title-md font-bold text-on-surface flex items-center gap-2">
                    <span aria-hidden="true">▤</span>
                    Top tabel terbesar
                  </h2>
                  <span className="text-label-md font-bold text-primary-container bg-primary-container/10 px-2 py-1 rounded-kt-sm">
                    {summary.top_tables.length} TOTAL
                  </span>
                </header>
                <div className="p-5 space-y-4">
                  {summary.top_tables.length === 0 ? (
                    <p className="text-body-md text-on-surface-variant">
                      Belum ada data ukuran tabel.
                    </p>
                  ) : (
                    summary.top_tables.slice(0, 5).map((t, i) => (
                      <div key={t.table} className="space-y-1">
                        <div className="flex justify-between text-body-sm">
                          <code className="text-primary-container font-semibold">{t.table}</code>
                          <span className="font-bold text-on-surface tabular-nums">
                            {t.size_mb} MB
                          </span>
                        </div>
                        <div className="w-full bg-surface-container-low h-1.5 rounded-full overflow-hidden">
                          <div
                            className={
                              i === 0
                                ? 'bg-primary-container h-full rounded-full'
                                : 'bg-primary-container/60 h-full rounded-full'
                            }
                            style={{
                              width: `${Math.max(4, (t.size_mb / maxTableSize) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Alerts panel */}
              <div className="bg-surface-container-lowest rounded-kt-lg border border-outline-variant shadow-brand-sm flex flex-col">
                <header className="p-5 border-b border-outline-variant">
                  <h2 className="text-title-md font-bold text-on-surface">Alerts aktif</h2>
                </header>
                {summary.alerts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div
                      className="w-20 h-20 bg-feedback-success-bg rounded-full flex items-center justify-center text-feedback-success text-4xl"
                      aria-hidden="true"
                    >
                      ✓
                    </div>
                    <div>
                      <h3 className="text-title-sm font-bold text-on-surface">
                        Semua resource sehat
                      </h3>
                      <p className="text-body-md text-on-surface-variant mt-1">
                        Belum ada peringatan kritis saat ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 space-y-3">
                    {summary.alerts.map((a, i) => (
                      <div
                        key={i}
                        className={`rounded-kt-md border p-3 ${
                          a.level === 'critical'
                            ? 'border-feedback-danger-border bg-feedback-danger-bg text-feedback-danger'
                            : 'border-feedback-warning-border bg-feedback-warning-bg text-feedback-warning'
                        }`}
                      >
                        <p className="text-body-md font-medium">
                          {a.level === 'critical' ? '🚨' : '⚠️'} {a.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Optimization Tips callout */}
            <section className="bg-primary-container text-on-primary-container p-6 rounded-kt-lg shadow-brand-lg overflow-hidden">
              <header className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-full bg-on-primary-container/15 flex items-center justify-center text-2xl"
                  aria-hidden="true"
                >
                  💡
                </div>
                <h2 className="font-display text-title-lg font-bold tracking-tight">
                  Tips menjaga free tier kamu
                </h2>
              </header>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TipCard icon="🧹" body="Bersihkan tabel logs secara rutin setiap 30 hari." />
                <TipCard icon="🗜️" body="Gunakan kompresi gambar sebelum upload ke storage." />
                <TipCard icon="🗑️" body="Hapus notifikasi lama yang sudah dibaca > 6 bulan." />
                <TipCard icon="📐" body="Optimasi tipe data kolom (mis. timestamptz vs text)." />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

type HealthTone = 'normal' | 'warning' | 'critical';

const HEALTH_BANNER_CLASS: Record<HealthTone, string> = {
  normal:   'border-feedback-success bg-feedback-success-bg text-feedback-success',
  warning:  'border-feedback-warning bg-feedback-warning-bg text-feedback-warning',
  critical: 'border-feedback-danger bg-feedback-danger-bg text-feedback-danger',
};

const HEALTH_ICON: Record<HealthTone, string> = {
  normal:   '✅',
  warning:  '⚠️',
  critical: '🚨',
};

interface OverallHealth {
  tone: HealthTone;
  headline: string;
  detail: string;
}

function computeOverallHealth(s: UsageSummary | null): OverallHealth | null {
  if (!s) return null;
  const pcts = [s.database.utilization_pct];
  if (s.storage.utilization_pct !== null) pcts.push(s.storage.utilization_pct);
  if (s.mau_current_month !== null) {
    pcts.push(Math.round((s.mau_current_month / s.mau_limit) * 1000) / 10);
  }
  const max = pcts.length > 0 ? Math.max(...pcts) : 0;
  if (max >= 90) {
    return {
      tone: 'critical',
      headline: 'Resource hampir penuh — perlu perhatian segera',
      detail: `Utilisasi tertinggi ${max}%. Cek alert di bawah, plan upgrade atau cleanup.`,
    };
  }
  if (max >= 70) {
    return {
      tone: 'warning',
      headline: 'Resource mendekati limit',
      detail: `Utilisasi tertinggi ${max}%. Aman untuk sekarang, tapi mulai monitor lebih sering.`,
    };
  }
  return {
    tone: 'normal',
    headline: 'Semua resource dalam batas aman',
    detail: `Utilisasi tertinggi ${max}%. Free tier masih lega — keep going.`,
  };
}

interface UsageMetricCardProps {
  label: string;
  current: number | null;
  limit: number;
  pct: number | null;
  unit: string;
  note?: string;
}

function UsageMetricCard({ label, current, limit, pct, unit, note }: UsageMetricCardProps) {
  const tone = pct === null ? 'muted' : pct >= 90 ? 'critical' : pct >= 70 ? 'warning' : 'normal';

  const barColor: Record<typeof tone, string> = {
    normal:   'bg-feedback-success',
    warning:  'bg-feedback-warning',
    critical: 'bg-feedback-danger',
    muted:    'bg-surface-dim',
  };

  const thresholdLabel: Record<typeof tone, string> = {
    normal:   'Tingkat sehat',
    warning:  'Mendekati ambang',
    critical: 'Ambang kritis',
    muted:    '—',
  };

  const thresholdColor: Record<typeof tone, string> = {
    normal:   'text-feedback-success',
    warning:  'text-feedback-warning',
    critical: 'text-feedback-danger',
    muted:    'text-on-surface-variant',
  };

  const opacityClass = tone === 'muted' ? 'opacity-80' : '';

  return (
    <div
      className={`bg-surface-container-lowest p-6 rounded-kt-lg border border-outline-variant shadow-brand-sm ${opacityClass}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className="text-label-md font-bold tracking-widest text-on-surface-variant uppercase">
          {label}
        </span>
        {tone !== 'muted' && (
          <span className="bg-secondary-container/50 text-on-secondary-container px-2 py-0.5 rounded-full text-[10px] font-bold">
            {pct}% kuota
          </span>
        )}
      </div>
      {current === null && note ? (
        <>
          <p className="text-title-md font-medium text-on-surface-variant italic mb-2 py-1">
            Segera tersedia
          </p>
          <div className="w-full bg-surface-container-low h-2 rounded-full mb-2" />
          <p className="text-body-sm text-on-surface-variant">{note}</p>
        </>
      ) : (
        <>
          <p className="font-mono text-title-lg font-bold text-on-surface mb-2 tracking-tighter tabular-nums">
            {current ?? '—'}{' '}
            <span className="text-body-md font-normal text-on-surface-variant">
              / {limit} {unit}
            </span>
          </p>
          <div className="w-full bg-surface-container-low h-2 rounded-full mb-2 overflow-hidden">
            <div
              className={`${barColor[tone]} h-full rounded-full transition-all duration-base ease-brand`}
              style={{ width: `${Math.min(100, pct ?? 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-body-sm font-medium">
            <span className="text-on-surface-variant">{pct !== null ? `${pct}% digunakan` : '—'}</span>
            <span className={thresholdColor[tone]}>{thresholdLabel[tone]}</span>
          </div>
        </>
      )}
    </div>
  );
}

function TipCard({ icon, body }: { icon: string; body: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-kt-md bg-on-primary-container/10 border border-on-primary-container/15 hover:bg-on-primary-container/15 transition-colors">
      <span className="text-2xl mt-0.5" aria-hidden="true">
        {icon}
      </span>
      <p className="text-body-md font-medium">{body}</p>
    </div>
  );
}
