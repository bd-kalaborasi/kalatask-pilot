/**
 * InlineStatusEdit — click status badge → dropdown to change.
 *
 * Sprint 6 revision Issue 3: parity with Kanban drag-drop.
 * Pattern: Asana/Monday — click chip → popover of 5 options → optimistic.
 *
 * RLS gating handled implicitly: failure → rollback + toast. Viewer hidden.
 */
import { useEffect, useRef, useState } from 'react';
import {
  TASK_STATUS_VALUES,
  updateTaskStatus,
  type TaskStatus,
} from '@/lib/tasks';
import { TaskStatusBadge } from '@/components/task/TaskStatusBadge';
import { TASK_STATUS_LABEL } from '@/lib/labels';
import { useOptimisticMutation } from '@/hooks/useOptimisticMutation';
import { cn } from '@/lib/utils';

interface InlineStatusEditProps {
  taskId: string;
  status: TaskStatus;
  /** When false, render display-only badge (viewer / read-only). */
  editable: boolean;
  /** Optimistic local update — set NEW status di parent state */
  onLocalUpdate: (taskId: string, patch: { status: TaskStatus }) => void;
  /** Refetch on rollback fail */
  onRefetch: () => void;
}

export function InlineStatusEdit({
  taskId,
  status,
  editable,
  onLocalUpdate,
  onRefetch,
}: InlineStatusEditProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { mutate, pending } = useOptimisticMutation<{
    next: TaskStatus;
    previous: TaskStatus;
  }>({
    mutationFn: ({ next }) => updateTaskStatus({ id: taskId, status: next }),
    onApply: ({ next }) => onLocalUpdate(taskId, { status: next }),
    onRollback: ({ previous }) => {
      onLocalUpdate(taskId, { status: previous });
      onRefetch();
    },
    successMessage: false,
    errorMessage: 'Gagal update status. Refresh atau cek akses kamu.',
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!editable) {
    return <TaskStatusBadge status={status} />;
  }

  async function handleSelect(next: TaskStatus, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    if (next === status) return;
    await mutate({ next, previous: status });
  }

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Status: ${TASK_STATUS_LABEL[status]}. Klik untuk ubah.`}
        className="inline-flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:opacity-60"
        data-testid={`status-edit-${taskId}`}
      >
        <TaskStatusBadge
          status={status}
          className="cursor-pointer hover:ring-2 hover:ring-ring/40 transition-shadow"
        />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Pilih status tugas"
          className="absolute z-30 mt-1 left-0 min-w-[160px] rounded-md border bg-surface shadow-brand-md py-1"
        >
          {TASK_STATUS_VALUES.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === status}
              onClick={(e) => void handleSelect(s, e)}
              className={cn(
                'w-full text-left px-3 py-1.5 text-sm transition-colors flex items-center gap-2',
                s === status
                  ? 'bg-accent/40 font-medium'
                  : 'hover:bg-accent/30',
              )}
            >
              <TaskStatusBadge status={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
