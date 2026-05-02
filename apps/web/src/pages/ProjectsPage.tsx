/**
 * ProjectsPage — Daftar Proyek KalaTask.
 *
 * Sprint 6 patch: structure adopted from Stitch v1 export
 * (docs/stitch-html-export/02-projects.html "Daftar Proyek").
 *
 * Layout:
 * - Page header: title + count subtitle + Create CTA
 * - Status pill filter row (Semua / Perencanaan / Aktif / Ditahan / Selesai / Diarsipkan)
 *   with inline counts; uses ProjectStatus values directly.
 * - Card grid: 1/2/3 cols responsive; per card has status pill +
 *   title + description + owner + Detail link, Stitch lift-on-hover.
 *
 * F3 partial (project list as part of view structure) + F11.b
 * (per-view filter). Filter persistent via URL query string.
 */
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectsList } from '@/hooks/useProjectsList';
import { useTeamsList } from '@/hooks/useTeamsList';
import {
  applyProjectsFilter,
  EMPTY_PROJECTS_FILTER,
  type ProjectsFilter,
} from '@/lib/projects';
import type { ProjectStatus } from '@/components/project/ProjectStatusBadge';
import {
  readProjectsFilterFromUrl,
  writeProjectsFilterToUrl,
} from '@/lib/filterUrlState';
import { ProjectStatusBadge } from '@/components/project/ProjectStatusBadge';
import { CreateProjectModal } from '@/components/project/CreateProjectModal';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { AppHeader } from '@/components/layout/AppHeader';
import { ACTION } from '@/lib/labels';
import { PROJECT_STATUS_LABEL } from '@/lib/labels';

const STATUS_FILTER_ORDER: ProjectStatus[] = [
  'planning',
  'active',
  'on_hold',
  'completed',
  'archived',
];

