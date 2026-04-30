/**
 * WorkloadPage — F5 Workload View.
 *
 * Bar chart open task per member dengan warning indicator threshold.
 * Permission: Admin + Manager (Member/Viewer redirect — F5 PRD line 220
 * "manager buka workload view"; Viewer not explicit, defer to manager
 * primary scope).
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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

  // Pattern Sprint 4 profile-resolved (Sprint 4.5 Step 0 housekeeping)
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

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-headline font-semibold">Workload View</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Open task per member
            {profile.role === 'manager' && ' (team kamu)'}
            {profile.role === 'admin' && ' (cross-team)'}
          </p>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Memuat workload...</p>
        )}

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Gagal load workload.
            </p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && workload && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Open Task per Member</CardTitle>
                <CardDescription>
                  Threshold &gt; {workload.threshold} task = overloaded
                  (configurable di app_settings)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workload.members.length === 0 ? (
                  <EmptyState
                    compact
                    icon="👥"
                    title="Belum ada member yang ter-track"
                    body="Workload muncul setelah ada Member dengan task assigned. Cek Tim & User di scope ini."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
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
              </CardContent>
            </Card>

            {workload.members.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detail per Member</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {workload.members.map((m: WorkloadMember) => (
                      <li
                        key={m.user_id}
                        className="py-3 flex items-center justify-between gap-3 flex-wrap"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <p className="font-medium">{m.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {m.open_tasks} open
                            {m.overdue > 0 && ` · ${m.overdue} overdue`}
                            {m.high_priority > 0 &&
                              ` · ${m.high_priority} high priority`}
                          </p>
                        </div>
                        <span
                          className={
                            m.load_indicator === 'overloaded'
                              ? 'text-xs px-2 py-0.5 rounded-full bg-feedback-danger-bg text-feedback-danger'
                              : m.load_indicator === 'high'
                                ? 'text-xs px-2 py-0.5 rounded-full bg-feedback-warning-bg text-feedback-warning'
                                : 'text-xs px-2 py-0.5 rounded-full bg-feedback-success-bg text-feedback-success'
                          }
                        >
                          {INDICATOR_LABEL[m.load_indicator]}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
