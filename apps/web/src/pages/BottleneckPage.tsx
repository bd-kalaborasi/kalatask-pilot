/**
 * BottleneckPage — F6 Bottleneck View.
 *
 * Task stuck di status non-final (todo/in_progress/review) > X hari
 * tanpa update. X dari app_settings.bottleneck_threshold_days (default 3
 * per Q4 owner answer).
 *
 * "Stuck" measurement: tasks.updated_at < now - X days (Q2 Sprint 3
 * Option A — defer activity_log accurate measurement Sprint 4+).
 *
 * Permission: Admin + Manager + Viewer (cross-management visibility).
 * Member redirect.
 */
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
import { TaskStatusBadge } from '@/components/task/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/task/TaskPriorityBadge';
import {
  daysSinceUpdate,
  fetchBottleneckTasks,
  fetchBottleneckThreshold,
} from '@/lib/bottleneck';
import { formatDateID } from '@/lib/formatDate';
import type { TaskWithAssignee } from '@/lib/tasks';

export function BottleneckPage() {
  const { profile } = useAuth();
  const [threshold, setThreshold] = useState(3);
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profile || profile.role === 'member') return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const t = await fetchBottleneckThreshold();
        if (!mounted) return;
        setThreshold(t);
        const data = await fetchBottleneckTasks(t);
        if (!mounted) return;
        setTasks(data);
        setError(null);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Gagal load bottleneck'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profile]);

  if (profile && profile.role === 'member') {
    return <Navigate to="/" replace />;
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Bottleneck View</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Task non-final yang stuck &gt; {threshold} hari tanpa update
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Threshold configurable di <code>app_settings.bottleneck_threshold_days</code>.
            Measurement: <code>tasks.updated_at</code> (defer activity_log accurate
            tracking Sprint 4+).
          </p>
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground">Memuat bottleneck...</p>
        )}

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4">
            <p className="text-sm text-destructive">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && (
          <Card className={tasks.length > 0 ? 'border-l-4 border-l-red-500' : undefined}>
            <CardHeader>
              <CardTitle>
                {tasks.length === 0
                  ? 'Tidak ada bottleneck 🎉'
                  : `${tasks.length} task stuck`}
              </CardTitle>
              {tasks.length > 0 && (
                <CardDescription>
                  Sorted by paling lama tidak update (top = critical)
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Semua task non-final ter-update dalam {threshold} hari terakhir.
                  Bagus, no bottleneck.
                </p>
              ) : (
                <ul className="divide-y">
                  {tasks.map((t) => {
                    const stuckDays = daysSinceUpdate(t.updated_at);
                    return (
                      <li
                        key={t.id}
                        className="py-3 flex items-start gap-3 flex-wrap"
                      >
                        <div className="flex-1 min-w-[200px] space-y-1">
                          <Link
                            to={`/projects/${t.project_id}`}
                            className="font-medium hover:underline"
                          >
                            {t.title}
                          </Link>
                          {t.assignee && (
                            <p className="text-xs text-muted-foreground">
                              {t.assignee.full_name}
                              {t.deadline &&
                                ` · deadline ${formatDateID(t.deadline)}`}
                            </p>
                          )}
                          {!t.assignee && (
                            <p className="text-xs text-muted-foreground italic">
                              Unassigned
                              {t.deadline &&
                                ` · deadline ${formatDateID(t.deadline)}`}
                            </p>
                          )}
                        </div>
                        <TaskStatusBadge status={t.status} />
                        <TaskPriorityBadge priority={t.priority} />
                        <span
                          className={
                            stuckDays > threshold * 2
                              ? 'text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-mono'
                              : 'text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-mono'
                          }
                        >
                          {stuckDays} hari stuck
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
