/**
 * KanbanView — drag-drop antar kolom status (F3 AC-1 + AC-2).
 *
 * 5 kolom (Q1 owner answer):
 * Todo / In Progress / Review / Done / Blocked
 *
 * Blocked column visual urgency dengan red border + red header per BRAND.md
 * notif-critical color (#EF4444) — workflow visibility blocker.
 *
 * Optimistic UI + rollback on RLS error:
 * - Drag → update local state immediately
 * - PATCH ke DB
 * - Error → revert local state + toast
 *
 * Q3 stub: notif emission deferred ke Sprint 3 (lihat lib/notifStub.ts).
 */
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  TASK_STATUS_VALUES,
  updateTaskStatus,
  type TaskStatus,
  type TaskWithAssignee,
} from '@/lib/tasks';
import { TaskPriorityBadge } from '@/components/task/TaskPriorityBadge';
import { formatDateID } from '@/lib/formatDate';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';

interface KanbanViewProps {
  tasks: TaskWithAssignee[];
  /** Optimistic local update — set NEW status di state parent */
  onLocalUpdate: (id: string, patch: Partial<TaskWithAssignee>) => void;
  /** Refetch on error — sync state dari server kalau rollback gagal */
  onRefetch: () => void;
}

const COLUMN_LABEL: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

const COLUMN_HEADER_CLASS: Record<TaskStatus, string> = {
  todo: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  in_progress: 'bg-sky-100 text-sky-800 border-sky-200',
  review: 'bg-amber-100 text-amber-800 border-amber-200',
  done: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  blocked: 'bg-red-100 text-red-700 border-red-300', // Q1 visual urgency
};

interface DragArgs {
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
}

export function KanbanView({ tasks, onLocalUpdate, onRefetch }: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const { mutate: mutateStatus } = useOptimisticMutation<DragArgs>({
    mutationFn: ({ taskId, toStatus }) =>
      updateTaskStatus({ id: taskId, status: toStatus }),
    onApply: ({ taskId, toStatus }) => {
      onLocalUpdate(taskId, { status: toStatus });
    },
    onRollback: ({ taskId, fromStatus }) => {
      onLocalUpdate(taskId, { status: fromStatus });
      onRefetch();
    },
    errorMessage: 'Gagal update status task. Coba lagi atau refresh halaman.',
    // No success toast — drag-drop UI itself = visual feedback
    successMessage: false,
  });

  const tasksByStatus: Record<TaskStatus, TaskWithAssignee[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
    blocked: [],
  };
  for (const t of tasks) {
    tasksByStatus[t.status].push(t);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId) return;
    const targetStatus = String(overId) as TaskStatus;
    if (!TASK_STATUS_VALUES.includes(targetStatus)) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === targetStatus) return;

    await mutateStatus({
      taskId,
      fromStatus: task.status,
      toStatus: targetStatus,
    });
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {TASK_STATUS_VALUES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              label={COLUMN_LABEL[status]}
              headerClass={COLUMN_HEADER_CLASS[status]}
              tasks={tasksByStatus[status]}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  headerClass: string;
  tasks: TaskWithAssignee[];
}

function KanbanColumn({ status, label, headerClass, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-md border bg-surface flex flex-col min-h-[200px] transition-colors',
        isOver && 'ring-2 ring-primary',
      )}
      data-status={status}
    >
      <header
        className={cn(
          'px-3 py-2 text-xs uppercase tracking-wide font-semibold rounded-t-md border-b',
          headerClass,
        )}
      >
        {label}
        <span className="ml-2 font-normal opacity-70">({tasks.length})</span>
      </header>
      <div className="flex-1 p-2 space-y-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Belum ada task
          </p>
        ) : (
          tasks.map((t) => <KanbanCard key={t.id} task={t} />)
        )}
      </div>
    </div>
  );
}

interface KanbanCardProps {
  task: TaskWithAssignee;
}

function KanbanCard({ task }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-background border rounded-md p-2 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-brand-sm space-y-1.5"
      role="button"
      aria-label={`Task ${task.title}, drag untuk pindah status`}
    >
      <p className="text-sm font-medium leading-tight line-clamp-2">
        {task.title}
      </p>
      <div className="flex items-center justify-between gap-1">
        <TaskPriorityBadge priority={task.priority} />
        {task.deadline && (
          <span className="text-[10px] font-mono text-muted-foreground">
            {formatDateID(task.deadline)}
          </span>
        )}
      </div>
      {task.assignee && (
        <p className="text-xs text-muted-foreground truncate">
          {task.assignee.full_name}
        </p>
      )}
    </article>
  );
}
