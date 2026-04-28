/**
 * ProjectsFilterBar — filter UI untuk ProjectsPage.
 *
 * Filter:
 * - Status: multi-select via checkbox group
 * - Team: dropdown (only visible kalau admin/viewer — manager/member
 *   sudah di-scope team via RLS)
 */
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  PROJECT_STATUS_VALUES,
  projectStatusLabel,
  type ProjectStatus,
} from '@/components/project/ProjectStatusBadge';
import { Button } from '@/components/ui/button';
import type { ProjectsFilter } from '@/lib/projects';
import type { Team } from '@/lib/teams';
import type { UserRole } from '@/lib/auth';

interface ProjectsFilterBarProps {
  filter: ProjectsFilter;
  onChange: (next: ProjectsFilter) => void;
  teams: Team[];
  userRole: UserRole;
}

export function ProjectsFilterBar({
  filter,
  onChange,
  teams,
  userRole,
}: ProjectsFilterBarProps) {
  const showTeamFilter = userRole === 'admin' || userRole === 'viewer';

  const activeFilterCount = useMemo(() => {
    let n = filter.statuses.length;
    if (filter.teamId) n += 1;
    return n;
  }, [filter]);

  function toggleStatus(s: ProjectStatus) {
    const next = filter.statuses.includes(s)
      ? filter.statuses.filter((x) => x !== s)
      : [...filter.statuses, s];
    onChange({ ...filter, statuses: next });
  }

  function setTeamId(id: string) {
    onChange({ ...filter, teamId: id });
  }

  function reset() {
    onChange({ statuses: [], teamId: '' });
  }

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-md bg-surface">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Filter</h3>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset ({activeFilterCount})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs uppercase tracking-wide text-muted-foreground">
            Status
          </legend>
          <div className="flex flex-wrap gap-2">
            {PROJECT_STATUS_VALUES.map((s) => {
              const active = filter.statuses.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-input hover:bg-accent',
                  )}
                  aria-pressed={active}
                >
                  {projectStatusLabel(s)}
                </button>
              );
            })}
          </div>
        </fieldset>

        {showTeamFilter && teams.length > 0 && (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="filter-team"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Team
            </label>
            <select
              id="filter-team"
              value={filter.teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Semua team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
