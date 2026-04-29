/**
 * ManagerDashboardPage — F8 quick-view dashboard untuk Manager (per Q1
 * owner answer: separate page dengan 4 tile + link ke F13 detail).
 *
 * Permission: Manager + Admin only. Member/Viewer redirect.
 */
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
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
import { MetricTile } from '@/components/dashboard/MetricTile';
import { useDashboardData } from '@/hooks/useDashboardData';
import { summarize } from '@/lib/dashboardMetrics';

export function ManagerDashboardPage() {
  const { profile, loading: authLoading } = useAuth();

  // Manager scoped ke own team via RLS — pass team_id null,
  // RLS auto-filter. Admin bisa pilih team scope di future iteration.
  const teamId = profile?.role === 'manager' ? profile.team_id : null;

  const { productivity, workload, loading, error, refetch } = useDashboardData(
    teamId,
    30,
  );

  // Pattern Sprint 4 profile-resolved (Sprint 4.5 Step 0 housekeeping)
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  // Permission guard
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Manager Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Quick view — 30 hari terakhir
            {profile.role === 'manager' && ' (team kamu)'}
            {profile.role === 'admin' && ' (cross-team)'}
          </p>
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
            {/* 4 quick-view tile per Q1 owner spec */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricTile
                label="Open Tasks"
                value={summarize(productivity, workload).totalOpenTasks}
                caption={`${summarize(productivity, workload).totalMembers} member tracked`}
              />
              <MetricTile
                label="Completion Rate"
                value={`${summarize(productivity, workload).completionRatePct}%`}
                caption="30 hari terakhir"
                tone={
                  summarize(productivity, workload).completionRatePct >= 70
                    ? 'positive'
                    : 'warning'
                }
              />
              <MetricTile
                label="Overdue Tasks"
                value={summarize(productivity, workload).totalOverdue}
                tone={
                  summarize(productivity, workload).totalOverdue > 0
                    ? 'critical'
                    : 'neutral'
                }
              />
              <MetricTile
                label="Overloaded Members"
                value={summarize(productivity, workload).overloadedMembers}
                caption={`Threshold > ${workload.threshold} task`}
                tone={
                  summarize(productivity, workload).overloadedMembers > 0
                    ? 'warning'
                    : 'positive'
                }
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detail Dashboard</CardTitle>
                <CardDescription>
                  Drill-down ke chart breakdown + per-user view
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link to="/dashboard/productivity">
                    Productivity Dashboard →
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/workload">Workload Detail →</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/bottleneck">Bottleneck →</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status per Member</CardTitle>
              </CardHeader>
              <CardContent>
                {workload.members.length === 0 ? (
                  <EmptyState
                    compact
                    icon="👥"
                    title="Scope ini masih kosong"
                    body="Belum ada Member dengan task aktif di scope yang dipilih. Coba ganti filter team atau tunggu task ter-assign."
                  />
                ) : (
                  <ul className="divide-y">
                    {workload.members.map((m) => (
                      <li
                        key={m.user_id}
                        className="py-2 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.open_tasks} open
                            {m.overdue > 0 && ` · ${m.overdue} overdue`}
                            {m.high_priority > 0 &&
                              ` · ${m.high_priority} high priority`}
                          </p>
                        </div>
                        <span
                          className={
                            m.load_indicator === 'overloaded'
                              ? 'text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700'
                              : m.load_indicator === 'high'
                                ? 'text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700'
                                : 'text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'
                          }
                        >
                          {m.load_indicator}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
