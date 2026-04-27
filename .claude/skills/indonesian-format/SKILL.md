---
name: indonesian-format
description: Use this skill when formatting dates, times, numbers, currencies, or relative time in the KalaTask app for Indonesian users. Trigger when the user asks to "format tanggal", "format angka", "format relative time", "format duration", "DD-MM-YYYY", "WIB", or any locale-specific display formatting. This skill provides ready-to-use TypeScript utility functions, enforces the format spec from BRAND.md §7 and PRD N7, and prevents common mistakes (timezone handling, locale ID vs en-US confusion).
---

# Indonesian Format — Utility Skill

## Tujuan skill ini

Skill ini menyediakan utility function siap-pakai untuk format display di KalaTask:

1. **Konsisten** — semua tanggal `DD-MM-YYYY`, semua angka pakai locale ID
2. **WIB-aware** — semua timestamp pilot di-display sebagai WIB (UTC+7)
3. **Relative time natural** — "2 jam lalu" lebih readable daripada timestamp absolut untuk recent events
4. **Type-safe** — TypeScript strict, jangan return `any`

## Source of truth

- BRAND.md §7 — format spec lengkap
- PRD N7 — localization decision (Bahasa Indonesia default, English toggle)
- Pilot timezone: **Asia/Jakarta (WIB, UTC+7)** hardcoded

## Aturan WAJIB

### 1. JANGAN pakai `toLocaleDateString()` raw tanpa locale + timezone

```ts
// ❌ Salah — bergantung locale browser user
new Date().toLocaleDateString();
// Hasil bisa "27/04/2026" (id-ID), "4/27/2026" (en-US), atau format lain

// ✅ Pakai utility skill ini, atau eksplisit:
new Date().toLocaleDateString('id-ID', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  timeZone: 'Asia/Jakarta'
}).replace(/\//g, '-');  // id-ID default pakai '/', kita pakai '-'
```

### 2. Selalu eksplisit timezone untuk timestamp

```ts
// ❌ Salah — server di UTC, tampil di WIB tanpa convert
const ts = new Date(task.created_at).toLocaleString();

// ✅ Pakai utility yang force WIB
formatDateTime(task.created_at);  // "27-04-2026 14:30 WIB"
```

### 3. Format date di DB tetap ISO 8601, format display via utility

DB schema:
- `timestamptz` (PostgreSQL) — store as UTC ISO 8601: `2026-04-27T07:30:00.000Z`
- `date` — `YYYY-MM-DD`: `2026-04-27`

Display layer:
- Date saja: `27-04-2026`
- Date + time: `27-04-2026 14:30 WIB`
- Relative recent: `2 jam lalu`

### 4. Locale ID number formatting

```ts
// ❌ Salah — koma vs titik confusion
(1500).toLocaleString();         // tergantung browser locale
(1500.5).toFixed(2);            // "1500.50" (bukan format ID)

// ✅ Locale ID — titik = thousand separator, koma = decimal
formatNumber(1500);     // "1.500"
formatNumber(1500.5);   // "1.500,5"
formatPercent(0.875);   // "87,5%"
```

## Library — copy-paste ready

File: `apps/web/src/lib/format.ts`

```ts
/**
 * Indonesian formatting utilities for KalaTask.
 *
 * All timestamps are displayed in WIB (Asia/Jakarta, UTC+7) per PRD N7.
 * Date format: DD-MM-YYYY per BRAND.md §7.
 *
 * Sources:
 * - docs/BRAND.md §7 (Date & number format)
 * - PRD N7 (Localization)
 */

const TZ = 'Asia/Jakarta';
const LOCALE_ID = 'id-ID';

// =============================================================
// 1. DATE — absolute format (DD-MM-YYYY)
// =============================================================

/**
 * Format date as DD-MM-YYYY.
 *
 * @param input - Date object, ISO string, or timestamp number.
 * @returns Formatted string like "27-04-2026". Returns "-" for invalid input.
 *
 * @example
 * formatDate('2026-04-27T07:30:00Z'); // "27-04-2026"
 * formatDate(new Date());              // "27-04-2026" (today)
 */
export function formatDate(input: string | Date | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '-';

  const parts = new Intl.DateTimeFormat(LOCALE_ID, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).formatToParts(d);

  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${day}-${month}-${year}`;
}

