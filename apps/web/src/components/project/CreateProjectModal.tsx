/**
 * CreateProjectModal — form untuk admin/manager bikin project baru.
 *
 * Sprint 6 revision Issue 1. RLS:
 * - admin: any owner_id (default = self)
 * - manager: owner_id MUST = auth.uid() (auto-set client-side)
 *
 * Member/viewer tidak bisa create — button hidden upstream.
 */
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/contexts/ToastContext';
import { createProject } from '@/lib/projects';
import type { ProjectWithOwner } from '@/lib/projects';
import { ACTION, TOAST, PLACEHOLDER } from '@/lib/labels';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: ProjectWithOwner) => void;
}

export function CreateProjectModal({
  open,
  onClose,
  onCreated,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  function reset() {
    setName('');
    setDescription('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!name.trim()) {
      setError('Nama project wajib diisi');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      showToast({ tone: 'success', message: TOAST.PROJECT_CREATED });
      onCreated(project);
      reset();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Gagal buat project. Coba lagi.';
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
      title="Buat project baru"
      description="Project membantu kelompokkan tugas terkait. Status default: Perencanaan."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="project-name">
            Nama project <span className="text-destructive">*</span>
          </Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={PLACEHOLDER.PROJECT_NAME}
            autoFocus
            maxLength={120}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="project-description">Deskripsi (opsional)</Label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tambahkan konteks atau scope project (opsional)"
            rows={3}
            maxLength={500}
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
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
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? 'Membuat...' : ACTION.CREATE_PROJECT}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
