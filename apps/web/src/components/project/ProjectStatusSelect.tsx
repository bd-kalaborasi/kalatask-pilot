/**
 * ProjectStatusSelect — dropdown untuk update project status.
 *
 * F14 + Q2 owner answer (UI hint only, DB lenient): semua transition
 * always allowed — UI kasih indicator di label kalau "logical next" vs
 * "lifecycle reverse", tapi DB constraint tidak block.
 *
 * Permission (per ADR-002 + RLS Sprint 1):
 * - admin: any project, full access
 * - manager: projects yang dia own (RLS USING enforce di DB)
 * - member, viewer: read-only (UI disable, RLS sudah block update)
 *
 * Memakai native <select> untuk minimum dependency. A11y native, OK
 * untuk pilot scope.
 */
import { cn } from '@/lib/utils';
import {
  PROJECT_STATUS_VALUES,
  projectStatusLabel,
  type ProjectStatus,
} from '@/components/project/ProjectStatusBadge';
import type { UserRole } from '@/lib/auth';

interface ProjectStatusSelectProps {
  value: ProjectStatus;
  onChange: (next: ProjectStatus) => void;
  /** Role current user — disable kalau bukan admin/manager */
  userRole: UserRole;
  /** Disabled override (mis. saat mutation in-flight) */
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function ProjectStatusSelect({
  value,
  onChange,
  userRole,
  disabled = false,
  className,
  id,
}: ProjectStatusSelectProps) {
  const canEdit = userRole === 'admin' || userRole === 'manager';
  const isDisabled = disabled || !canEdit;

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as ProjectStatus)}
      disabled={isDisabled}
      aria-label="Status project"
      className={cn(
        'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm',
        'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {PROJECT_STATUS_VALUES.map((s) => (
        <option key={s} value={s}>
          {projectStatusLabel(s)}
        </option>
      ))}
    </select>
  );
}