// =============================================================
// 2. DATETIME — DD-MM-YYYY HH:mm WIB
// =============================================================

/**
 * Format datetime as DD-MM-YYYY HH:mm WIB.
 *
 * @example
 * formatDateTime('2026-04-27T07:30:00Z'); // "27-04-2026 14:30 WIB"
 */
export function formatDateTime(input: string | Date | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '-';

  const datePart = formatDate(d);

  const timeParts = new Intl.DateTimeFormat(LOCALE_ID, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TZ,
  }).formatToParts(d);

  const hour = timeParts.find((p) => p.type === 'hour')?.value ?? '';
  const minute = timeParts.find((p) => p.type === 'minute')?.value ?? '';
  return `${datePart} ${hour}:${minute} WIB`;
}

// =============================================================
// 3. RELATIVE TIME — "2 jam lalu", "Besok", "3 hari lagi"
// =============================================================

/**
 * Format date as Indonesian relative time.
 *
 * Behavior:
 * - Within the last 7 days or next 7 days → relative ("Hari ini", "Besok", "2 hari lalu")
 * - Beyond 7 days → fallback to formatDate (DD-MM-YYYY)
 * - For timestamps within last 24h → time-precision ("5 menit lalu", "2 jam lalu")
 *
 * @example
 * formatRelative(new Date());                                    // "Baru saja" / "X menit lalu"
 * formatRelative(Date.now() + 24*60*60*1000);                    // "Besok"
 * formatRelative(Date.now() + 3*24*60*60*1000);                  // "3 hari lagi"
 * formatRelative('2026-01-01');                                   // "01-01-2026" (>7 hari, absolute)
 */
export function formatRelative(input: string | Date | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Past, within 1 hour
  if (diffMinutes <= 0 && diffMinutes > -60) {
    if (diffMinutes >= -1) return 'Baru saja';
    return `${Math.abs(diffMinutes)} menit lalu`;
  }

  // Past, within 24 hours
  if (diffHours <= 0 && diffHours > -24) {
    return `${Math.abs(diffHours)} jam lalu`;
  }

  // Past or future, within 7 days
  if (Math.abs(diffDays) <= 7) {
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Besok';
    if (diffDays === -1) return 'Kemarin';
    if (diffDays > 0) return `${diffDays} hari lagi`;
    return `${Math.abs(diffDays)} hari lalu`;
  }

  // Beyond 7 days → absolute
  return formatDate(d);
}

/**
 * Format chat-style timestamp: relative if recent, "Kemarin HH:mm" if yesterday,
 * else absolute date.
 *
 * @example
 * formatRelativeChat(Date.now() - 5*60*1000);                    // "5 menit lalu"
 * formatRelativeChat(yesterday14h30);                            // "Kemarin 14:30"
 * formatRelativeChat(new Date('2026-01-01'));                    // "01-01-2026"
 */
