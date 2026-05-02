/**
 * TaskPriorityBadge — visual badge per priority.
 * 4 enum (PRD F1): low / medium / high / urgent.
 */
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/lib/tasks';
import { TASK_PRIORITY_LABEL } from '@/lib/labels';

// Refined Indonesian labels (Sprint 6)
const LABEL: Record<TaskPriority, string> = TASK_PRIORITY_LABEL;

const CLASS: Record<TaskPriority, string> = {
  low:    'bg-surface-container text-muted-foreground ring-1 ring-border',
  medium: 'bg-feedback-info-bg text-brand-deep-700 ring-1 ring-feedback-info-border',
  high:   'bg-feedback-warning-bg text-feedback-warning ring-1 ring-feedback-warning-border',
  urgent: 'bg-feedback-danger-bg text-feedback-danger ring-1 ring-feedback-danger-border',
};

interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  className?: string;
}

export function TaskPriorityBadge({
  priority,
  className,
}: TaskPriorityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        CLASS[priority],
        className,
      )}
    >
      {LABEL[priority]}
    </span>
  );
}
