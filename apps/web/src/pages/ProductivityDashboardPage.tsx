/**
 * ProductivityDashboardPage — F13 Productivity & Management Dashboard.
 *
 * Sprint 6 patch: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/11-productivity.html "Productivity Dashboard").
 *
 * Layout:
 * - Header: title + period pill toggle (7/30/90/180 hari)
 * - KPI row (4 cards): Completion Rate / Velocity / On-time Delivery / Avg Cycle Time
 * - 2-col split: VelocityLine trend (60%) + Top Performer leaderboard (40%)
 * - Insights row: 3 cards derived from data (Best day / Bottleneck / Recommendation)
 *
 * Permission per F13 AC-9: read-only untuk Viewer + Admin. Manager
 * scoped via RLS auto-team-filter (no UI block; data limited per RLS).
 * Member redirect.
 *
 * Preserves: existing chart components (VelocityLine, CompletionRateBar,
 * BottleneckHeatmap) — used inline at right size for layout.
 */
import { useMemo } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { VelocityLine } from '@/components/dashboard/VelocityLine';
import { BottleneckHeatmap } from '@/components/dashboard/BottleneckHeatmap';
import { useDashboardData } from '@/hooks/useDashboardData';
import type {
  CompletionRateRow,
  ProductivityMetrics,
  VelocityRow,
} from '@/lib/dashboardMetrics';

const PERIOD_OPTIONS = [
  { days: 7, label: 'Minggu' },
  { days: 30, label: 'Bulan' },
  { days: 90, label: 'Kuartal' },
  { days: 180, label: '6 Bulan' },
];

const MEDAL = ['🥇', '🥈', '🥉'] as const;

