/**
 * CommentItem — render single comment dengan author + timestamp + Markdown body
 * + edit/delete (own only).
 *
 * Sprint 4.5 Step 7.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CommentMarkdown } from './CommentMarkdown';
import { CommentComposer } from './CommentComposer';
import { useToast } from '@/contexts/ToastContext';
import type { CommentWithAuthor } from '@/lib/comments';
import { deleteComment, updateComment } from '@/lib/comments';
import { formatRelativeTimeID } from '@/lib/formatRelativeTime';

interface CommentItemProps {
  comment: CommentWithAuthor;
  currentUserId: string;
  onUpdated: (id: string, body: string) => void;
  onRemoved: (id: string) => void;
  onError: () => void;
}

export function CommentItem({
  comment,
  currentUserId,
  onUpdated,
  onRemoved,
  onError,
}: CommentItemProps) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAuthor = comment.author_id === currentUserId;
  const editedTime = comment.updated_at !== comment.created_at;

  async function handleSaveEdit(body: string) {
    try {
      onUpdated(comment.id, body); // optimistic
      await updateComment(comment.id, body);
      setEditing(false);
      showToast({ tone: 'success', message: 'Komen ter-update.' });
    } catch (e) {
      onError();
      showToast({
        tone: 'error',
        message: `Gagal update: ${(e as Error).message}`,
      });
    }
  }

  async function handleDelete() {
    if (!confirm('Hapus komen ini?')) return;
    try {
      setDeleting(true);
      onRemoved(comment.id); // optimistic
      await deleteComment(comment.id);
      showToast({ tone: 'success', message: 'Komen dihapus.' });
    } catch (e) {
      onError();
      showToast({
        tone: 'error',
        message: `Gagal hapus: ${(e as Error).message}`,
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-md border bg-surface p-3 space-y-2">
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium truncate">
            {comment.author?.full_name ?? 'Unknown'}
            {comment.is_system && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                🤖 system
              </span>
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTimeID(comment.created_at)}
            {editedTime && <span className="ml-1 italic">(edited)</span>}
          </span>
        </div>
        {isAuthor && !editing && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="text-xs text-destructive hover:underline underline-offset-2"
            >
              Hapus
            </button>
          </div>
        )}
      </header>
      {editing ? (
        <CommentComposer
          initialBody={comment.body}
          submitLabel="Simpan"
          onSubmit={handleSaveEdit}
          onCancel={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <CommentMarkdown body={comment.body} />
      )}
    </article>
  );
}
