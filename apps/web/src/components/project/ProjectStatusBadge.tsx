/**
 * ProjectStatusBadge — visual badge per project lifecycle status.
 *
 * F14 (PRD §3.1 line 144). 5 status enum match schema CHECK constraint:
 * planning / active / on_hold / completed / archived.
 *
 * Color mapping (deduced consistent dengan task status BRAND.md §2.3):
 * - planning : zinc neutral (analog ke task 'todo')
 * - active   : brand sky (analog ke task 'in_progress', warna brand)
 * - on_hold  : amber (analog ke task 'review' — pause/wait)
 * - completed: green (analog ke task 'done')
 * - archived : zinc-darker muted (lifecycle terminal, low-emphasis)
 */
import { cn } from '@/lib/utils';

export type ProjectStatus =
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'archived';

export const PROJECT_STATUS_VALUES: readonly ProjectStatus[] = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'archived',
] as const;

// Refined Indonesian labels (Sprint 6)
const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: 'Perencanaan',
  active: 'Aktif',
  on_hold: 'Ditahan',
  completed: 'Selesai',
  archived: 'Diarsipkan',
};

const STATUS_CLASS: Record<ProjectStatus, string> = {
  planning: 'bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200',
  active: 'bg-sky-100 text-sky-800 ring-1 ring-sky-200',
  on_hold: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  archived: 'bg-zinc-200 text-zinc-500 ring-1 ring-zinc-300',
};

export function projectStatusLabel(status: ProjectStatus): string {
  return STATUS_LABEL[status];
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
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
