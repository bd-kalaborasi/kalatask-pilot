---
name: kalatask-brand-tokens
description: Use this skill when writing or modifying any UI component, page, or styling for the KalaTask app. Trigger when the user asks to "buat komponen", "style ini", "pakai brand color", "ubah warna", "create button/badge/card", or any frontend work that involves visual design. This skill enforces correct usage of design tokens from `apps/web/src/styles/theme.css` and `apps/web/tailwind.config.ts`. Prevents hardcoded hex colors, off-brand palettes, and inconsistent spacing. Source of truth is `docs/BRAND.md` v1.0.
---

# KalaTask Brand Tokens — Usage Skill

## Tujuan skill ini

Skill ini memastikan setiap UI yang ditulis untuk KalaTask:

1. **Pakai brand tokens, bukan hex literal** — konsistensi + dark mode otomatis
2. **Mapping yang benar** — token punya semantic meaning, bukan asal pilih warna
3. **Tidak invent token baru** tanpa update BRAND.md dulu
4. **Accessibility-aware** — kontras, touch target, focus state

## Source of truth

- **`docs/BRAND.md`** v1.0 — keputusan brand-level (colors, typography, voice)
- **`apps/web/src/styles/theme.css`** — runtime values (CSS variables)
- **`apps/web/tailwind.config.ts`** — Tailwind class mapping

Order of authority: BRAND.md > theme.css > tailwind.config.ts. Kalau ada gap antara file, update urutan ini (BRAND.md duluan).

## Aturan WAJIB

### 1. JANGAN pakai hex literal di markup

```tsx
// ❌ Salah
<button style={{ backgroundColor: '#0060A0' }}>Save</button>
<div className="bg-[#00A0E0]">...</div>
<span className="text-[#16A34A]">Done</span>

// ✅ Benar
<button className="bg-brand-deep text-white">Save</button>
<div className="bg-brand-sky">...</div>
<span className="text-status-done">Done</span>
```

### 2. Pakai semantic token, bukan literal token

Token punya 2 layer:

- **Brand layer** (`brand-deep`, `brand-sky`) — warna identity, untuk navigation, primary action, branding
- **Semantic layer** (`status-progress`, `notif-warning`, `source-cowork`) — warna dengan meaning UX-spesifik

Contoh:

```tsx
// ❌ Pakai brand layer untuk meaning UX
<Badge className="bg-brand-sky">In Progress</Badge>
// Walaupun nilainya sama (#00A0E0), ini campur tanggung jawab.
// Kalau besok status `in_progress` ganti warna, kamu ubah di banyak tempat.

// ✅ Pakai semantic layer
<Badge className="bg-status-progress text-white">In Progress</Badge>
// theme.css define --kt-status-progress = brand-sky. Kalau ganti, ubah 1 tempat.
```

### 3. Mapping cepat: kapan pakai token apa

| Konteks UX | Token yang benar | ❌ Hindari |
|---|---|---|
| Primary CTA button (Save, Create) | `bg-brand-deep text-white` | hex literal, `bg-blue-600` |
| Secondary CTA | `bg-white border border-brand-deep text-brand-deep` | `bg-gray-100` |
| Link / accent | `text-brand-sky hover:text-brand-sky-700` | `text-blue-500` |
| Status `todo` | `bg-status-todo-bg text-status-todo` | `bg-gray-100 text-gray-600` |
| Status `in_progress` | `bg-status-progress-bg text-status-progress` | `bg-blue-100 text-blue-600` |
| Status `done` | `bg-status-done-bg text-status-done` | `bg-green-100 text-green-700` |
| Notif warning (H-3 deadline) | `text-notif-warning` | `text-yellow-500` |
| Notif urgent (H-1 deadline) | `text-notif-urgent` | `text-orange-500` |
| Notif critical (overdue) | `text-notif-critical` | `text-red-600` |
| Source: manual | `text-source-manual` | `text-gray-500` |
| Source: cowork-agent | `text-source-cowork` | `text-blue-500` |
| Source: csv-import | `text-source-csv` | `text-purple-500` |
| Body text | `text-zinc-900 dark:text-zinc-50` (atau pakai default `<html>` style) | `text-black` |
| Muted text (meta, timestamp) | `text-zinc-500 dark:text-zinc-400` | hardcode |
| Card / surface | `bg-surface` (semantic) | `bg-white` |
| App background | `bg-canvas` (semantic) | `bg-gray-50` |
| Border | `border-zinc-200 dark:border-zinc-700` | `border-gray-300` |

> **Note pada `bg-surface` & `bg-canvas`:** ini semantic token yang di-define di tailwind.config.ts → CSS var. Otomatis dark-mode. Pakai untuk card, modal, sidebar bg.

