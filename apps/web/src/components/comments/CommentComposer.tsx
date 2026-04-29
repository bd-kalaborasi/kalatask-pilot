/**
 * CommentComposer — textarea + @mention autocomplete + submit.
 *
 * Sprint 4.5 Step 7 (Q2 owner override — UUID-based mention).
 *
 * Pattern:
 *   - Detect '@' character ke left of cursor → open MentionAutocomplete
 *   - Track query (text after '@' until space/EOL) → pass ke autocomplete
 *   - On user select → inject token @[Full Name](uuid) ke body, replace
 *     '@query' fragment dengan token
 *   - Submit via onSubmit prop (parent post via lib RPC)
 */
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MentionAutocomplete } from './MentionAutocomplete';
import { buildMentionToken, COMMENT_BODY_MAX, type MentionUser } from '@/lib/comments';

interface CommentComposerProps {
  onSubmit: (body: string) => Promise<void>;
  initialBody?: string;
  submitLabel?: string;
  placeholder?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function CommentComposer({
  onSubmit,
  initialBody = '',
  submitLabel = 'Post komen',
  placeholder = 'Tulis komen... pakai @ untuk mention rekan',
  onCancel,
  autoFocus = false,
}: CommentComposerProps) {
  const [body, setBody] = useState(initialBody);
  const [submitting, setSubmitting] = useState(false);
  const [mentionState, setMentionState] = useState<{
    open: boolean;
    query: string;
    triggerStart: number; // position of '@' in body
  }>({ open: false, query: '', triggerStart: -1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);

    // Detect @-trigger: find last '@' before cursor that isn't in a token already
    const cursor = e.target.selectionStart;
    const left = value.slice(0, cursor);
    const atIdx = left.lastIndexOf('@');
    if (atIdx === -1) {
      setMentionState({ open: false, query: '', triggerStart: -1 });
      return;
    }
    // @ must be at start or preceded by space/newline (not e.g., email)
    const charBefore = atIdx === 0 ? ' ' : left[atIdx - 1];
    if (!/\s/.test(charBefore)) {
      setMentionState({ open: false, query: '', triggerStart: -1 });
      return;
    }
    // query = chars setelah '@' sampai cursor, no whitespace allowed
    const query = left.slice(atIdx + 1);
    if (/[\s\n]/.test(query)) {
      // user typed space — close
      setMentionState({ open: false, query: '', triggerStart: -1 });
      return;
    }
    setMentionState({ open: true, query, triggerStart: atIdx });
  }

  function handleSelectMention(user: MentionUser) {
    if (mentionState.triggerStart < 0) return;
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const before = body.slice(0, mentionState.triggerStart);
    const after = body.slice(cursor);
    const token = buildMentionToken({ id: user.id, full_name: user.full_name });
    const newBody = `${before}${token} ${after}`;
    setBody(newBody);
    setMentionState({ open: false, query: '', triggerStart: -1 });
    // Restore focus
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = before.length + token.length + 1;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.length > COMMENT_BODY_MAX) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setBody('');
    } finally {
      setSubmitting(false);
    }
  }

  const tooLong = body.length > COMMENT_BODY_MAX;

  return (
    <form onSubmit={handleSubmit} className="relative space-y-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={handleChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        rows={3}
        className="w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-deep"
        aria-label="Komen baru"
        maxLength={COMMENT_BODY_MAX + 50}
      />
      <MentionAutocomplete
        query={mentionState.query}
        open={mentionState.open}
        onSelect={handleSelectMention}
        onClose={() =>
          setMentionState({ open: false, query: '', triggerStart: -1 })
        }
      />
      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-xs ${
            tooLong ? 'text-destructive' : 'text-muted-foreground'
          }`}
        >
          {body.length}/{COMMENT_BODY_MAX}
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={submitting}
            >
              Batal
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !body.trim() || tooLong}
          >
            {submitting ? 'Mengirim...' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
