/**
 * CommentsThread — full thread untuk a task: list + composer.
 *
 * Sprint 4.5 Step 7.
 *
 * Wraps useTaskCommentsRealtime (Step 5) + CommentItem + CommentComposer.
 * Uses optimistic patterns for low-latency UX, Realtime echo dedupes.
 */
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTaskCommentsRealtime } from '@/hooks/useTaskCommentsRealtime';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { CommentItem } from './CommentItem';
import { CommentComposer } from './CommentComposer';
import { postComment, type CommentWithAuthor } from '@/lib/comments';

interface CommentsThreadProps {
  taskId: string;
}

export function CommentsThread({ taskId }: CommentsThreadProps) {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const {
    comments,
    loading,
    error,
    refetch,
    insertOptimistic,
    updateOptimistic,
    removeOptimistic,
  } = useTaskCommentsRealtime(taskId);

  if (!profile) return null;

  async function handlePost(body: string) {
    if (!profile) return;
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: CommentWithAuthor = {
      id: optimisticId,
      task_id: taskId,
      author_id: profile.id,
      body,
      is_system: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
      },
    };
    insertOptimistic(optimistic);
    try {
      const realId = await postComment(taskId, body);
      // Remove optimistic, Realtime INSERT akan deliver real row dengan real id
      removeOptimistic(optimisticId);
      if (!realId) {
        // Fallback refetch kalau RPC tidak return id
        await refetch();
      }
    } catch (e) {
      removeOptimistic(optimisticId);
      showToast({
        tone: 'error',
        message: `Gagal post komen: ${(e as Error).message}`,
      });
      throw e;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Komen ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <p className="text-sm text-muted-foreground">Memuat komen...</p>
        )}

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}

        {!loading && !error && comments.length === 0 && (
          <EmptyState
            compact
            icon="💬"
            title="Belum ada komen di task ini"
            body="Yuk, mulai diskusi. Pakai @ untuk mention rekan."
          />
        )}

        {!loading && comments.length > 0 && (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id}>
                <CommentItem
                  comment={c}
                  currentUserId={profile.id}
                  onUpdated={updateOptimistic}
                  onRemoved={removeOptimistic}
                  onError={refetch}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="border-t pt-4">
          <CommentComposer onSubmit={handlePost} />
        </div>
      </CardContent>
    </Card>
  );
}