### 4. Spacing scale 4px-based

Tailwind default sudah 4px-based, tinggal pakai class default:

```tsx
// ✅ Benar — pakai Tailwind default scale
<div className="p-4 gap-2">  // 16px padding, 8px gap
<div className="space-y-6">  // 24px vertical spacing antar child

// ❌ Hindari arbitrary value yang bukan kelipatan 4
<div className="p-[13px]">  // off-grid
<div className="gap-[7px]">
```

Spacing yang umum di pilot:

| Konteks | Class | Pixel |
|---|---|---|
| Antar item kecil (icon + label) | `gap-1` / `gap-2` | 4px / 8px |
| Card padding | `p-4` / `p-6` | 16px / 24px |
| Section padding | `p-6` / `p-8` | 24px / 32px |
| Page padding | `p-8` / `p-12` | 32px / 48px |
| Antar paragraph | `space-y-3` / `space-y-4` | 12px / 16px |

### 5. Border radius — pakai `rounded-kt-*`

Custom radius token di-map ke `kt-sm` / `kt-md` / `kt-lg` / `kt-full`:

```tsx
// ✅ Benar
<button className="rounded-kt-md">Save</button>            // 8px button
<div className="rounded-kt-lg">Modal content</div>          // 12px modal
<span className="rounded-kt-full px-2 py-0.5">Badge</span> // pill

// ❌ Hindari Tailwind default kalau spec brand beda
<button className="rounded">  // Tailwind default 4px, bukan 8px brand
<div className="rounded-md">  // tergantung config, ambigu
```

### 6. Typography — Inter (sans) untuk body, JetBrains Mono untuk meta

Default `<html>` sudah Inter. Pakai `font-mono` (atau utility class `kt-meta`) untuk:

- Timestamp ("2 jam lalu")
- Task ID (`#TSK-1234`)
- Keyboard shortcut (`Ctrl+K`)
- Code snippet inline

```tsx
<span className="kt-meta">2 jam lalu</span>
// = font-mono text-xs text-zinc-500 dark:text-zinc-400

<code className="font-mono text-sm bg-zinc-100 px-1 rounded-kt-sm">
  task.assignee_id
</code>
```

### 7. Wordmark "KalaTask" — pakai class `.kt-wordmark*`

```tsx
// Header / nav / branded surface
<span className="kt-wordmark text-2xl">
  <span className="kt-wordmark-kala">Kala</span>
  <span className="kt-wordmark-task">Task</span>
</span>

// Hasil: "Kala" deep blue, "Task" sky blue, dual-tone wordmark
```

### 8. Dark mode — JANGAN hardcode, biarkan token handle

```tsx
// ✅ Benar — token CSS var auto-switch
<div className="bg-surface text-zinc-900 dark:text-zinc-50">

// ❌ Hindari — ngotot hardcode 2x
<div className="bg-white dark:bg-zinc-900 text-black dark:text-white">
// Ini OK kalau ga pakai semantic token, tapi defeats the purpose dark mode
// otomatis dari theme.css.
```

> Rule of thumb: kalau pakai token semantic (`bg-surface`, `bg-canvas`, `bg-status-*-bg`), dark mode auto. Cuma override `dark:` ketika ada kasus spesifik.

### 9. Component pattern (re-use class definition di globals.css)

5 custom class yang sudah di-define:

| Class | Use case |
|---|---|
| `.kt-wordmark` + `.kt-wordmark-kala` + `.kt-wordmark-task` | Logotype |
| `.kt-badge` + `.kt-badge-dot` | Status pill dengan dot indicator |
| `.kt-task-card` | Kanban card (border-l 3px untuk status color) |
| `.kt-meta` | Timestamp / ID / kbd |
| `.kt-focus-ring` | Brand-tinted focus ring |

```tsx
// Status badge dengan dot
<span className="kt-badge bg-status-progress-bg text-status-progress">
  <span className="kt-badge-dot" />
  In Progress
</span>

// Task card di Kanban
<div className="kt-task-card border-status-progress">
  <h3 className="font-semibold">{task.title}</h3>
  <p className="text-sm text-zinc-600 dark:text-zinc-400">{task.description}</p>
  <div className="kt-meta mt-2">{formatRelative(task.deadline)}</div>
</div>
```

### 10. Iconography — Lucide Icons, 1.5px stroke

```tsx
import { Plus, Check, AlertCircle } from 'lucide-react';

// ✅ Default state
<Plus className="w-4 h-4 text-zinc-600" />

// ✅ Active / hover
<Plus className="w-4 h-4 text-brand-deep hover:text-brand-deep-700" />

// ❌ Hindari icon library lain (Heroicons, FontAwesome) — inkonsistensi stroke
```

