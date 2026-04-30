/**
 * ToastContainer — render Toast list at bottom-right.
 */
import { useToast, type ToastTone } from '@/contexts/ToastContext';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<ToastTone, string> = {
  info:    'bg-feedback-info-bg border-feedback-info-border text-brand-deep-700',
  success: 'bg-feedback-success-bg border-feedback-success-border text-feedback-success',
  warning: 'bg-feedback-warning-bg border-feedback-warning-border text-feedback-warning',
  error:   'bg-feedback-danger-bg border-feedback-danger-border text-feedback-danger',
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
            'border rounded-md px-3 py-2 text-sm shadow-brand-md flex items-start gap-2 kt-slide-up',
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
