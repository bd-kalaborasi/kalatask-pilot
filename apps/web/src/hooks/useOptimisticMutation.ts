/**
 * useOptimisticMutation — generic helper untuk optimistic update +
 * rollback on error + toast notification.
 *
 * Sprint 3 Step 10 — UX consistency pattern (carry-over Sprint 2 R4).
 *
 * Usage:
 *   const { mutate, pending } = useOptimisticMutation({
 *     mutationFn: (args) => supabase.from('tasks').update({...}).eq('id', args.id),
 *     onApply: (args) => { setLocal(...) },           // optimistic
 *     onRollback: (args) => { revertLocal(...) },     // on error
 *     successMessage: 'Disimpan.',                    // toast on success
 *     errorMessage: 'Gagal simpan. Coba lagi.',       // toast on error
 *   });
 */
import { useState } from 'react';
import { useToast } from '@/contexts/ToastContext';

interface MutationConfig<TArgs> {
  mutationFn: (args: TArgs) => Promise<unknown>;
  /** Apply optimistic state change. */
  onApply?: (args: TArgs) => void;
  /** Revert state change kalau mutation fail. */
  onRollback?: (args: TArgs) => void;
  /** Toast saat sukses. Pass empty string atau false untuk skip. */
  successMessage?: string | false;
  /** Toast saat error. Default: extract supabase error message. */
  errorMessage?: string | ((err: Error) => string);
}

interface MutationResult<TArgs> {
  mutate: (args: TArgs) => Promise<void>;
  pending: boolean;
  lastError: Error | null;
}

export function useOptimisticMutation<TArgs>({
  mutationFn,
  onApply,
  onRollback,
  successMessage,
  errorMessage,
}: MutationConfig<TArgs>): MutationResult<TArgs> {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  async function mutate(args: TArgs): Promise<void> {
    setPending(true);
    setLastError(null);
    onApply?.(args);
    try {
      await mutationFn(args);
      if (successMessage) {
        showToast({ tone: 'success', message: successMessage });
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Gagal simpan.');
      setLastError(error);
      onRollback?.(args);
      const msg =
        typeof errorMessage === 'function'
          ? errorMessage(error)
          : (errorMessage ?? 'Gagal simpan. Coba lagi atau refresh halaman.');
      showToast({ tone: 'error', message: msg });
    } finally {
      setPending(false);
    }
  }

  return { mutate, pending, lastError };
}