Size convention: `w-4 h-4` (16px) untuk inline dengan text, `w-5 h-5` (20px) untuk button standalone, `w-6 h-6` (24px) untuk header.

## Workflow eksekusi

### Saat user minta "buat komponen X"

1. **Cek BRAND.md** — apakah komponen X (button, badge, card, dll) sudah punya pattern di §9?
   - Sudah → ikuti spec
   - Belum → konfirmasi ke user, baru bikin pattern baru
2. **Pilih semantic token** sesuai konteks UX (lihat tabel mapping di atas)
3. **Tulis JSX dengan Tailwind class** — JANGAN style inline kecuali dynamic value
4. **Verify accessibility:**
   - Touch target minimum 40×40px (mobile-first)
   - Focus state visible (`kt-focus-ring` atau Tailwind default focus)
   - Color kontras ratio cukup (`text-zinc-900` di `bg-canvas` = WCAG AA pass)
5. **Test dark mode** — toggle `<html class="dark">`, pastikan semua readable

### Saat user minta "ubah warna X jadi Y"

1. Tanya: warna Y untuk konteks apa? (Brand identity? Status? Notif?)
2. Cek apakah ada token existing yang sudah cover Y
   - Ada → pakai token itu
   - Tidak ada → cek BRAND.md, mungkin perlu update brand-level decision dulu
3. JANGAN langsung kasih hex literal di komponen — itu visual debt

### Saat user minta "tambah token brand baru"

⚠️ Ini bukan task UI level. STOP dan:

1. Konfirmasi ke user: "Ini perlu update BRAND.md (brand-level decision). Mau saya draft addition ke BRAND.md dulu?"
2. Setelah BRAND.md update + reviewed, baru:
   - Tambah CSS var di `theme.css`
   - Tambah Tailwind class mapping di `tailwind.config.ts`
3. Reminder: bump version BRAND.md (v1.0 → v1.1)

## Anti-patterns yang harus dihindari

1. **Hex literal di JSX** (`#0060A0`) — gak ikut dark mode, susah di-audit
2. **Tailwind palette default** (`bg-blue-500`, `text-red-600`) — gak match brand spec
3. **Pakai `brand-deep` untuk status `in_progress`** — campur brand + semantic, sulit refactor
4. **Border radius custom** (`rounded-[7px]`) — off-grid, inkonsisten
5. **Custom font** selain Inter / JetBrains Mono — break visual identity
6. **Lupa dark mode override** untuk kasus spesifik yang gak ke-cover semantic token
7. **Invent class baru** tanpa update globals.css `@layer components`
8. **Pakai `style={{...}}` inline** — hard to override, hard to audit, gak ikut dark mode

## Output format

Saat generate komponen:

1. File: sesuai struktur React (`.tsx` di `apps/web/src/components/`)
2. Import statement clean (no unused, alphabetical)
3. Class string menggunakan token, bukan literal
4. Comment di atas komponen kasih reference: BRAND.md §X atau PRD F-Y

```tsx
/**
 * StatusBadge — pill indicator untuk task status
 * Refer: BRAND.md §9.2 (Badge), PRD F1 (status enum)
 */
import { CheckCircle2, Circle, Clock, Eye, AlertOctagon } from 'lucide-react';

const STATUS_CONFIG = {
  todo:        { label: 'Todo',        bg: 'bg-status-todo-bg',     fg: 'text-status-todo',     icon: Circle },
  in_progress: { label: 'In Progress', bg: 'bg-status-progress-bg', fg: 'text-status-progress', icon: Clock },
  review:      { label: 'Review',      bg: 'bg-status-review-bg',   fg: 'text-status-review',   icon: Eye },
  done:        { label: 'Done',        bg: 'bg-status-done-bg',     fg: 'text-status-done',     icon: CheckCircle2 },
  blocked:     { label: 'Blocked',     bg: 'bg-status-blocked-bg',  fg: 'text-status-blocked',  icon: AlertOctagon },
} as const;

type StatusBadgeProps = {
  status: keyof typeof STATUS_CONFIG;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`kt-badge ${cfg.bg} ${cfg.fg}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}
```

## Kapan TIDAK pakai skill ini

- User minta backend logic / SQL / API — beda concern
- User minta data viz pakai library third-party (recharts, dll) — token tetap apply, tapi pakai prop library-nya
- User minta animation / transition — Tailwind default OK, brand belum spec animation token

## Related

- `docs/BRAND.md` v1.0 — source of truth brand-level
- `apps/web/src/styles/theme.css` — runtime CSS vars
- `apps/web/tailwind.config.ts` — Tailwind extension mapping
- Skill `kalatask-microcopy` — voice & tone (untuk text content)
- Skill `indonesian-format` — date/number format
- PRD §9 (Design & Technical Constraints)
