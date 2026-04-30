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
import { TASK_STATUS_LABEL } from '@/lib/labels';

// Refined Asana/Monday-style Indonesian labels (Sprint 6)
const STATUS_LABEL: Record<TaskStatus, string> = TASK_STATUS_LABEL;

const STATUS_CLASS: Record<TaskStatus, string> = {
  todo:        'bg-status-todo-bg text-foreground ring-1 ring-border',
  in_progress: 'bg-status-progress-bg text-brand-deep-700 ring-1 ring-brand-sky-200',
  review:      'bg-status-review-bg text-feedback-warning ring-1 ring-feedback-warning-border',
  done:        'bg-status-done-bg text-feedback-success ring-1 ring-feedback-success-border',
  blocked:     'bg-status-blocked-bg text-feedback-danger ring-1 ring-feedback-danger-border',
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
