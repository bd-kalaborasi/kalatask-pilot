/**
 * ProjectDetailPage — single project view dengan task list + view toggle.
 *
 * Step 3: project metadata + status selector.
 * Step 4: tasks list (List view) + filter + grouping.
 * Step 5: Kanban view (extends saat selected).
 * Step 6: Gantt view (extends saat selected).
 * Step 7: view toggle UI (saat ini View pakai URL param `view=`).
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
import {
  ProjectStatusBadge,
  type ProjectStatus,
} from '@/components/project/ProjectStatusBadge';
import { ProjectStatusSelect } from '@/components/project/ProjectStatusSelect';
import { TasksFilterBar } from '@/components/task/TasksFilterBar';
import { Tooltip } from '@/components/onboarding/Tooltip';
import { lazy, Suspense } from 'react';
import { ListView } from '@/components/views/ListView';
import { KanbanView } from '@/components/views/KanbanView';
import { CreateTaskModal } from '@/components/task/CreateTaskModal';
import { ACTION } from '@/lib/labels';
// Lazy-load GanttView untuk code-split frappe-gantt + CSS. Initial bundle
// stays slim; chunk loads saat user toggle ke Gantt view (R3 mitigation
// per Sprint 2 plan).
const GanttView = lazy(() =>
  import('@/components/views/GanttView').then((m) => ({ default: m.GanttView })),
);
import { supabase } from '@/lib/supabase';
import { updateProjectStatus, type Project } from '@/lib/projects';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { useTasksByProject } from '@/hooks/useTasksByProject';
import {
  readGroupByFromUrl,
  readTasksFilterFromUrl,
  readViewFromUrl,
  writeGroupByToUrl,
  writeTasksFilterToUrl,
  writeViewToUrl,
} from '@/lib/filterUrlState';
import { applyTasksFilter, type GroupBy, type TasksFilter } from '@/lib/tasksFilter';
import { cn } from '@/lib/utils';

export function ProjectDetailPage() {
  const { profile } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState<Project | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<Error | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);

  const canCreateTask =
    profile?.role === 'admin' || profile?.role === 'manager';

  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    updateLocal: updateLocalTask,
    refetch: refetchTasks,
  } = useTasksByProject(projectId);

  const filter = useMemo(
    () => readTasksFilterFromUrl(searchParams),
    [searchParams],
  );
  const groupBy = useMemo(
    () => readGroupByFromUrl(searchParams),
    [searchParams],
  );
  const view = useMemo(() => readViewFromUrl(searchParams, 'list'), [searchParams]);

  function setFilter(next: TasksFilter) {
    setSearchParams(writeTasksFilterToUrl(next, searchParams));
  }
  function setGroupBy(next: GroupBy) {
    setSearchParams(writeGroupByToUrl(next, searchParams));
  }

  const filteredTasks = useMemo(
    () => applyTasksFilter(tasks, filter),
    [tasks, filter],
  );

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    setProjectLoading(true);
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('projects')
          .select(
            'id, name, description, owner_id, status, created_at, updated_at, completed_at',
          )
          .eq('id', projectId)
          .maybeSingle();
        if (err) throw err;
        if (mounted) setProject(data as Project | null);
      } catch (err) {
        if (mounted) {
          setProjectError(
            err instanceof Error ? err : new Error('Gagal load project'),
          );
        }
      } finally {
        if (mounted) setProjectLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  const { mutate: mutateProjectStatus } =
    useOptimisticMutation<{
      next: ProjectStatus;
      previous: ProjectStatus;
    }>({
      mutationFn: ({ next }) => {
        if (!project) throw new Error('Project tidak ditemukan');
        return updateProjectStatus({ id: project.id, status: next });
      },
      onApply: ({ next }) => {
        setProject((p) => (p ? { ...p, status: next } : p));
      },
      onRollback: ({ previous }) => {
        setProject((p) => (p ? { ...p, status: previous } : p));
      },
      successMessage: 'Status project diupdate.',
      errorMessage: 'Gagal update status project. Coba lagi.',
    });

  async function handleStatusChange(next: ProjectStatus) {
    if (!project) return;
    setStatusUpdating(true);
    await mutateProjectStatus({ next, previous: project.status });
    setStatusUpdating(false);
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/projects">← Kembali ke Projects</Link>
        </Button>

        {projectLoading && (
          <p className="text-sm text-muted-foreground">Memuat project...</p>
        )}

        {projectError && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4">
            <p className="text-sm text-destructive">{projectError.message}</p>
          </div>
        )}

        {!projectLoading && !project && !projectError && (
          <div className="border rounded-md p-8 bg-surface text-center">
            <p className="text-sm text-muted-foreground">
              Project tidak ditemukan atau kamu tidak punya akses.
            </p>
          </div>
        )}

        {project && (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{project.name}</h2>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Status Project</CardTitle>
                <CardDescription>
                  {profile.role === 'admin' || profile.role === 'manager'
                    ? 'Update lifecycle project — UI hint, DB lenient (Q2 design decision)'
                    : 'Read-only — hanya admin & manager yang bisa update status'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <ProjectStatusSelect
                  value={project.status}
                  onChange={handleStatusChange}
                  userRole={profile.role}
                  disabled={statusUpdating}
                  id="project-status-select"
                />
                {statusUpdating && (
                  <span className="text-xs text-muted-foreground">
                    Memuat...
                  </span>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold">Tasks</h3>
                <div className="flex items-center gap-2">
                  {canCreateTask && (
                    <Button
                      onClick={() => setCreateTaskOpen(true)}
                      data-testid="create-task-button"
                    >
                      + {ACTION.CREATE_TASK}
                    </Button>
                  )}
                  <div className="relative">
                    <Tooltip tooltipKey="view-toggle" anchor="below">
                      Switch antara List / Kanban / Gantt — datanya sama, cuma cara lihatnya beda. 👀
                    </Tooltip>
                    <ViewToggle
                      current={view}
                      onChange={(v) =>
                        setSearchParams(writeViewToUrl(v, searchParams))
                      }
                    />
                  </div>
                </div>
              </div>

              {tasksLoading && (
                <p className="text-sm text-muted-foreground">Memuat tasks...</p>
              )}

              {tasksError && (
                <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4">
                  <p className="text-sm text-destructive">{tasksError.message}</p>
                </div>
              )}

              {!tasksLoading && !tasksError && (
                <>
                  <TasksFilterBar
                    filter={filter}
                    onFilterChange={setFilter}
                    groupBy={groupBy}
                    onGroupByChange={setGroupBy}
                    tasks={tasks}
                  />
                  <ViewRenderer
                    view={view}
                    tasks={filteredTasks}
                    groupBy={groupBy}
                    onLocalUpdate={updateLocalTask}
                    onRefetch={() => void refetchTasks()}
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>
      {canCreateTask && project && (
        <CreateTaskModal
          open={createTaskOpen}
          onClose={() => setCreateTaskOpen(false)}
          projectId={project.id}
          onCreated={() => void refetchTasks()}
        />
      )}
    </div>
  );
}

interface ViewToggleProps {
  current: 'list' | 'kanban' | 'gantt';
  onChange: (next: 'list' | 'kanban' | 'gantt') => void;
}

function ViewToggle({ current, onChange }: ViewToggleProps) {
  const options: { value: 'list' | 'kanban' | 'gantt'; label: string }[] = [
    { value: 'list', label: 'List' },
    { value: 'kanban', label: 'Kanban' },
    { value: 'gantt', label: 'Gantt' },
  ];
  return (
    <div className="inline-flex rounded-md border border-input bg-surface p-0.5">
      {options.map((opt) => {
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'px-3 py-1.5 text-sm rounded-sm transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface ViewRendererProps {
  view: 'list' | 'kanban' | 'gantt';
  tasks: import('@/lib/tasks').TaskWithAssignee[];
  groupBy: GroupBy;
  onLocalUpdate: (
    id: string,
    patch: Partial<import('@/lib/tasks').TaskWithAssignee>,
  ) => void;
  onRefetch: () => void;
}

function ViewRenderer({
  view,
  tasks,
  groupBy,
  onLocalUpdate,
  onRefetch,
}: ViewRendererProps) {
  if (view === 'list') {
    return (
      <ListView
        tasks={tasks}
        groupBy={groupBy}
        onLocalUpdate={onLocalUpdate}
        onRefetch={onRefetch}
      />
    );
  }
  if (view === 'kanban') {
    return (
      <KanbanView
        tasks={tasks}
        onLocalUpdate={onLocalUpdate}
        onRefetch={onRefetch}
      />
    );
  }
  // gantt
  return (
    <Suspense
      fallback={
        <div className="border rounded-md p-8 bg-surface text-center">
          <p className="text-sm text-muted-foreground">Memuat Gantt...</p>
        </div>
      }
    >
      <GanttView tasks={tasks} />
    </Suspense>
  );
}
