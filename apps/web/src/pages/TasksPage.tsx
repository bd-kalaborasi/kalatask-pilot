/**
 * TasksPage — "Tugas Saya" personal task aggregation across projects.
 *
 * Sprint 6 patch r2: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/04-tasks.html "Tugas Saya - KalaTask").
 *
 * Layout:
 * - Page header: display headline-md + count subtitle + Create CTA
 * - Tab navigation: Hari ini | Minggu ini | Akan datang | Selesai
 * - Filter row: search + assignee/project/priority pills + sort
 * - Task table grouped by deadline section (Lewat tenggat / Hari ini / Besok / Akan datang)
 *
 * Data: fetchTasksByAssignee(currentUserId) — RLS-aware.
 * Permission: any authenticated user (own tasks).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskStatusBadge } from '@/components/task/TaskStatusBadge';
import { TaskPriorityBadge } from '@/components/task/TaskPriorityBadge';
import {
  fetchTasksByAssignee,
  type TaskWithAssigneeAndProject,
} from '@/lib/tasks';
import { formatDateID } from '@/lib/formatDate';

type Tab = 'today' | 'week' | 'upcoming' | 'done';

const TAB_LABEL: Record<Tab, string> = {
  today: 'Hari ini',
  week: 'Minggu ini',
  upcoming: 'Akan datang',
  done: 'Selesai',
};

interface TaskBucket {
  key: string;
  label: string;
  tone: 'overdue' | 'today' | 'soon' | 'later' | 'done';
  tasks: TaskWithAssigneeAndProject[];
}

export function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<TaskWithAssigneeAndProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    setLoading(true);
    fetchTasksByAssignee(profile.id)
      .then((data) => {
        if (mounted) {
          setTasks(data);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (mounted) setError(err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [profile]);

  const tabCounts = useMemo(() => bucketCounts(tasks), [tasks]);
  const visibleTasks = useMemo(() => {
    let list = tasksForTab(tasks, activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.project?.name.toLowerCase().includes(q),
      );
    }
    return list;
  }, [tasks, activeTab, search]);

  const buckets = useMemo(() => groupByDeadline(visibleTasks, activeTab), [visibleTasks, activeTab]);

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">Tugas Saya</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              {tasks.length === 0
                ? 'Belum ada tugas yang di-assign ke kamu.'
                : `${tabCounts.today + tabCounts.week + tabCounts.upcoming} tugas aktif yang harus kamu selesaikan`}
            </p>
          </div>
        </header>

        {/* Tab navigation */}
        <nav role="tablist" aria-label="Filter tugas berdasarkan waktu" className="flex items-center gap-8 border-b border-outline-variant">
          {(['today', 'week', 'upcoming', 'done'] as const).map((tab) => {
            const count = tabCounts[tab];
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab)}
                className={
                  active
                    ? 'pb-3 -mb-px border-b-2 border-primary-container text-primary-container font-semibold flex items-center gap-2'
                    : 'pb-3 -mb-px border-b-2 border-transparent text-on-surface-variant hover:text-on-surface font-medium flex items-center gap-2 transition-colors'
                }
              >
                {TAB_LABEL[tab]}
                <span
                  className={
                    active
                      ? 'bg-primary-container text-on-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold'
                      : 'bg-surface-container text-on-surface-variant text-[10px] px-1.5 py-0.5 rounded-full font-bold'
                  }
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Search row */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tugas atau project..."
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-kt-md text-body-md focus:ring-2 focus:ring-primary-container focus:border-transparent transition-all"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" aria-hidden="true">⌕</span>
          </div>
          <span className="text-body-sm text-on-surface-variant">
            {visibleTasks.length} tugas
          </span>
        </div>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Memuat tugas...</p>
        )}

        {error && (
          <div className="border border-feedback-danger/50 bg-feedback-danger-bg rounded-kt-md p-4">
            <p className="text-body-md text-feedback-danger">{error.message}</p>
          </div>
        )}

        {!loading && !error && visibleTasks.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-kt-lg shadow-brand-sm">
            <EmptyState
              icon="✨"
              title={tasks.length === 0 ? 'Belum ada tugas di-assign' : 'Tab ini kosong'}
              body={
                tasks.length === 0
                  ? 'Tugas yang di-assign ke kamu akan muncul di sini. Manager atau admin bisa assign tugas baru.'
                  : 'Geser ke tab lain untuk lihat tugas yang sesuai. Atau ubah kata kunci pencarian.'
              }
            />
          </div>
        )}

        {!loading && !error && visibleTasks.length > 0 && (
          <section className="bg-surface-container-lowest rounded-kt-lg shadow-brand-sm border border-outline-variant overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-3 flex items-center text-label-md font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant bg-surface-container-low/60">
              <div className="w-1/2">Tugas</div>
              <div className="w-1/6">Project</div>
              <div className="w-1/12 text-center">Prioritas</div>
              <div className="w-1/6 text-center">Deadline</div>
              <div className="w-1/6 text-right">Status</div>
            </div>

            {/* Buckets */}
            {buckets.map((bucket) => (
              <BucketGroup key={bucket.key} bucket={bucket} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

interface BucketGroupProps {
  bucket: TaskBucket;
}

const BUCKET_TONE: Record<TaskBucket['tone'], { row: string; label: string }> = {
  overdue: { row: 'bg-feedback-danger-bg/30', label: 'text-feedback-danger' },
  today:   { row: 'bg-feedback-warning-bg/30', label: 'text-feedback-warning' },
  soon:    { row: 'bg-primary-container/5', label: 'text-primary-container' },
  later:   { row: '', label: 'text-on-surface-variant' },
  done:    { row: 'bg-feedback-success-bg/20', label: 'text-feedback-success' },
};

function BucketGroup({ bucket }: BucketGroupProps) {
  const tone = BUCKET_TONE[bucket.tone];
  return (
    <div>
      <div className={`px-4 py-2.5 ${tone.row} border-b border-outline-variant/60 flex items-center gap-2`}>
        <span className={`font-label-lg font-bold uppercase tracking-wide ${tone.label}`}>
          {bucket.label}
        </span>
        <span className="text-body-sm text-on-surface-variant">({bucket.tasks.length})</span>
      </div>
      <ul className="divide-y divide-outline-variant/60">
        {bucket.tasks.map((task) => (
          <li key={task.id} className="hover:bg-surface-container-low/50 transition-colors">
            <Link
              to={`/projects/${task.project_id}/tasks/${task.id}`}
              className="flex items-center px-4 py-3 group"
            >
              <div className="w-1/2 min-w-0">
                <p className="text-body-md font-medium text-on-surface group-hover:text-primary-container transition-colors truncate">
                  {task.title}
                </p>
              </div>
              <div className="w-1/6 min-w-0">
                {task.project && (
                  <span className="inline-block px-2 py-0.5 bg-primary-container/10 text-primary-container text-[11px] font-bold rounded border border-primary-container/20 truncate max-w-full">
                    {task.project.name}
                  </span>
                )}
              </div>
              <div className="w-1/12 flex justify-center">
                <TaskPriorityBadge priority={task.priority} />
              </div>
              <div className="w-1/6 text-center">
                {task.deadline ? (
                  <span className={`text-body-sm font-medium ${bucket.tone === 'overdue' ? 'text-feedback-danger' : 'text-on-surface-variant'}`}>
                    {formatDateID(task.deadline)}
                  </span>
                ) : (
                  <span className="text-body-sm text-on-surface-variant/60">—</span>
                )}
              </div>
              <div className="w-1/6 flex justify-end">
                <TaskStatusBadge status={task.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// Bucket utilities
// ============================================================

function bucketCounts(tasks: TaskWithAssigneeAndProject[]) {
  const counts = { today: 0, week: 0, upcoming: 0, done: 0 };
  for (const t of tasks) {
    if (t.status === 'done') {
      counts.done++;
      continue;
    }
    const days = daysUntilDeadline(t.deadline);
    if (days === null || days > 7) counts.upcoming++;
    else if (days <= 1) counts.today++;
    else counts.week++;
  }
  return counts;
}

function tasksForTab(tasks: TaskWithAssigneeAndProject[], tab: Tab): TaskWithAssigneeAndProject[] {
  if (tab === 'done') return tasks.filter((t) => t.status === 'done');
  return tasks.filter((t) => {
    if (t.status === 'done') return false;
    const days = daysUntilDeadline(t.deadline);
    if (tab === 'today') return days !== null && days <= 1;
    if (tab === 'week') return days !== null && days > 1 && days <= 7;
    if (tab === 'upcoming') return days === null || days > 7;
    return true;
  });
}

function groupByDeadline(
  tasks: TaskWithAssigneeAndProject[],
  tab: Tab,
): TaskBucket[] {
  if (tab === 'done') {
    return [
      {
        key: 'done',
        label: 'Sudah selesai',
        tone: 'done',
        tasks: [...tasks].sort((a, b) =>
          (b.completed_at ?? '').localeCompare(a.completed_at ?? ''),
        ),
      },
    ];
  }

  const overdue: TaskWithAssigneeAndProject[] = [];
  const today: TaskWithAssigneeAndProject[] = [];
  const soon: TaskWithAssigneeAndProject[] = [];
  const later: TaskWithAssigneeAndProject[] = [];

  for (const t of tasks) {
    const days = daysUntilDeadline(t.deadline);
    if (days === null) {
      later.push(t);
    } else if (days < 0) {
      overdue.push(t);
    } else if (days <= 1) {
      today.push(t);
    } else if (days <= 7) {
      soon.push(t);
    } else {
      later.push(t);
    }
  }

  const buckets: TaskBucket[] = [];
  if (overdue.length > 0) buckets.push({ key: 'overdue', label: 'Lewat tenggat', tone: 'overdue', tasks: overdue });
  if (today.length > 0) buckets.push({ key: 'today', label: 'Hari ini & besok', tone: 'today', tasks: today });
  if (soon.length > 0) buckets.push({ key: 'soon', label: '7 hari ke depan', tone: 'soon', tasks: soon });
  if (later.length > 0) buckets.push({ key: 'later', label: 'Tanpa deadline / nanti', tone: 'later', tasks: later });

  return buckets;
}

function daysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null;
  try {
    const target = new Date(deadline);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  } catch {
    return null;
  }
}
