/**
 * CreateTaskModal — form untuk admin/manager bikin task di project.
 *
 * Sprint 6 revision Issue 1. RLS:
 * - admin: any task
 * - manager: task ke project visible (RLS auto-check via tasks_insert_manager_via_project)
 *
 * Member/viewer denied at RLS — button hidden upstream.
 */
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { createTask, TASK_PRIORITY_VALUES, type TaskPriority } from '@/lib/tasks';
import type { TaskWithAssignee } from '@/lib/tasks';
import {
  ACTION,
  TOAST,
  PLACEHOLDER,
  TASK_PRIORITY_LABEL,
} from '@/lib/labels';

interface CreateTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  onCreated: (task: TaskWithAssignee) => void;
}

export function CreateTaskModal({
  open,
  onClose,
  projectId,
  onCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDeadline('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!title.trim()) {
      setError('Judul tugas wajib diisi');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const task = await createTask({
        projectId,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        deadline: deadline || null,
      });
      showToast({ tone: 'success', message: TOAST.TASK_CREATED });
      onCreated(task);
      reset();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal buat tugas. Coba lagi.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    reset();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Buat tugas baru"
      description="Tugas akan dibuat dengan status awal Belum mulai."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-title">
            Judul tugas <span className="text-destructive">*</span>
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={PLACEHOLDER.TASK_TITLE}
            autoFocus
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="task-description">Deskripsi (opsional)</Label>
          <textarea
            id="task-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={PLACEHOLDER.TASK_DESCRIPTION}
            rows={3}
            maxLength={1000}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-priority">Prioritas</Label>
            <select
              id="task-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {TASK_PRIORITY_VALUES.map((p) => (
                <option key={p} value={p}>
                  {TASK_PRIORITY_LABEL[p]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-deadline">Deadline (opsional)</Label>
            <Input
              id="task-deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            {ACTION.CANCEL}
          </Button>
          <Button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? 'Membuat...' : ACTION.CREATE_TASK}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
