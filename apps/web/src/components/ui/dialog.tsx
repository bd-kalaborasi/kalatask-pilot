/**
 * Dialog — minimal modal primitive built on native <dialog> element.
 *
 * Sprint 6 revision (Issue 1): create modals untuk Project + Task.
 *
 * Why native <dialog>:
 * - Built-in backdrop, focus trap, ESC-to-close, accessibility tree
 * - Zero JS bundle delta (no @radix-ui/react-dialog)
 * - Aligns dengan N1 bundle target ≤ 200KB
 *
 * Pattern:
 *   const [open, setOpen] = useState(false);
 *   <Dialog open={open} onClose={() => setOpen(false)} title="...">
 *     ...form...
 *   </Dialog>
 */
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Listen native close (ESC) → propagate to parent state
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    const onCloseEvent = () => {
      onClose();
    };
    el.addEventListener('cancel', onCancel);
    el.addEventListener('close', onCloseEvent);
    return () => {
      el.removeEventListener('cancel', onCancel);
      el.removeEventListener('close', onCloseEvent);
    };
  }, [onClose]);

  // Click on backdrop (outside content) → close
  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === ref.current) {
      onClose();
    }
  }

  return (
    <dialog
      ref={ref}
      onClick={handleBackdropClick}
      className={cn(
        // v2.2 D2: bumped radius 12 → 16px via --kt-radius-lg. Use rounded-kt-lg
        // explicitly to avoid leaning on shadcn's --radius (8px).
        'rounded-kt-lg border border-outline-variant bg-surface-container-lowest p-0 shadow-brand-lg backdrop:bg-black/40 backdrop:backdrop-blur-sm',
        'open:animate-scale-in',
        'w-full max-w-md',
        className,
      )}
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-desc' : undefined}
    >
      <div className="p-6 space-y-4">
        <header className="space-y-1">
          <h2 id="dialog-title" className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <p id="dialog-desc" className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </dialog>
  );
}
