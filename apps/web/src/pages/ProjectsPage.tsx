/**
 * ProjectsPage — list semua project visible ke current user.
 *
 * F3 partial (project list as part of view structure) + F11.b
 * (per-view filter). Sprint 2 Step 3.
 *
 * Filter persistent via URL query string (`f.status`, `f.team`).
 */
import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjectsList } from '@/hooks/useProjectsList';
import { useTeamsList } from '@/hooks/useTeamsList';
import {
  applyProjectsFilter,
  type ProjectsFilter,
} from '@/lib/projects';
import {
  readProjectsFilterFromUrl,
  writeProjectsFilterToUrl,
} from '@/lib/filterUrlState';
import { ProjectStatusBadge } from '@/components/project/ProjectStatusBadge';
import { ProjectsFilterBar } from '@/components/project/ProjectsFilterBar';
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/layout/AppHeader';

export function ProjectsPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projects, loading, error, refetch } = useProjectsList();
  const { teams } = useTeamsList();

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

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {projects.length === 0
              ? 'Belum ada project visible untuk kamu.'
              : `${filteredProjects.length} dari ${projects.length} project`}
          </p>
        </div>

        <ProjectsFilterBar
          filter={filter}
          onChange={setFilter}
          teams={teams}
          userRole={profile.role}
        />

        {loading && (
          <p className="text-sm text-muted-foreground">Memuat projects...</p>
        )}

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Gagal load projects.
            </p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Coba lagi
            </Button>
          </div>
        )}

        {!loading && !error && filteredProjects.length === 0 && (
          <div className="border rounded-md p-8 bg-surface text-center">
            <p className="text-sm text-muted-foreground">
              {projects.length === 0
                ? 'Belum ada project. Admin atau Manager bisa buat project baru.'
                : 'Filter ini gak nemu apa-apa. Reset filter?'}
            </p>
          </div>
        )}

        {!loading && filteredProjects.length > 0 && (
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/projects/${p.id}`}
                  className="block border rounded-md p-4 bg-surface hover:shadow-brand-md transition-shadow space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium leading-tight line-clamp-2">
                      {p.name}
                    </h3>
                    <ProjectStatusBadge status={p.status} />
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {p.description}
                    </p>
                  )}
                  {p.owner && (
                    <p className="text-xs text-muted-foreground">
                      Owner: {p.owner.full_name}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