export function ProjectsPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, error, refetch } = useProjectsList();
  const { teams } = useTeamsList();
  const [createOpen, setCreateOpen] = useState(false);

  const canCreate = profile?.role === 'admin' || profile?.role === 'manager';

  const filter = useMemo(
    () => readProjectsFilterFromUrl(searchParams),
    [searchParams],
  );

  function setFilter(next: ProjectsFilter) {
    setSearchParams(writeProjectsFilterToUrl(next, searchParams));
  }

  const filteredProjects = useMemo(
    () => applyProjectsFilter(projects, filter),
    [projects, filter],
  );

  const statusCounts = useMemo(() => {
    const counts: Record<ProjectStatus, number> = {
      planning: 0,
      active: 0,
      on_hold: 0,
      completed: 0,
      archived: 0,
    };
    for (const p of projects) counts[p.status]++;
    return counts;
  }, [projects]);

  const activeCount = statusCounts.active;

  if (!profile) return null;

  function toggleStatusPill(status: ProjectStatus | 'all') {
    if (status === 'all') {
      setFilter({ ...filter, statuses: [] });
      return;
    }
    const isCurrent = filter.statuses.includes(status);
    const next = isCurrent
      ? filter.statuses.filter((s) => s !== status)
      : [...filter.statuses, status];
    setFilter({ ...filter, statuses: next });
  }

  function resetFilter() {
    setFilter(EMPTY_PROJECTS_FILTER);
  }

  const allActive = filter.statuses.length === 0;
  const hasActiveFilter = filter.statuses.length > 0 || filter.teamId !== '';
  const showTeamFilter =
    profile.role === 'admin' || profile.role === 'viewer';

  return (
    <div className="min-h-screen bg-canvas animate-fade-in">
      <AppHeader />
      <main className="max-w-[1280px] mx-auto px-margin-mobile md:px-margin-desktop py-8 space-y-6">
        {/* Page header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="font-display text-headline-md text-on-surface">Proyek</h1>
            <p className="text-body-md text-on-surface-variant mt-1">
              {projects.length === 0
                ? 'Belum ada project visible untuk kamu.'
                : `${activeCount} dari ${projects.length} project aktif sedang berjalan`}
            </p>
          </div>
          {canCreate && (
            <Button
              variant="brand"
              onClick={() => setCreateOpen(true)}
              data-testid="create-project-button"
            >
              + {ACTION.CREATE_PROJECT}
            </Button>
          )}
        </header>

        {/* Status pill filter row + team selector + Reset */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              active={allActive}
              label="Semua"
              count={projects.length}
              onClick={() => toggleStatusPill('all')}
            />
            {STATUS_FILTER_ORDER.map((status) => (
              <FilterPill
                key={status}
                active={filter.statuses.includes(status)}
                label={PROJECT_STATUS_LABEL[status]}
                count={statusCounts[status]}
                onClick={() => toggleStatusPill(status)}
              />
            ))}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={resetFilter}
                className="ml-auto text-label-md font-medium text-on-surface-variant hover:text-primary-container transition-colors px-3 py-1.5 rounded-full hover:bg-surface-container"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* Team filter — admin/viewer cross-team scope */}
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label
              htmlFor="filter-team"
              className={
                showTeamFilter
                  ? 'text-label-md text-on-surface-variant'
                  : 'sr-only'
              }
            >
              Tim
            </label>
            <select
              id="filter-team"
              value={filter.teamId}
              onChange={(e) => setFilter({ ...filter, teamId: e.target.value })}
              hidden={!showTeamFilter}
              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-kt-md text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              disabled={!showTeamFilter}
            >
              <option value="">Semua tim</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {loading && (
          <p className="text-body-md text-on-surface-variant">Memuat projects...</p>
        )}

        {error && (
          <div className="border border-feedback-danger/50 bg-feedback-danger-bg rounded-kt-md p-4 space-y-2">
            <p className="text-body-md font-medium text-feedback-danger">
              Gagal load projects.
            </p>
            <p className="text-body-md text-on-surface-variant">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-kt-lg shadow-brand-sm">
            {projects.length === 0 ? (
              <EmptyState
                icon="📋"
                title="Belum ada project di sini"
                body={
                  canCreate
                    ? 'Yuk bikin project pertama untuk mulai kerja bareng tim.'
                    : 'Admin atau Manager bisa bikin project baru. Sample "Project Contoh" juga sudah disiapin di onboarding.'
                }
                ctaLabel={canCreate ? 'Buat project pertama' : undefined}
                ctaOnClick={canCreate ? () => setCreateOpen(true) : undefined}
              />
            ) : (
              <EmptyState
                icon="🔍"
                title="Filter ini nggak nemu apa-apa"
                body="Coba longgarin filter status atau team — atau reset filter biar lihat semua."
                ctaLabel="Reset filter"
                ctaOnClick={() => setFilter(EMPTY_PROJECTS_FILTER)}
              />
            )}
          </div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="block group bg-surface-container-lowest rounded-kt-lg p-6 shadow-brand-sm border border-outline-variant hover:-translate-y-1 hover:shadow-brand-md transition-all duration-base ease-brand"
                >
                  <header className="flex justify-between items-start mb-4">
                    <ProjectStatusBadge status={p.status} />
                    <span className="text-[10px] text-on-surface-variant font-medium italic">
                      {formatRelativeTime(p.updated_at)}
                    </span>
                  </header>
                  <h3 className="text-title-lg font-bold text-on-surface mb-2 line-clamp-2 group-hover:text-primary-container transition-colors">
                    {p.name}
                  </h3>
                  {p.description && (
                    <p className="text-body-md text-on-surface-variant line-clamp-2 mb-4">
                      {p.description}
                    </p>
                  )}
                  {p.owner && (
                    <div className="flex items-center gap-2 mb-4">
                      <div
                        className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[10px] font-bold text-on-secondary-container"
                        aria-hidden="true"
                      >
                        {p.owner.full_name?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="text-body-sm text-on-surface-variant font-medium">
                        {p.owner.full_name}
                      </span>
                    </div>
                  )}
                  <footer className="flex justify-between items-center pt-4 border-t border-outline-variant/60">
                    <span className="text-body-sm text-on-surface-variant">Buka detail</span>
                    <span aria-hidden="true" className="text-primary-container group-hover:translate-x-1 transition-transform">
                      →
                    </span>
                  </footer>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      {canCreate && (
        <CreateProjectModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => void refetch()}
        />
      )}
    </div>
  );
}

interface FilterPillProps {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}

function FilterPill({ active, label, count, onClick }: FilterPillProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={
        active
          ? 'px-4 py-1.5 rounded-full bg-primary-fixed text-on-primary-fixed text-label-lg font-semibold flex items-center gap-2 transition-colors'
          : 'px-4 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-label-lg flex items-center gap-2 transition-colors'
      }
    >
      <span>{label}</span>
      <span className={active ? 'font-bold' : 'opacity-60'} aria-hidden="true">
        {count}
      </span>
    </button>
  );
}

function formatRelativeTime(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(ms / (60 * 1000));
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `Update ${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Update ${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Update ${days} hari lalu`;
    return `Update ${new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
  } catch {
    return '';
  }
}
