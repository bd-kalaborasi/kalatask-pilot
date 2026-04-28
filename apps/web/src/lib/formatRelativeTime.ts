/**
 * Format relative time Indonesian style untuk notif timestamp.
 *
 * Examples:
 *   - "Baru saja" (< 1 menit)
 *   - "5 menit lalu"
 *   - "2 jam lalu"
 *   - "3 hari lalu"
 *   - "2 minggu lalu"
 *   - "DD-MM-YYYY" (> 30 hari, fallback ke absolute date)
 */
export function formatRelativeTimeID(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return '—';
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return '—';
  const diffMs = now.getTime() - target.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);

  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffDay < 30) return `${diffWeek} minggu lalu`;
  // Fallback absolute DD-MM-YYYY
  const dd = String(target.getUTCDate()).padStart(2, '0');
  const mm = String(target.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = target.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
