/**
 * CommentComposer — textarea + @mention autocomplete + submit.
 *
 * Sprint 4.5 Step 7 (Q2 owner override — UUID-based mention).
 * Sprint 6 revision Issue 4: hide raw "@[Name](uuid)" tokens from user.
 *
 * Display strategy (pragmatic, no contenteditable refactor):
 *   - User picks mention → composer shows "@Full Name" plain text
 *   - Sidecar state tracks { name, uuid } pairs of resolved mentions
 *   - At submit: resolve each "@Full Name" occurrence to canonical
 *     "@[Full Name](uuid)" token before sending to RPC
 *   - Display layer (CommentMarkdown) renders chips after submit
 *
 * Limitation: editing chip mid-text breaks resolution. Acceptable for
 * pilot scale (Asana/Monday do same with plain textarea).
 */
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { MentionAutocomplete } from './MentionAutocomplete';
import {
  buildMentionToken,
  COMMENT_BODY_MAX,
  type MentionUser,
} from '@/lib/comments';

interface CommentComposerProps {
  onSubmit: (body: string) => Promise<void>;
  initialBody?: string;
  submitLabel?: string;
  placeholder?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

interface PendingMention {
  fullName: string;
  uuid: string;
}

/**
 * Convert canonical body (with @[Name](uuid) tokens) to display body
 * (with plain @Name) and extract sidecar mentions.
 */
function canonicalToDisplay(canonical: string): {
  display: string;
  mentions: PendingMention[];
} {
  const mentions: PendingMention[] = [];
  const display = canonical.replace(
    /@\[([^\]]+)\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/g,
    (_, name: string, uuid: string) => {
      mentions.push({ fullName: name, uuid });
      return `@${name}`;
    },
  );
  return { display, mentions };
}

/**
 * Convert display body (with plain @Name) back to canonical (with tokens)
 * by replacing each pending mention's "@Name" first occurrence.
 */
function displayToCanonical(
  display: string,
  mentions: PendingMention[],
): string {
  let result = display;
  for (const m of mentions) {
    const plain = `@${m.fullName}`;
    const idx = result.indexOf(plain);
    if (idx === -1) continue;
    result =
      result.slice(0, idx) +
      buildMentionToken({ id: m.uuid, full_name: m.fullName }) +
      result.slice(idx + plain.length);
  }
  return result;
}

export function CommentComposer({
  onSubmit,
  initialBody = '',
  submitLabel = 'Post komen',
  placeholder = 'Tulis komen... pakai @ untuk mention rekan',
  onCancel,
  autoFocus = false,
}: CommentComposerProps) {
  const initial = canonicalToDisplay(initialBody);
  const [body, setBody] = useState(initial.display);
  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>(
    initial.mentions,
  );
  const [submitting, setSubmitting] = useState(false);
  const [mentionState, setMentionState] = useState<{
    open: boolean;
    query: string;
    triggerStart: number; // position of '@' in display body
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
    // Insert plain "@Full Name " — readable, not raw token
    const display = `@${user.full_name}`;
    const newBody = `${before}${display} ${after}`;
    setBody(newBody);
    setPendingMentions((prev) => [
      ...prev,
      { fullName: user.full_name, uuid: user.id },
    ]);
    setMentionState({ open: false, query: '', triggerStart: -1 });
    // Restore focus
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = before.length + display.length + 1;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmedDisplay = body.trim();
    if (!trimmedDisplay) return;
    if (trimmedDisplay.length > COMMENT_BODY_MAX) return;
    // Resolve display @Name back to canonical @[Name](uuid) tokens
    const canonical = displayToCanonical(trimmedDisplay, pendingMentions);
    setSubmitting(true);
    try {
      await onSubmit(canonical);
      setBody('');
      setPendingMentions([]);
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
      {pendingMentions.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5 text-xs"
          aria-label="Mention pending di komen ini"
          data-testid="pending-mentions"
        >
          <span className="text-muted-foreground">Mention:</span>
          {pendingMentions.map((m, idx) => (
            <span
              key={`${m.uuid}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
              style={{
                backgroundColor: 'var(--kt-deep-50)',
                color: 'var(--kt-deep-700)',
              }}
            >
              @{m.fullName}
            </span>
          ))}
        </div>
      )}
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
