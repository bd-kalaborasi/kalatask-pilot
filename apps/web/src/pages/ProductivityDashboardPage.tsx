/**
 * ProductivityDashboardPage — F13 Productivity & Management Dashboard.
 *
 * Permission per F13 AC-9: read-only untuk Viewer + Admin. Manager
 * scoped via RLS auto-team-filter (no UI block; data limited per RLS).
 * Member redirect.
 */
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MetricTile } from '@/components/dashboard/MetricTile';
import { CompletionRateBar } from '@/components/dashboard/CompletionRateBar';
import { VelocityLine } from '@/components/dashboard/VelocityLine';
import { BottleneckHeatmap } from '@/components/dashboard/BottleneckHeatmap';
import { useDashboardData } from '@/hooks/useDashboardData';

const PERIOD_OPTIONS = [
  { days: 7, label: '7 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
  { days: 180, label: '180 hari' },
];

export function ProductivityDashboardPage() {
  const { profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const periodDays = Number.parseInt(searchParams.get('period') ?? '30', 10) || 30;
  const teamId = profile?.role === 'manager' ? profile.team_id : null;

  const { productivity, workload, loading, error, refetch } = useDashboardData(
    teamId,
    periodDays,
  );

  // Pattern Sprint 4 (AdminCsvImportPage): wait until profile resolved sebelum
  // render redirect logic. Tanpa guard ini, mid-render <Navigate> trigger
  // Router state update saat re-render dari profile=null → resolved =
  // React error #300 + AbortController kills profile fetch (race kunci
  // dashboards.spec.ts:89 Sprint 4.5 investigation).
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
      </div>
    );
  }

  // Permission: Member redirected; Manager + Viewer + Admin allowed
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
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-headline font-semibold">Productivity Dashboard</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Periode: {periodDays} hari
              {profile.role === 'manager' && ' (team kamu)'}
              {(profile.role === 'admin' || profile.role === 'viewer') &&
                ' (cross-team)'}
            </p>
          </div>
          <div className="inline-flex rounded-md border border-input bg-surface p-0.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                onClick={() => setPeriod(opt.days)}
                aria-pressed={opt.days === periodDays}
                className={
                  opt.days === periodDays
                    ? 'px-3 py-1 text-sm rounded-sm bg-primary text-primary-foreground'
                    : 'px-3 py-1 text-sm rounded-sm text-muted-foreground hover:text-foreground'
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Memuat dashboard...</p>
        )}

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Gagal load dashboard.
            </p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && productivity && workload && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <MetricTile
                label="On-Time Delivery"
                value={`${Math.round(productivity.on_time_delivery_rate * 100)}%`}
                caption="completed on/before deadline"
                tone={
                  productivity.on_time_delivery_rate >= 0.7
                    ? 'positive'
                    : productivity.on_time_delivery_rate >= 0.4
                      ? 'warning'
                      : 'critical'
                }
              />
              <MetricTile
                label="Avg Cycle Time"
                value={`${productivity.avg_cycle_time_days.toFixed(1)} hari`}
                caption="created → done"
              />
              <MetricTile
                label="Total Members Tracked"
                value={workload.members.length}
                caption={`Threshold > ${workload.threshold} task`}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Completion Rate per User</CardTitle>
                <CardDescription>
                  % task done dari assigned dalam {periodDays} hari
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompletionRateBar
                  data={productivity.completion_rate_per_user}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Velocity (8 minggu trend)</CardTitle>
                <CardDescription>Task completed per minggu</CardDescription>
              </CardHeader>
              <CardContent>
                <VelocityLine data={productivity.velocity_per_week} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bottleneck Heatmap</CardTitle>
                <CardDescription>
                  Task non-final per status × age bucket
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BottleneckHeatmap data={productivity.bottleneck_heatmap} />
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
