/**
 * URL filter state — encode/decode filter ke query string (deep linking +
 * persist on refresh).
 *
 * Convention: filter params prefixed dengan `f.` untuk avoid clash dengan
 * other query params (mis. ?view=kanban, ?page=2). Per Sprint 2 plan R8.
 *
 * Status: comma-separated list (e.g., ?f.status=todo,in_progress)
 * Team: single value (e.g., ?f.team=00000000-0000-0000-0000-00000000aaaa)
 */
import {
  PROJECT_STATUS_VALUES,
  type ProjectStatus,
} from '@/components/project/ProjectStatusBadge';
import type { ProjectsFilter } from '@/lib/projects';

const PARAM_STATUS = 'f.status';
const PARAM_TEAM = 'f.team';

export function readProjectsFilterFromUrl(
  searchParams: URLSearchParams,
): ProjectsFilter {
  const statusRaw = searchParams.get(PARAM_STATUS);
  const statuses: ProjectStatus[] = statusRaw
    ? statusRaw
        .split(',')
        .filter((s): s is ProjectStatus =>
          PROJECT_STATUS_VALUES.includes(s as ProjectStatus),
        )
    : [];
  const teamId = searchParams.get(PARAM_TEAM) ?? '';
  return { statuses, teamId };
}

export function writeProjectsFilterToUrl(
  filter: ProjectsFilter,
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  if (filter.statuses.length > 0) {
    next.set(PARAM_STATUS, filter.statuses.join(','));
  } else {
    next.delete(PARAM_STATUS);
  }
  if (filter.teamId) {
    next.set(PARAM_TEAM, filter.teamId);
  } else {
    next.delete(PARAM_TEAM);
  }
  return next;
}
