/**
 * TaskStatusBadge — visual badge per task status.
 *
 * 5 enum (PRD F1/F3/F4 + tasks CHECK constraint):
 * todo / in_progress / review / done / blocked.
 *
 * Color tokens dari theme.css §4 (BRAND.md §2.3).
 */
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/lib/tasks';

const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Todo',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};

const STATUS_CLASS: Record<TaskStatus, string> = {
  todo: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200',
  in_progress: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',
  review: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  done: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  blocked: 'bg-red-100 text-red-700 ring-1 ring-red-200',
};

export function taskStatusLabel(status: TaskStatus): string {
  return STATUS_LABEL[status];
}

interface TaskStatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export function TaskStatusBadge({ status, className }: TaskStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASS[status],
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}
