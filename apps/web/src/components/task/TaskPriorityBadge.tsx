/**
 * TaskPriorityBadge — visual badge per priority.
 * 4 enum (PRD F1): low / medium / high / urgent.
 */
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/lib/tasks';

const LABEL: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

const CLASS: Record<TaskPriority, string> = {
  low: 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200',
  medium: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  high: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
  urgent: 'bg-red-50 text-red-700 ring-1 ring-red-200',
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
