/**
 * ListView — render tasks in flat list dengan grouping toggle.
 *
 * F3 AC-4 (grouping by project/assignee/status — toggleable).
 * Note: project grouping removed di Sprint 2 karena List view di-scope
 * per-project (di ProjectDetailPage). Phase 2 (cross-project task list)
 * bisa add 'project' option.
 */
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { InlineStatusEdit } from '@/components/task/InlineStatusEdit';
import { TaskPriorityBadge } from '@/components/task/TaskPriorityBadge';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDateID, formatDeadlineRelative } from '@/lib/formatDate';
import { groupTasks, type GroupBy } from '@/lib/tasksFilter';
import type { TaskWithAssignee } from '@/lib/tasks';

interface ListViewProps {
  tasks: TaskWithAssignee[];
  groupBy: GroupBy;
  /** Optimistic update — same shape as KanbanView */
  onLocalUpdate?: (id: string, patch: Partial<TaskWithAssignee>) => void;
  onRefetch?: () => void;
}

export function ListView({
  tasks,
  groupBy,
  onLocalUpdate,
  onRefetch,
}: ListViewProps) {
  const { profile } = useAuth();
  const groups = groupTasks(tasks, groupBy);

  function canEditStatus(t: TaskWithAssignee): boolean {
    if (!profile) return false;
    if (profile.role === 'viewer') return false;
    if (profile.role === 'admin' || profile.role === 'manager') return true;
    // member: only when assignee
    return t.assignee_id === profile.id;
  }

  if (tasks.length === 0) {
    return (
      <div className="border rounded-md bg-surface">
        <EmptyState
          icon="✅"
          title="Project ini masih kosong"
          body="Klik 'Bikin task' di atas untuk mulai. Atau biarkan Cowork agent ngisi otomatis dari MoM besok pagi 🤖"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`group-${g.key}`}>
          {groupBy !== 'none' && (
            <h3
              id={`group-${g.key}`}
              className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2"
            >
              {g.label}
              <span className="text-xs font-normal">({g.tasks.length})</span>
            </h3>
          )}
          <ul className="border rounded-md divide-y bg-surface">
            {g.tasks.map((t) => (
              <li
                key={t.id}
                className="px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-accent/30 transition-colors"
              >
                <Link
                  to={`/projects/${t.project_id}/tasks/${t.id}`}
                  className="flex-1 min-w-[200px]"
                >
                  <p className="font-medium leading-tight">{t.title}</p>
                  {t.assignee && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.assignee.full_name}
                    </p>
                  )}
                  {!t.assignee && (
                    <p className="text-xs text-muted-foreground italic mt-0.5">
                      Belum diassign
                    </p>
                  )}
                </Link>
                {onLocalUpdate && onRefetch ? (
                  <InlineStatusEdit
                    taskId={t.id}
                    status={t.status}
                    editable={canEditStatus(t)}
                    onLocalUpdate={onLocalUpdate}
                    onRefetch={onRefetch}
                  />
                ) : (
                  <InlineStatusEdit
                    taskId={t.id}
                    status={t.status}
                    editable={false}
                    onLocalUpdate={() => {}}
                    onRefetch={() => {}}
                  />
                )}
                <TaskPriorityBadge priority={t.priority} />
                <Link
                  to={`/projects/${t.project_id}/tasks/${t.id}`}
                  className="text-xs text-muted-foreground font-mono min-w-[110px] text-right"
                >
                  {t.deadline ? (
                    <>
                      <div>{formatDateID(t.deadline)}</div>
                      <div className="opacity-70">
                        {formatDeadlineRelative(t.deadline)}
                      </div>
                    </>
                  ) : (
                    <span className="opacity-50">tanpa deadline</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
