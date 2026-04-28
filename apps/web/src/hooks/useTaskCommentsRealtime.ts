/**
 * useTaskCommentsRealtime — Sprint 4.5 Step 5 + ADR-008.
 *
 * Pattern hybrid Realtime + initial fetch:
 *   1. Initial fetchComments(taskId) — populate state
 *   2. Subscribe channel `task:${taskId}` postgres_changes
 *      INSERT/UPDATE/DELETE filter task_id=eq.${taskId}
 *   3. Apply server payload to local state with id-dedup (optimistic
 *      INSERT + Realtime echo same id → skip)
 *   4. Cleanup unsubscribe on unmount (memory-leak guard)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchComments,
  type CommentWithAuthor,
} from '@/lib/comments';

interface UseTaskCommentsRealtimeResult {
  comments: CommentWithAuthor[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  /** Optimistic insert sebelum server INSERT echo */
  insertOptimistic: (comment: CommentWithAuthor) => void;
  /** Optimistic update body */
  updateOptimistic: (id: string, body: string) => void;
  /** Optimistic delete */
  removeOptimistic: (id: string) => void;
}

export function useTaskCommentsRealtime(
  taskId: string | undefined,
): UseTaskCommentsRealtimeResult {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!taskId) {
      setComments([]);
      setLoading(false);
      return;
    }
    try {
      const list = await fetchComments(taskId);
      setComments(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Gagal load comments'));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;
    let mounted = true;

    void refetch();

    const channel = supabase
      .channel(`task:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          if (!mounted) return;
          const newRow = payload.new as CommentWithAuthor;
          // Dedup via id — kalau optimistic insert sudah masuk
          setComments((prev) => {
            if (prev.some((c) => c.id === newRow.id)) return prev;
            return [...prev, newRow].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
          });
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as CommentWithAuthor;
          setComments((prev) =>
            prev.map((c) => (c.id === row.id ? { ...c, ...row } : c)),
          );
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comments',
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          if (!mounted) return;
          const row = payload.old as { id: string };
          setComments((prev) => prev.filter((c) => c.id !== row.id));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [taskId, refetch]);

  const insertOptimistic = useCallback((comment: CommentWithAuthor) => {
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
  }, []);

  const updateOptimistic = useCallback((id: string, body: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, body, updated_at: new Date().toISOString() } : c)),
    );
  }, []);

  const removeOptimistic = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    comments,
    loading,
    error,
    refetch,
    insertOptimistic,
    updateOptimistic,
    removeOptimistic,
  };
}
