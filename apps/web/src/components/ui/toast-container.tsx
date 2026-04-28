/**
 * ToastContainer — render Toast list at bottom-right.
 */
import { useToast, type ToastTone } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<ToastTone, string> = {
  info: 'bg-sky-50 border-sky-200 text-sky-900',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50 border-amber-200 text-amber-900',
  error: 'bg-red-50 border-red-200 text-red-900',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifikasi sistem"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={cn(
            'border rounded-md px-3 py-2 text-sm shadow-brand-md flex items-start gap-2',
            TONE_CLASS[t.tone],
          )}
        >
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Tutup notifikasi"
            className="flex-shrink-0 text-xs font-medium opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