export function ProductivityDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const periodDays = Number.parseInt(searchParams.get('period') ?? '30', 10) || 30;
  const teamId = profile?.role === 'manager' ? profile.team_id : null;

  const { productivity, workload, loading, error, refetch } = useDashboardData(
    teamId,
    periodDays,
  );

  // All hooks declared BEFORE early returns to honor React hooks rules.
  const topPerformers = useMemo(() => {
    if (!productivity) return [];
    return [...productivity.completion_rate_per_user]
      .sort((a, b) => b.done - a.done)
      .slice(0, 5);
  }, [productivity]);

  const insights = useMemo(
    () => (productivity ? deriveInsights(productivity) : null),
    [productivity],
  );

  const avgCompletionRate = useMemo(() => {
    if (!productivity || productivity.completion_rate_per_user.length === 0) return 0;
    const total = productivity.completion_rate_per_user.reduce(
      (sum, r) => sum + r.rate,
      0,
    );
    return total / productivity.completion_rate_per_user.length;
  }, [productivity]);

  const avgVelocity = useMemo(() => {
    if (!productivity || productivity.velocity_per_week.length === 0) return 0;
    const total = productivity.velocity_per_week.reduce(
      (sum, r) => sum + r.tasks_completed,
      0,
    );
    return total / productivity.velocity_per_week.length;
  }, [productivity]);

  // Wait until profile resolved sebelum render redirect logic.
  // (race kunci dashboards.spec.ts:89 Sprint 4.5 investigation)
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  if (profile.role === 'member') {
    return <Navigate to="/" replace />;
  }

  function setPeriod(days: number) {
    const next = new URLSearchParams(searchParams);
    if (days === 30) next.delete('period');
    else next.set('period', String(days));
    setSearchParams(next);
  }

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1400px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-8">
        {/* Header — title + period pill toggle */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-headline-md text-on-surface mb-1">
              Productivity
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Performa tim per periode
              {profile.role === 'manager' && ' (team kamu)'}
              {(profile.role === 'admin' || profile.role === 'viewer') && ' (cross-team)'}
            </p>
          </div>
          <div
            role="tablist"
            aria-label="Pilih periode"
            className="flex bg-surface-container-low p-1 rounded-kt-lg"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                role="tab"
                aria-selected={opt.days === periodDays}
                onClick={() => setPeriod(opt.days)}
                className={
                  opt.days === periodDays
                    ? 'px-5 py-2 rounded-kt-md text-label-lg bg-surface-container-lowest shadow-brand-sm text-primary-container font-semibold'
                    : 'px-5 py-2 rounded-kt-md text-label-lg text-on-surface-variant hover:text-on-surface transition-colors'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </header>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Memuat dashboard...</p>
        )}

        {error && (
          <div className="border border-feedback-danger/50 bg-feedback-danger-bg rounded-kt-lg p-4 space-y-2">
            <p className="text-body-md font-medium text-feedback-danger">
              Gagal load dashboard.
            </p>
            <p className="text-body-md text-on-surface-variant">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && productivity && workload && (
          <>
            {/* KPI strip — 4 cards */}
            <section
              aria-label="KPI utama"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <KpiCardSparkline
                label="Completion Rate"
                value={`${Math.round(avgCompletionRate * 100)}%`}
                tone="primary"
                hint="Rata-rata seluruh user"
              />
              <KpiCardSparkline
                label="Velocity"
                value={avgVelocity.toFixed(1)}
                unit="tugas/minggu"
                tone="secondary"
                hint="Avg 8 minggu terakhir"
              />
              <KpiCardSparkline
                label="On-time Delivery"
                value={`${Math.round(productivity.on_time_delivery_rate * 100)}%`}
                tone="primary"
                hint="Selesai sebelum deadline"
              />
              <KpiCardSparkline
                label="Avg Cycle Time"
                value={productivity.avg_cycle_time_days.toFixed(1)}
                unit="hari"
                tone="tertiary"
                hint="Created → done"
              />
            </section>

            {/* 2-col split: VelocityLine + Leaderboard */}
            <section className="grid grid-cols-1 lg:grid-cols-10 gap-6">
              <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
                <header className="flex items-center justify-between mb-6">
                  <h2 className="font-display text-title-lg text-on-surface">
                    Trend Velocity
                  </h2>
                  <span className="text-body-sm text-on-surface-variant">
                    Task selesai per minggu
                  </span>
                </header>
                <VelocityLine data={productivity.velocity_per_week} />
              </div>

              <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
                <h2 className="font-display text-title-lg text-on-surface mb-6">
                  Top performer
                </h2>
                {topPerformers.length === 0 ? (
                  <p className="text-body-md text-on-surface-variant">
                    Belum ada data completion. Tunggu tim selesaikan beberapa tugas dulu.
                  </p>
                ) : (
                  <ol className="flex flex-col gap-3">
                    {topPerformers.map((row, idx) => (
                      <PerformerRow key={row.user_id} row={row} rank={idx} />
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* Bottleneck heatmap kept — analytical depth */}
            <section className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
              <header className="mb-6">
                <h2 className="font-display text-title-lg text-on-surface mb-1">
                  Bottleneck Heatmap
                </h2>
                <p className="text-body-md text-on-surface-variant">
                  Task non-final per status × age bucket
                </p>
              </header>
              <BottleneckHeatmap data={productivity.bottleneck_heatmap} />
            </section>

            {/* Insights row */}
            {insights && (
              <section>
                <h2 className="font-display text-title-lg text-on-surface mb-4">
                  Insights
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InsightCard
                    tone="primary"
                    label="Best day"
                    title={insights.bestDayTitle}
                    body={insights.bestDayBody}
                  />
                  <InsightCard
                    tone="error"
                    label="Bottleneck signal"
                    title={insights.bottleneckTitle}
                    body={insights.bottleneckBody}
                  />
                  <InsightCard
                    tone="tertiary"
                    label="Recommendation"
                    title={insights.recommendationTitle}
                    body={insights.recommendationBody}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface KpiCardSparklineProps {
  label: string;
  value: string;
  unit?: string;
  tone: 'primary' | 'secondary' | 'tertiary';
  hint?: string;
}

function KpiCardSparkline({ label, value, unit, tone, hint }: KpiCardSparklineProps) {
  const toneSparkline = {
    primary: 'from-primary-container/15 to-primary-container/5 stroke-primary-container',
    secondary: 'from-secondary-container/15 to-secondary-container/5 stroke-secondary',
    tertiary: 'from-tertiary-container/15 to-tertiary-container/5 stroke-tertiary',
  }[tone];

  // Decorative sparkline path. Real per-metric series rendering deferred.
  const sparkPath = 'M0 50 Q 25 20, 50 45 T 100 25 T 150 45 T 200 15';

  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
      <p className="text-label-lg text-on-surface-variant mb-2 uppercase tracking-wide">
        {label}
      </p>
      <h3 className="font-display text-display-sm text-on-surface leading-tight mb-4 tabular-nums">
        {value}
      </h3>
      <div className={`w-full h-12 bg-gradient-to-r ${toneSparkline} rounded relative overflow-hidden mb-3`} aria-hidden="true">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 200 60">
          <path d={sparkPath} fill="none" strokeWidth="3" className={toneSparkline.split(' ').pop()} />
        </svg>
      </div>
      {unit && (
        <p className="text-body-sm text-on-surface-variant">{unit}</p>
      )}
      {hint && (
        <p className="text-body-sm text-on-surface-variant mt-1">{hint}</p>
      )}
    </div>
  );
}

interface PerformerRowProps {
  row: CompletionRateRow;
  rank: number;
}

function PerformerRow({ row, rank }: PerformerRowProps) {
  const initial = row.full_name?.charAt(0).toUpperCase() ?? '?';

  return (
    <li className="flex items-center justify-between p-3 hover:bg-surface-container-low rounded-kt-md transition-colors">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div
            className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold"
            aria-hidden="true"
          >
            {initial}
          </div>
          {rank < 3 && (
            <span className="absolute -top-1 -right-1 text-lg" aria-label={`Peringkat ${rank + 1}`}>
              {MEDAL[rank]}
            </span>
          )}
        </div>
        <div>
          <p className="text-label-lg text-on-surface font-medium">{row.full_name}</p>
          <p className="text-body-sm text-on-surface-variant">
            {Math.round(row.rate * 100)}% completion rate
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-title-md font-bold text-primary-container tabular-nums">{row.done}</p>
        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
          Tugas selesai
        </p>
      </div>
    </li>
  );
}

interface InsightCardProps {
  tone: 'primary' | 'error' | 'tertiary';
  label: string;
  title: string;
  body: string;
}

function InsightCard({ tone, label, title, body }: InsightCardProps) {
  const toneClasses = {
    primary: { ring: 'bg-primary-container/15 text-primary-container', label: 'text-primary-container' },
    error: { ring: 'bg-error-container/30 text-feedback-danger', label: 'text-feedback-danger' },
    tertiary: { ring: 'bg-tertiary-container/30 text-tertiary', label: 'text-tertiary' },
  }[tone];

  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-2xl ${toneClasses.ring}`}
        aria-hidden="true"
      >
        ★
      </div>
      <div className="flex-1">
        <p
          className={`text-label-md font-bold uppercase tracking-widest mb-1 ${toneClasses.label}`}
        >
          {label}
        </p>
        <h3 className="font-display text-title-md text-on-surface leading-tight mb-2">
          {title}
        </h3>
        <p className="text-body-md text-on-surface-variant">{body}</p>
      </div>
    </div>
  );
}

// ============================================================
// Insights derivation — mathematical patterns from real data.
// ============================================================

interface DerivedInsights {
  bestDayTitle: string;
  bestDayBody: string;
  bottleneckTitle: string;
  bottleneckBody: string;
  recommendationTitle: string;
  recommendationBody: string;
}

function deriveInsights(productivity: ProductivityMetrics): DerivedInsights {
  // Best day = peak velocity week
  const peakWeek = productivity.velocity_per_week.reduce<VelocityRow | null>(
    (peak, row) => (peak === null || row.tasks_completed > peak.tasks_completed ? row : peak),
    null,
  );
  const bestDayTitle = peakWeek
    ? `Minggu ${formatWeekStart(peakWeek.week_start)} paling produktif`
    : 'Belum ada data minggu produktif';
  const bestDayBody = peakWeek
    ? `Tim menyelesaikan ${peakWeek.tasks_completed} tugas pada minggu ini.`
    : 'Tunggu data velocity 1-2 minggu sebelum insights muncul.';

  // Bottleneck = max count in heatmap >7d age bucket
  const oldBlockages = productivity.bottleneck_heatmap.filter((row) => row.age_bucket === '>7d');
  const worstStage = oldBlockages.reduce<typeof oldBlockages[number] | null>(
    (worst, row) => (worst === null || row.count > worst.count ? row : worst),
    null,
  );
  const bottleneckTitle = worstStage
    ? `Cek ulang stage "${worstStage.status}"`
    : 'Tidak ada bottleneck terdeteksi';
  const bottleneckBody = worstStage
    ? `${worstStage.count} tugas tertahan lebih dari 7 hari di status ini.`
    : 'Semua tugas non-final masih dalam timeline normal.';

  // Recommendation = on-time delivery threshold
  const onTimeRate = productivity.on_time_delivery_rate;
  const recommendationTitle =
    onTimeRate < 0.7 ? 'Boost on-time delivery' : 'Pertahankan momentum';
  const recommendationBody =
    onTimeRate < 0.7
      ? `On-time delivery ${Math.round(onTimeRate * 100)}% — coba review ulang deadline yang tidak realistis.`
      : `Delivery on-time ${Math.round(onTimeRate * 100)}% — tim sudah konsisten, lanjutkan!`;

  return {
    bestDayTitle,
    bestDayBody,
    bottleneckTitle,
    bottleneckBody,
    recommendationTitle,
    recommendationBody,
  };
}

function formatWeekStart(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}
