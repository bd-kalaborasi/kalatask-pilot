/**
 * Format date Indonesian convention DD-MM-YYYY (per PRD N7).
 *
 * Input: ISO string "2026-05-15" atau Date.
 * Output: "15-05-2026". Null → "—" (em-dash placeholder).
 */
export function formatDateID(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Compute relative time vs today, returns label like "Hari ini",
 * "Kemarin", "3 hari lalu", "Besok", "5 hari lagi". Untuk tanggal di
 * deadline list. Null safe.
 */
export function formatDeadlineRelative(
  value: string | null | undefined,
  today: Date = new Date(),
): string {
  if (!value) return '—';
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return '—';

  const todayUTC = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const targetUTC = Date.UTC(
    target.getUTCFullYear(),
    target.getUTCMonth(),
    target.getUTCDate(),
  );
  const diffDays = Math.round((targetUTC - todayUTC) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Besok';
  if (diffDays === -1) return 'Kemarin';
  if (diffDays > 0) return `${diffDays} hari lagi`;
  return `${Math.abs(diffDays)} hari lalu`;
}
