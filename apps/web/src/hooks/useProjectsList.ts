/**
 * useProjectsList — fetch projects + state management untuk ProjectsPage.
 *
 * Pattern: simple useState + useEffect (no react-query — out of scope
 * Sprint 2 per dependency budget). Refetch via refetch() callback.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  fetchProjectsWithOwner,
  type ProjectWithOwner,
} from '@/lib/projects';

interface UseProjectsListResult {
  projects: ProjectWithOwner[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useProjectsList(): UseProjectsListResult {
  const [projects, setProjects] = useState<ProjectWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProjectsWithOwner();
      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gagal load projects'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { projects, loading, error, refetch: load };
}
