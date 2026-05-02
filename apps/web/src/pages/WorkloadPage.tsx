/**
 * WorkloadPage — F5 Workload View.
 *
 * Sprint 6 patch: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/09-workload.html "Workload Tim").
 *
 * Layout:
 * - Header: display headline-md + scope subtitle
 * - 3 KPI summary cards (total tracked / overloaded / high)
 * - Bar chart panel (open task per member, indicator-colored)
 * - Per-member detail list panel
 *
 * Permission: Admin + Manager only.
 */
import { Navigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { LoadIndicator, WorkloadMember } from '@/lib/dashboardMetrics';

const INDICATOR_COLOR: Record<LoadIndicator, string> = {
  normal: '#10b981',
  high: '#f59e0b',
  overloaded: '#ef4444',
};

const INDICATOR_LABEL: Record<LoadIndicator, string> = {
  normal: 'Normal',
  high: 'High',
  overloaded: 'Overloaded',
};

export function WorkloadPage() {
  const { profile, loading: authLoading } = useAuth();
  const teamId = profile?.role === 'manager' ? profile.team_id : null;
  const { workload, loading, error, refetch } = useDashboardData(teamId, 30);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  const totalMembers = workload?.members.length ?? 0;
  const overloadedCount = workload?.members.filter((m) => m.load_indicator === 'overloaded').length ?? 0;
  const highCount = workload?.members.filter((m) => m.load_indicator === 'high').length ?? 0;
  const totalOpen = workload?.members.reduce((sum, m) => sum + m.open_tasks, 0) ?? 0;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">
              Workload Tim
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Open task per member
              {profile.role === 'manager' && ' (team kamu)'}
              {profile.role === 'admin' && ' (cross-team)'}
            </p>
          </div>
          {workload && (
            <span className="text-body-sm text-on-surface-variant">
              Threshold &gt; {workload.threshold} task = overloaded
            </span>
          )}
        </header>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Memuat workload...</p>
        )}

        {error && (
          <div className="border border-feedback-danger/50 bg-feedback-danger-bg rounded-kt-md p-4 space-y-2">
            <p className="text-body-md font-medium text-feedback-danger">
              Gagal load workload.
            </p>
            <p className="text-body-md text-on-surface-variant">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && workload && (
          <>
            {/* KPI strip — 3 summary cards */}
            <section
              aria-label="Ringkasan workload"
              className="grid grid-cols-1 sm:grid-cols-3 gap-6"
            >
              <SummaryCard
                label="Total tracked"
                value={totalMembers}
                caption={`${totalOpen} open task total`}
                tone="primary"
              />
              <SummaryCard
                label="Overloaded"
                value={overloadedCount}
                caption={overloadedCount > 0 ? 'Perlu redistribusi' : 'Tidak ada'}
                tone={overloadedCount > 0 ? 'critical' : 'normal'}
              />
              <SummaryCard
                label="High load"
                value={highCount}
                caption={highCount > 0 ? 'Mendekati ambang' : 'Aman'}
                tone={highCount > 0 ? 'warning' : 'normal'}
              />
            </section>

            {/* Bar chart panel */}
            <section className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
              <header className="mb-6">
                <h2 className="font-display text-title-lg text-on-surface mb-1">
                  Open task per member
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Bar berwarna mengikuti indikator load (hijau / kuning / merah).
                </p>
              </header>
              {workload.members.length === 0 ? (
                <EmptyState
                  compact
                  icon="👥"
                  title="Belum ada member yang ter-track"
                  body="Workload muncul setelah ada Member dengan task assigned. Cek Tim & User di scope ini."
                />
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={workload.members.map((m) => ({
                      name: m.full_name,
                      open: m.open_tasks,
                      indicator: m.load_indicator,
                    }))}
                    margin={{ top: 16, right: 16, bottom: 16, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} allowDecimals={false} />
                    <Tooltip
                      formatter={(value, _name, item) => {
                        const payload = (item as { payload?: { indicator?: LoadIndicator } }).payload;
                        return [
                          `${String(value)} task (${payload?.indicator ? INDICATOR_LABEL[payload.indicator] : '—'})`,
                          'Open',
                        ] as [string, string];
                      }}
                    />
                    <Bar dataKey="open" radius={[4, 4, 0, 0]}>
                      {workload.members.map((m, i) => (
                        <Cell key={i} fill={INDICATOR_COLOR[m.load_indicator]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            {/* Per-member detail panel */}
            {workload.members.length > 0 && (
              <section className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden">
                <header className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
                  <h2 className="font-display text-title-md font-bold text-on-surface">
                    Detail per member
                  </h2>
                </header>
                <ul className="divide-y divide-outline-variant/60">
                  {workload.members.map((m: WorkloadMember) => (
                    <li
                      key={m.user_id}
                      className="px-6 py-4 flex items-center justify-between gap-3 flex-wrap hover:bg-surface-container-low/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                        <div
                          className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold"
                          aria-hidden="true"
                        >
                          {m.full_name?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="text-label-lg font-medium text-on-surface">
                            {m.full_name}
                          </p>
                          <p className="text-body-sm text-on-surface-variant mt-0.5">
                            {m.open_tasks} open
                            {m.overdue > 0 && ` · ${m.overdue} overdue`}
                            {m.high_priority > 0 && ` · ${m.high_priority} high priority`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={
                          m.load_indicator === 'overloaded'
                            ? 'text-label-md px-3 py-1 rounded-full bg-feedback-danger-bg text-feedback-danger font-bold'
                            : m.load_indicator === 'high'
                              ? 'text-label-md px-3 py-1 rounded-full bg-feedback-warning-bg text-feedback-warning font-bold'
                              : 'text-label-md px-3 py-1 rounded-full bg-feedback-success-bg text-feedback-success font-bold'
                        }
                      >
                        {INDICATOR_LABEL[m.load_indicator]}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

interface SummaryCardProps {
  label: string;
  value: number;
  caption: string;
  tone: 'primary' | 'normal' | 'warning' | 'critical';
}

function SummaryCard({ label, value, caption, tone }: SummaryCardProps) {
  const valueColor = {
    primary: 'text-primary-container',
    normal: 'text-feedback-success',
    warning: 'text-feedback-warning',
    critical: 'text-feedback-danger',
  }[tone];

  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
      <p className="text-label-md font-bold uppercase tracking-widest text-on-surface-variant mb-2">
        {label}
      </p>
      <p className={`font-display text-display-sm leading-tight tabular-nums ${valueColor} mb-1`}>
        {value}
      </p>
      <p className="text-body-sm text-on-surface-variant">{caption}</p>
    </div>
  );
}
