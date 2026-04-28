import { useCallback, useEffect, useState } from 'react';
import { fetchTasksByProject, type TaskWithAssignee } from '@/lib/tasks';

interface UseTasksByProjectResult {
  tasks: TaskWithAssignee[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  /** Replace local task by id (untuk optimistic update) */
  updateLocal: (id: string, patch: Partial<TaskWithAssignee>) => void;
}

export function useTasksByProject(
  projectId: string | undefined,
): UseTasksByProjectResult {
  const [tasks, setTasks] = useState<TaskWithAssignee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTasksByProject(projectId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gagal load tasks'));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateLocal(id: string, patch: Partial<TaskWithAssignee>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  return { tasks, loading, error, refetch: load, updateLocal };
}
