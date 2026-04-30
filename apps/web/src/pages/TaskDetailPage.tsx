/**
 * TaskDetailPage — Sprint 4.5 Step 6.
 *
 * Route: /projects/:projectId/tasks/:taskId
 * Display: title, status, priority, assignee, deadline, description,
 *   comments thread (Sprint 4.5 Step 7).
 *
 * Edit per existing RLS: Member field-locked (status + description),
 *   Manager+Admin full edit.
 *
 * Navigate from list/kanban/gantt task card → here. Back button preserves
 *   prior URL filter state via location state OR project page redirect
 *   (browser native back).
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskStatusBadge } from '@/components/task/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/task/TaskPriorityBadge';
import { CommentsThread } from '@/components/comments/CommentsThread';
import { fetchTaskById, type TaskWithAssignee } from '@/lib/tasks';
import { formatDateID, formatDeadlineRelative } from '@/lib/formatDate';

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<{
    projectId: string;
    taskId: string;
  }>();
  const { profile } = useAuth();
  const [task, setTask] = useState<TaskWithAssignee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!taskId) return;
    setLoading(true);
    void fetchTaskById(taskId)
      .then((t) => {
        if (!mounted) return;
        if (!t) {
          setError('Task tidak ditemukan atau tidak punya akses.');
        }
        setTask(t);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [taskId]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-body-sm">
          <Link
            to={`/projects/${projectId}`}
            className="text-on-surface-variant hover:text-primary-container transition-colors"
          >
            ← Project
          </Link>
        </nav>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Memuat task...</p>
        )}

        {error && (
          <div className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant py-8 text-center">
            <p className="text-body-md text-feedback-danger">{error}</p>
          </div>
        )}

        {!loading && !error && task && (
          <>
            <header className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="font-display text-headline-md text-on-surface leading-tight flex-1">
                  {task.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              </div>
              {task.assignee && (
                <p className="text-body-md text-on-surface-variant">
                  Assigned to{' '}
                  <span className="font-medium text-on-surface">
                    {task.assignee.full_name}
                  </span>
                </p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detail</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <DetailRow
                  label="Deadline"
                  value={
                    task.deadline
                      ? `${formatDateID(task.deadline)} (${formatDeadlineRelative(task.deadline)})`
                      : '—'
                  }
                />
                <DetailRow
                  label="Estimasi"
                  value={
                    task.estimated_hours
                      ? `${task.estimated_hours} jam`
                      : '—'
                  }
                />
                <DetailRow
                  label="Source"
                  value={
                    task.source === 'cowork-agent'
                      ? '🤖 Cowork agent'
                      : task.source === 'csv-import'
                      ? '📊 CSV import'
                      : 'Manual'
                  }
                />
                {task.description && (
                  <div className="pt-2 border-t">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      Deskripsi
                    </p>
                    <p className="text-sm whitespace-pre-wrap">
                      {task.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <CommentsThread taskId={task.id} />
          </>
        )}
      </main>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