export function formatRelativeChat(input: string | Date | number | null | undefined): string {
  if (input === null || input === undefined || input === '') return '-';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '-';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;

  // Compare day in WIB
  const todayWIB = new Intl.DateTimeFormat(LOCALE_ID, { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const dWIB = new Intl.DateTimeFormat(LOCALE_ID, { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayWIB = new Intl.DateTimeFormat(LOCALE_ID, { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(yesterday);

  if (dWIB === yesterdayWIB) {
    const time = new Intl.DateTimeFormat(LOCALE_ID, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return `Kemarin ${time}`;
  }
  if (dWIB === todayWIB) {
    const time = new Intl.DateTimeFormat(LOCALE_ID, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    return `Hari ini ${time}`;
  }

  return formatDate(d);
}

// =============================================================
// 4. NUMBER — locale ID
// =============================================================

/**
 * Format number with Indonesian locale (titik sebagai thousand separator).
 *
 * @example
 * formatNumber(1500);       // "1.500"
 * formatNumber(1500000);    // "1.500.000"
 * formatNumber(1500.5);     // "1.500,5"
 */
export function formatNumber(value: number | null | undefined, decimals?: number): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat(LOCALE_ID, {
    minimumFractionDigits: decimals ?? 0,
    maximumFractionDigits: decimals ?? 2,
  }).format(value);
}

/**
 * Format value as percentage with Indonesian locale.
 *
 * @param value - Decimal value (0.875 = 87,5%) OR raw percentage if `isRaw=true`.
 *
 * @example
 * formatPercent(0.875);            // "87,5%"
 * formatPercent(87.5, 1, true);    // "87,5%"
 */
export function formatPercent(value: number | null | undefined, decimals = 1, isRaw = false): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  const pct = isRaw ? value : value * 100;
  return new Intl.NumberFormat(LOCALE_ID, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(pct) + '%';
}

// =============================================================
// 5. CURRENCY — IDR (jarang dipakai di pilot, tapi siap)
// =============================================================

/**
 * Format value as IDR currency.
 *
 * @example
 * formatCurrency(1500000);    // "Rp 1.500.000"
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return new Intl.NumberFormat(LOCALE_ID, {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// =============================================================
// 6. DURATION — "2 hari 3 jam", "45 menit"
// =============================================================

/**
 * Format duration in milliseconds to readable Indonesian string.
 *
 * @example
 * formatDuration(45 * 60 * 1000);                  // "45 menit"
 * formatDuration(2 * 60 * 60 * 1000);              // "2 jam"
 * formatDuration(2.5 * 24 * 60 * 60 * 1000);       // "2 hari 12 jam"
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return '-';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return remHours > 0 ? `${days} hari ${remHours} jam` : `${days} hari`;
  }
  if (hours > 0) {
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours} jam ${remMinutes} menit` : `${hours} jam`;
  }
  if (minutes > 0) return `${minutes} menit`;
  return 'kurang dari 1 menit';
}

// =============================================================
// 7. DEADLINE STATUS — kombinasi formatRelative + tier color hint
// =============================================================

/**
 * Get deadline tier for UI styling decision.
 * Returns tuple [label, tier] — tier maps to BRAND.md notif tier colors.
 *
 * @example
 * formatDeadlineStatus('2026-05-04', new Date('2026-04-27'));
 * // ['7 hari lagi', 'normal']
 *
 * formatDeadlineStatus('2026-04-26', new Date('2026-04-27'));
 * // ['1 hari lalu', 'critical'] — overdue
 */
export type DeadlineTier = 'normal' | 'warning' | 'urgent' | 'critical';

export function formatDeadlineStatus(
  deadline: string | Date | null | undefined,
  now: Date = new Date()
): [string, DeadlineTier | 'none'] {
  if (deadline === null || deadline === undefined || deadline === '') {
    return ['Tidak ada deadline', 'none'];
  }

  const d = new Date(deadline);
  if (isNaN(d.getTime())) return ['-', 'none'];

  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let tier: DeadlineTier;
  if (diffDays < 0) tier = 'critical';      // overdue
  else if (diffDays <= 1) tier = 'urgent';  // H-1 atau hari ini
  else if (diffDays <= 3) tier = 'warning'; // H-3
  else tier = 'normal';

  return [formatRelative(d), tier];
}
```

## Test cases (untuk skill ini sendiri)

Wajib test edge case berikut sebelum deploy ke production:

```ts
// Edge cases — pakai vitest atau jest
describe('formatDate', () => {
  it('handles ISO string', () => {
    expect(formatDate('2026-04-27T07:30:00Z')).toBe('27-04-2026');
  });
  it('handles invalid input', () => {
    expect(formatDate('not a date')).toBe('-');
    expect(formatDate(null)).toBe('-');
    expect(formatDate(undefined)).toBe('-');
  });
  it('respects WIB timezone (UTC vs WIB day boundary)', () => {
    // 2026-04-26 23:00 WIB = 2026-04-26 16:00 UTC
    // tapi 2026-04-27 06:00 WIB = 2026-04-26 23:00 UTC
    // pastikan format pakai WIB day, bukan UTC day
    expect(formatDate('2026-04-26T16:00:00Z')).toBe('26-04-2026'); // 23:00 WIB tanggal 26
    expect(formatDate('2026-04-26T23:00:00Z')).toBe('27-04-2026'); // 06:00 WIB tanggal 27
  });
});

describe('formatRelative', () => {
  it('returns "Hari ini" for today', () => {
    expect(formatRelative(new Date())).toMatch(/Baru saja|menit lalu/);
  });
  it('returns "Besok" for +1 day', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(formatRelative(tomorrow)).toBe('Besok');
  });
  it('falls back to absolute date beyond 7 days', () => {
    const farFuture = new Date('2027-01-01');
    expect(formatRelative(farFuture)).toBe('01-01-2027');
  });
});

describe('formatNumber', () => {
  it('uses titik as thousand separator', () => {
    expect(formatNumber(1500)).toBe('1.500');
    expect(formatNumber(1500000)).toBe('1.500.000');
  });
  it('uses koma as decimal separator', () => {
    expect(formatNumber(1500.5)).toBe('1.500,5');
  });
});
```

## Workflow eksekusi

### Saat user minta "format X"

1. **Cek section library** (1-7) — apakah sudah ada utility?
   - Ada → kasih function name + example call
   - Belum → propose tambah function baru ke `lib/format.ts`
2. **Verify spec** dari BRAND.md §7 — pastikan format match
3. **Generate import statement** untuk komponen yang pakai

### Saat user minta "ubah format date dari X ke Y"

⚠️ Ini brand-level decision. STOP dan:

1. Konfirmasi: "Ini ubah format display global. Mau saya update BRAND.md §7 dulu?"
2. Setelah BRAND.md update:
   - Update utility function di `lib/format.ts`
   - Update test cases
   - Reminder: ini bisa breaking change kalau ada export/laporan yang depend ke format lama

## Anti-patterns yang harus dihindari

1. **`new Date().toLocaleDateString()` tanpa locale** — output tergantung browser
2. **Hardcode timezone offset** (`+ 7 * 60 * 60 * 1000`) — bermasalah saat DST atau timezone lain
3. **Mix format DD/MM dengan DD-MM** — pilih satu, konsisten (KalaTask = DD-MM)
4. **Pakai `moment.js`** — deprecated, bundle besar. Pakai native `Intl` API atau `date-fns` kalau perlu
5. **Format di SQL** (`TO_CHAR()`) — biarkan DB return ISO, format di frontend
6. **Test pakai `new Date()` tanpa freeze** — flaky test. Pakai mock/fake time
7. **Lupa handle `null` / `undefined`** — return `'-'` daripada `'Invalid Date'`

## Output format

Saat generate utility:

1. File: `apps/web/src/lib/format.ts`
2. Pakai TSDoc comment dengan `@example`
3. Strict TypeScript — input typing eksplisit
4. Return string `-` untuk invalid input (jangan throw, jangan return `null`)

## Kapan TIDAK pakai skill ini

- User minta format untuk export CSV/Excel — itu format data layer (string ISO), bukan display
- User minta backend SQL formatting — DB return ISO 8601, frontend format
- User minta sort by date — sort pakai timestamp, bukan formatted string

## Related

- BRAND.md §7 (Date & number format)
- PRD N7 (Localization)
- Skill `kalatask-microcopy` — text content yang punya date inline ("deadline besok")
- Skill `kalatask-brand-tokens` — `kt-meta` class untuk styling timestamp
