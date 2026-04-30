/**
 * BottleneckPage — F6 Bottleneck View.
 *
 * Sprint 6 patch: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/10-bottleneck.html "Bottleneck Tugas").
 *
 * Layout:
 * - Header: display headline-md + threshold subtitle + measurement note
 * - Severity summary cards (total stuck, critical >2x threshold, normal)
 * - Bottleneck list panel
 *
 * Permission: Admin + Manager + Viewer (read-only management visibility).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
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
  const { profile, loading: authLoading } = useAuth();
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

  const stats = useMemo(() => {
    const critical = tasks.filter((t) => daysSinceUpdate(t.updated_at) > threshold * 2).length;
    return {
      total: tasks.length,
      critical,
      warning: tasks.length - critical,
    };
  }, [tasks, threshold]);

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-sm text-muted-foreground">Memuat...</p>
      </div>
    );
  }

  if (profile.role === 'member') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        {/* Header */}
        <header>
          <h1 className="font-display text-headline-md text-on-surface">Bottleneck Tugas</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Task non-final yang stuck &gt; {threshold} hari tanpa update.
          </p>
          <p className="text-body-sm text-on-surface-variant/80 mt-1">
            Threshold configurable di <code className="font-mono text-primary-container">app_settings.bottleneck_threshold_days</code>.
            Measurement: <code className="font-mono">tasks.updated_at</code>.
          </p>
        </header>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Memuat bottleneck...</p>
        )}

        {error && (
          <div className="border border-feedback-danger/50 bg-feedback-danger-bg rounded-kt-md p-4">
            <p className="text-body-md text-feedback-danger">{error.message}</p>
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
          <>
            {/* Severity summary cards */}
            <section
              aria-label="Ringkasan bottleneck"
              className="grid grid-cols-1 sm:grid-cols-3 gap-6"
            >
              <SeverityCard label="Total stuck" value={stats.total} tone="primary" />
              <SeverityCard
                label="Critical"
                value={stats.critical}
                tone="critical"
                caption={stats.critical > 0 ? `> ${threshold * 2} hari stuck` : 'Tidak ada'}
              />
              <SeverityCard
                label="Warning"
                value={stats.warning}
                tone="warning"
                caption={stats.warning > 0 ? `> ${threshold} hari stuck` : 'Tidak ada'}
              />
            </section>

            {/* Bottleneck list panel */}
            <section
              className={`bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden ${
                tasks.length > 0 ? 'border-l-4 border-l-feedback-danger' : ''
              }`}
            >
              <header className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
                <h2 className="font-display text-title-md font-bold text-on-surface">
                  {tasks.length === 0 ? 'Tidak ada bottleneck 🎉' : `${tasks.length} task stuck`}
                </h2>
                {tasks.length > 0 && (
                  <p className="text-body-sm text-on-surface-variant mt-1">
                    Sorted by paling lama tidak update (top = critical).
                  </p>
                )}
              </header>
              {tasks.length === 0 ? (
                <div className="p-8 text-center">
                  <div
                    className="w-20 h-20 mx-auto mb-4 bg-feedback-success-bg rounded-full flex items-center justify-center text-feedback-success text-4xl"
                    aria-hidden="true"
                  >
                    ✓
                  </div>
                  <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
                    Semua task non-final ter-update dalam {threshold} hari terakhir.
                    Bagus, no bottleneck.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-outline-variant/60">
                  {tasks.map((t) => {
                    const stuckDays = daysSinceUpdate(t.updated_at);
                    const isCritical = stuckDays > threshold * 2;
                    return (
                      <li
                        key={t.id}
                        className="px-6 py-4 flex items-start gap-3 flex-wrap hover:bg-surface-container-low/40 transition-colors"
                      >
                        <div className="flex-1 min-w-[220px] space-y-1">
                          <Link
                            to={`/projects/${t.project_id}`}
                            className="text-label-lg font-medium text-on-surface hover:text-primary-container transition-colors hover:underline"
                          >
                            {t.title}
                          </Link>
                          <p className="text-body-sm text-on-surface-variant">
                            {t.assignee?.full_name ?? <span className="italic">Unassigned</span>}
                            {t.deadline && ` · deadline ${formatDateID(t.deadline)}`}
                          </p>
                        </div>
                        <TaskStatusBadge status={t.status} />
                        <TaskPriorityBadge priority={t.priority} />
                        <span
                          className={
                            isCritical
                              ? 'text-label-md px-3 py-1 rounded-full bg-feedback-danger-bg text-feedback-danger font-mono font-bold'
                              : 'text-label-md px-3 py-1 rounded-full bg-feedback-warning-bg text-feedback-warning font-mono font-bold'
                          }
                        >
                          {stuckDays} hari stuck
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

interface SeverityCardProps {
  label: string;
  value: number;
  tone: 'primary' | 'critical' | 'warning';
  caption?: string;
}

function SeverityCard({ label, value, tone, caption }: SeverityCardProps) {
  const valueColor = {
    primary: 'text-primary-container',
    critical: 'text-feedback-danger',
    warning: 'text-feedback-warning',
  }[tone];

  return (
    <div className="bg-surface-container-lowest p-6 rounded-kt-lg shadow-brand-sm border border-outline-variant">
      <p className="text-label-md font-bold uppercase tracking-widest text-on-surface-variant mb-2">
        {label}
      </p>
      <p className={`font-display text-display-sm leading-tight tabular-nums ${valueColor} mb-1`}>
        {value}
      </p>
      {caption && (
        <p className="text-body-sm text-on-surface-variant">{caption}</p>
      )}
    </div>
  );
}
