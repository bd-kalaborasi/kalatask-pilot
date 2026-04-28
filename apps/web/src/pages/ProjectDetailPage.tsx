/**
 * ProjectDetailPage — single project view dengan task list + view toggle.
 *
 * Step 3: stub (project metadata + status selector).
 * Step 4: tasks list (List view).
 * Step 5: Kanban view.
 * Step 6: Gantt view.
 * Step 7: view toggle + URL persist.
 */
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ProjectStatusBadge,
  type ProjectStatus,
} from '@/components/project/ProjectStatusBadge';
import { ProjectStatusSelect } from '@/components/project/ProjectStatusSelect';
import { supabase } from '@/lib/supabase';
import { updateProjectStatus, type Project } from '@/lib/projects';

export function ProjectDetailPage() {
  const { profile } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('projects')
          .select(
            'id, name, description, owner_id, status, created_at, updated_at, completed_at',
          )
          .eq('id', projectId)
          .maybeSingle();
        if (err) throw err;
        if (mounted) setProject(data as Project | null);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Gagal load project'));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [projectId]);

  async function handleStatusChange(next: ProjectStatus) {
    if (!project) return;
    const previous = project.status;
    // Optimistic update
    setProject({ ...project, status: next });
    setStatusUpdating(true);
    try {
      await updateProjectStatus({ id: project.id, status: next });
    } catch (err) {
      // Rollback
      setProject({ ...project, status: previous });
      setError(err instanceof Error ? err : new Error('Gagal update status'));
    } finally {
      setStatusUpdating(false);
    }
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-dashboard mx-auto px-6 py-8 space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link to="/projects">← Kembali ke Projects</Link>
        </Button>

        {loading && <p className="text-sm text-muted-foreground">Memuat project...</p>}

        {error && (
          <div className="border border-destructive/50 bg-destructive/10 rounded-md p-4">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}

        {!loading && !project && !error && (
          <div className="border rounded-md p-8 bg-surface text-center">
            <p className="text-sm text-muted-foreground">
              Project tidak ditemukan atau kamu tidak punya akses.
            </p>
          </div>
        )}

        {project && (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold">{project.name}</h2>
                <ProjectStatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Status Project</CardTitle>
                <CardDescription>
                  {profile.role === 'admin' || profile.role === 'manager'
                    ? 'Update lifecycle project — UI hint, DB lenient (Q2 design decision)'
                    : 'Read-only — hanya admin & manager yang bisa update status'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <ProjectStatusSelect
                  value={project.status}
                  onChange={handleStatusChange}
                  userRole={profile.role}
                  disabled={statusUpdating}
                  id="project-status-select"
                />
                {statusUpdating && (
                  <span className="text-xs text-muted-foreground">
                    Memuat...
                  </span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Tasks</CardTitle>
                <CardDescription>
                  Step 4-7 Sprint 2 — List + Kanban + Gantt view
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Task views sedang dibangun (Sprint 2 lanjutan).
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
