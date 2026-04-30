/**
 * MentionAutocomplete — popup dropdown saat user type @ di composer.
 *
 * Sprint 4.5 Step 7 (Q2 owner override — UUID-based mention).
 *
 * Pattern:
 *   - Parent composer detect '@' character → trigger open dropdown
 *   - Pass query (text setelah '@') ke component → debounce 200ms RPC
 *   - Render: avatar + full_name + role badge
 *   - Keyboard: Up/Down navigate, Enter select, Esc close
 *   - Click select → callback dengan { id, full_name } untuk parent
 *     inject @[name](uuid) token ke body
 */
import { useEffect, useRef, useState } from 'react';
import {
  searchUsersForMention,
  type MentionUser,
} from '@/lib/comments';

interface MentionAutocompleteProps {
  query: string;
  open: boolean;
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

const ROLE_LABEL: Record<MentionUser['role'], string> = {
  admin: 'Admin',
  manager: 'Manager',
  member: 'Member',
  viewer: 'Viewer',
};

const ROLE_BADGE: Record<MentionUser['role'], string> = {
  admin:   'bg-feedback-danger-bg text-feedback-danger',
  manager: 'bg-brand-deep-100 text-brand-deep-700',
  member:  'bg-feedback-success-bg text-feedback-success',
  viewer:  'bg-surface-container-low text-foreground',
};

export function MentionAutocomplete({
  query,
  open,
  onSelect,
  onClose,
}: MentionAutocompleteProps) {
  const [results, setResults] = useState<MentionUser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce 200ms on query change
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        setLoading(true);
        const users = await searchUsersForMention(query);
        setResults(users);
        setActiveIndex(0);
        setLoading(false);
      })();
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Keyboard nav while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        if (results[activeIndex]) {
          e.preventDefault();
          onSelect(results[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, activeIndex, onSelect, onClose]);

  if (!open) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention user autocomplete"
      className="absolute z-40 mt-1 w-72 max-h-64 overflow-auto rounded-kt-md border border-outline-variant bg-surface-container-lowest shadow-brand-lg animate-fade-up"
    >
      {loading && (
        <p className="p-3 text-xs text-muted-foreground">Mencari user...</p>
      )}
      {!loading && results.length === 0 && (
        <p className="p-3 text-xs text-muted-foreground">
          {query
            ? `Tidak ada user match "${query}"`
            : 'Ketik nama untuk mention...'}
        </p>
      )}
      {!loading &&
        results.map((u, idx) => (
          <button
            key={u.id}
            type="button"
            role="option"
            aria-selected={idx === activeIndex}
            onClick={() => onSelect(u)}
            onMouseEnter={() => setActiveIndex(idx)}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
              idx === activeIndex ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'var(--kt-deep-50)', color: 'var(--kt-deep-700)' }}
            >
              {u.full_name
                .split(' ')
                .map((s) => s[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{u.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {u.email}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${ROLE_BADGE[u.role]}`}
            >
              {ROLE_LABEL[u.role]}
            </span>
          </button>
        ))}
    </div>
  );
}
