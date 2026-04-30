# KalaTask — Brand Guidelines

> Brand identity untuk pilot internal task management Kalaborasi Group Indonesia.
> **Version:** v1.0 — 2026-04-27
> **Status:** Initial brand kit untuk pilot

---

## 1. Brand positioning

**KalaTask** adalah produk task management internal Kalaborasi Group Indonesia. Sebagai *sub-brand*, KalaTask mewarisi identitas visual parent brand — palet biru yang sama, sense of motion (orbital ring), dan tone friendly-professional.

| Aspek | Value |
|---|---|
| Parent brand | Kalaborasi Group Indonesia |
| Product nama | KalaTask |
| Tagline (working) | *"Task management yang nempel sama cara kerja tim."* |
| Audience primer | 10-30 karyawan internal (Operations, HR, Finance, Marketing, IT) |
| Tone of voice | Friendly-professional, Bahasa Indonesia santai-profesional, hindari corporate jargon |
| Brand personality | Helpful, transparan, tidak mengintimidasi, hands-off saat tidak diperlukan |

**Positioning statement:**
> KalaTask membantu tim Kalaborasi punya satu tempat untuk lihat siapa kerjakan apa, kapan, dan di mana macetnya — tanpa harus kompromi sama tools mahal selama masa pilot.

---

## 2. Color palette

### 2.1 Primary brand colors

Diturunkan langsung dari logo Kalaborasi (extracted via pixel sampling, dominasi tertinggi ~12% dan ~6% dari total area logo).

| Token | Hex | RGB | Usage |
|---|---|---|---|
| **Deep Blue** | `#0060A0` | `0, 96, 160` | Primary action, headings, navigation, "Kala" wordmark |
| **Sky Blue** | `#00A0E0` | `0, 160, 224` | Accent, links, active state, "Task" wordmark, status `in_progress` |

### 2.2 Extended scale (untuk UI states)

Setiap brand color punya 9-step scale (50-900) yang di-define di `theme.css` dan `tailwind.config.snippet.js`. Highlight yang paling sering dipakai:

| Token | Hex | Usage |
|---|---|---|
| `brand-deep-700` | `#004A7A` | Hover/pressed state untuk Deep Blue |
| `brand-deep-100` | `#D6E7F2` | Subtle background, badge background |
| `brand-sky-700` | `#0088C8` | Hover/pressed state untuk Sky Blue |
| `brand-sky-100` | `#D6F0FA` | Subtle background untuk active highlight |

### 2.3 Status colors (PRD F1, F3, F4)

Sengaja **TIDAK** semua dari brand palette — UX research menyarankan status colors konsisten dengan konvensi industri (green = done, red = blocked) supaya cognitive load rendah.

| Status | Hex | Tailwind utility |
|---|---|---|
| `todo` | `#A1A1AA` (gray-400) | `bg-status-todo` |
| `in_progress` | `#00A0E0` (brand sky) | `bg-status-progress` |
| `review` | `#F59E0B` (amber-500) | `bg-status-review` |
| `done` | `#16A34A` (green-600) | `bg-status-done` |
| `blocked` | `#EF4444` (red-500) | `bg-status-blocked` |

> **Catatan:** `in_progress` sengaja pakai brand sky biar visual continuity — task yang sedang aktif dikerjakan = warna brand. Ini decision yang re-purpose brand color untuk fungsi UI.

### 2.4 Neutrals

Pakai zinc scale dari Tailwind default (zinc-50 sampai zinc-900). Zinc dipilih karena slight cool undertone yang harmonize sama brand blue (vs gray yang neutral atau slate yang terlalu biru).

### 2.5 Contrast & accessibility (WCAG AA target — PRD section 9.3)

| Foreground | Background | Ratio | Lulus AA? |
|---|---|---|---|
| `#FFFFFF` (white) | `#0060A0` (deep) | 7.79:1 | ✅ AAA |
| `#FFFFFF` | `#00A0E0` (sky) | 3.25:1 | ⚠️ AA Large only — gunakan sky hanya untuk text ≥ 18px atau 14px bold. Untuk body text, pakai deep |
| `#0060A0` | `#FFFFFF` | 7.79:1 | ✅ AAA |
| `#0060A0` | `#D6E7F2` (deep-100) | 6.41:1 | ✅ AAA |
| `#18181B` (zinc-900) | `#FAFAFA` (zinc-50) | 17.85:1 | ✅ AAA |

**Aturan praktis:**
- Body text: zinc-900 di bg putih, atau white di bg deep blue
- Sky blue jangan dipakai untuk text body kecil — pakai untuk button background, ikon, highlight bar, status indicator

---

## 3. Typography

### 3.1 Type stack

| Role | Font | Fallback | Weight |
|---|---|---|---|
| Sans (UI default) | **Inter** | Helvetica Neue, Arial, system-ui | 400, 500, 600, 700, 800 |
| Mono (timestamp, ID, code) | **JetBrains Mono** | SF Mono, Consolas | 400, 500 |

Dua-duanya free, hosted di Google Fonts. Inter dipilih karena:
- Geometric sans-serif yang dekat dengan custom typeface Kalaborasi
- Render bagus di small size (penting untuk Gantt label, table dense)
- Variable weights tersedia, bisa hemat font payload

### 3.2 Type scale (sudah di-define di `theme.css`)

| Token | Size (px) | Usage |
|---|---|---|
| `text-xs` | 12 | Meta, timestamp, badge label |
| `text-sm` | 14 | Body small, table cell, secondary action |
| `text-base` | 16 | Body default, paragraph, form input |
| `text-lg` | 18 | Emphasis, lead paragraph |
| `text-xl` | 20 | Card heading, section sub-heading |
| `text-2xl` | 24 | Section heading |
| `text-3xl` | 30 | Page heading |
| `text-4xl` | 36 | Display, hero title (jarang dipakai di app, lebih untuk landing/marketing) |

### 3.3 Wordmark spec

```
Wordmark: "KalaTask"
Font:     Inter ExtraBold (800)
Tracking: -3px (tight, biar feel solid seperti parent brand)
Color:
  - "Kala" = #0060A0 (Deep Blue)
  - "Task" = #00A0E0 (Sky Blue)
```

Capitalization "KalaTask" (camelCase) sengaja dipertahankan — beda dari parent brand yang all-lowercase, supaya jelas ini adalah produk/sub-brand, bukan rebrand parent.

---

## 4. Logo

### 4.1 File inventaris

| File | Use case |
|---|---|
| `logo/kalatask-logo-full.svg` | Default — header, splash screen, login page, email signature |
| `logo/kalatask-logo-full-dark.svg` | Dark mode UI, dark backgrounds |
| `logo/kalatask-wordmark.svg` | Wordmark only (tanpa icon), untuk tight horizontal spaces |
| `logo/kalatask-icon.svg` | App icon, sidebar collapsed, PWA icon source |
| `logo/kalatask-icon-mono.svg` | Single-color contexts: print BW, watermark, embossing |
| `logo/favicon.svg` | Browser tab favicon (32×32 optimized) |
| `logo/kalatask-logo-editable.svg` | Versi text-based (font-family Inter) untuk IT yang ingin edit text |

> **Catatan teknis:** wordmark di file `kalatask-logo-full*.svg` dan `kalatask-wordmark.svg` sudah di-convert jadi **outlined paths (vector outlines)** memakai Poppins Bold sebagai source font. Ini bikin SVG render identik di mana-mana — no font dependency, no clipping, no fallback issue. Jika perlu edit text (misal rename product), pakai `kalatask-logo-editable.svg` yang masih text-based + Inter font-family.

### 4.2 Construction

**Icon mark** (200×200 viewBox):
- **Outer circle** (radius 92, fill `#0060A0`) — solid badge
- **Inner ring** (radius 68, stroke `#00A0E0`, width 10) — echoes orbital "o" Kalaborasi
- **Checkmark** (white, stroke 16, rounded caps) — task management semantic

**Wordmark:**
- **Source font:** Poppins Bold (geometric sans-serif, secara visual dekat ke Inter)
- **Output:** outlined paths (text-to-curves) — tidak depend ke font yang ke-load di rendering context
- **Size:** ~120px cap-height equivalent
- **Tracking:** -3px (tight, mirip parent brand Kalaborasi)
- **Color split:** "Kala" deep blue + "Task" sky blue (dual-tone)

> **Kenapa outlined paths, bukan text-based SVG?** Ketika SVG dibuka standalone (di email, image preview, GitHub render), font yang di-spec di `font-family` mungkin tidak ter-load — fallback font punya metrics berbeda dan bisa bikin teks ter-clipping atau spacing rusak. Outlined paths render identik di semua context. Trade-off: text tidak bisa di-edit langsung, tapi bisa pakai `kalatask-logo-editable.svg` jika perlu.

### 4.3 Clear space rule

Minimum clear space di sekeliling logo = 1× tinggi icon mark. Jangan place text/elemen lain di area ini.

```
┌─────────────────────────────────────┐
│  ←─ clear ─→                        │
│  ↑                                  │
│  c          [LOGO HERE]             │
│  l                                  │
│  e                                  │
│  a                                  │
│  r                                  │
│  ↓                                  │
└─────────────────────────────────────┘
```

### 4.4 Minimum size

| Variant | Minimum render size |
|---|---|
| Full lockup | 120px width |
| Icon only | 24px (web), 16px (favicon emergency only) |

Di bawah ukuran ini, switch ke favicon variant yang sudah dioptimasi.

### 4.5 Don'ts

- ❌ Jangan stretch/squish proporsi
- ❌ Jangan ganti warna ke palette di luar brand (misal hijau, merah)
- ❌ Jangan tambah drop shadow, glow, atau efek 3D
- ❌ Jangan rotate icon (kecuali animation reveal — max 360° rotation)
- ❌ Jangan place wordmark di atas background dengan kontras < 4.5:1
- ❌ Jangan separate "Kala" dan "Task" jadi 2 baris

---

## 5. Iconography & illustrations

### 5.1 Icon library

Gunakan **Lucide Icons** (sudah di stack PRD via shadcn/ui). Konsisten 1.5px stroke weight, rounded caps.

Customization rule untuk match brand:
- Default state: `text-zinc-600`
- Active/hover: `text-brand-deep`
- Brand accent (jarang): `text-brand-sky`

### 5.2 Empty states & illustrations (PRD F10c)

Untuk empty states, pakai illustrations sederhana berbasis brand colors. Saran style: outline-only, geometric, 2-tone (deep + sky).

Resource gratis yang compatible: [unDraw](https://undraw.co) (customize warna jadi `#0060A0`).

---

## 6. Voice & tone (Bahasa Indonesia)

### 6.1 Prinsip umum

- **Bahasa Indonesia santai-profesional** sebagai default (per PRD N7)
- Mix istilah teknis Inggris OK kalau memang lebih natural ("deadline", "task", "review")
- Hindari: jargon korporat, kalimat pasif berlebihan, eufemisme yang membingungkan
- Pakai: kata kerja aktif, kalimat pendek, langsung ke inti

### 6.2 Microcopy examples

| Konteks | ❌ Hindari | ✅ Pakai |
|---|---|---|
| Empty state Kanban | "Tidak ada data yang dapat ditampilkan saat ini." | "Belum ada task. Klik '+' atau biarkan Cowork buat dari MoM besok pagi 🤖" |
| Confirm delete | "Apakah Anda yakin ingin melakukan tindakan ini?" | "Hapus task ini? Tidak bisa di-undo." |
| Task overdue | "Tugas Anda telah melampaui batas waktu yang ditentukan." | "Deadline kelewat 2 hari. Update status atau geser deadline?" |
| Auto comment dari Cowork | "Sistem telah secara otomatis menambahkan komentar berdasarkan analisis MoM." | "[Auto dari MoM rapat-marketing-2026-04-26.docx]: Tim setuju target launch geser ke minggu depan." |
| Login error | "Otentikasi gagal. Silakan coba lagi." | "Email atau password salah. Coba lagi atau reset password." |

### 6.3 Notification copy (PRD F7)

Match urgency tier dengan tone:

- **Normal** (`text-notif-normal`, sky blue): netral, informatif
  > "Task baru di-assign ke kamu: *Review laporan Q1*"
- **Warning** (`text-notif-warning`, amber): friendly reminder
  > "*Review laporan Q1* deadline 3 hari lagi"
- **Urgent** (`text-notif-urgent`, orange): tegas tapi tidak panik
  > "*Review laporan Q1* deadline besok"
- **Critical** (`text-notif-critical`, red): direct, action-oriented
  > "*Review laporan Q1* sudah lewat deadline 2 hari. Update sekarang."

---

## 7. Date & number format (PRD N7)

| Konteks | Format | Contoh |
|---|---|---|
| Deadline absolute | `DD-MM-YYYY` | `27-04-2026` |
| Deadline relative (recent, ≤ 7 hari) | Indonesia natural | `Hari ini`, `Besok`, `2 hari lagi`, `Kemarin`, `3 hari lalu` |
| Timestamp full | `DD-MM-YYYY HH:mm WIB` | `27-04-2026 14:30 WIB` |
| Timestamp relative (chat-style) | Natural | `5 menit lalu`, `2 jam lalu`, `Kemarin 14:30` |
| Number besar | Locale ID (titik pemisah ribuan) | `1.500 task`, `10.000 user` |
| Persentase | Standard | `87.5%` |

Timezone hardcoded **Asia/Jakarta (WIB, UTC+7)** di pilot. Multi-timezone Phase 2.

---

## 8. Spacing & layout

### 8.1 Spacing scale (4px-based)

| Token | Pixel | Tailwind |
|---|---|---|
| `space-1` | 4px | `gap-1` `p-1` |
| `space-2` | 8px | `gap-2` `p-2` |
| `space-3` | 12px | `gap-3` `p-3` |
| `space-4` | 16px | `gap-4` `p-4` |
| `space-6` | 24px | `gap-6` `p-6` |
| `space-8` | 32px | `gap-8` `p-8` |
| `space-12` | 48px | `gap-12` `p-12` |
| `space-16` | 64px | `gap-16` `p-16` |

### 8.2 Border radius

| Komponen | Radius |
|---|---|
| Button, input, card | `0.5rem` (8px) |
| Modal, dialog | `0.75rem` (12px) |
| Badge, pill, status indicator | `9999px` (full round) |
| Avatar | `9999px` (circular) |

### 8.3 Container widths

| Layout | Max width |
|---|---|
| App content (default) | 1280px |
| Dashboard | 1440px |
| Modal/dialog | 640px (sm), 768px (md), 1024px (lg) |
| Reading content (PRD viewer, docs) | 720px |

---

## 9. Component patterns (high-level)

Detail pattern di-implement di shadcn/ui — ini guideline brand-level.

### 9.1 Button

| Variant | Background | Text | Use case |
|---|---|---|---|
| Primary | `bg-brand-deep` | `text-white` | Main CTA: "Create task", "Save" |
| Secondary | `bg-white border border-brand-deep` | `text-brand-deep` | Alternative action |
| Ghost | `transparent hover:bg-brand-deep-100` | `text-brand-deep` | Tertiary action, in-table |
| Destructive | `bg-red-600` | `text-white` | Delete, archive |

Hover state: shift background +1 step ke arah darker (mis. `brand-deep` → `brand-deep-700`).

### 9.2 Status badge

```jsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-status-progress-bg text-status-progress text-xs font-medium">
  <span className="w-1.5 h-1.5 rounded-full bg-status-progress" />
  In Progress
</span>
```

### 9.3 Task card (Kanban)

- Background: `bg-white` (light) / `bg-zinc-800` (dark)
- Border-left: 3px solid status color
- Padding: 12px
- Border-radius: 8px
- Hover: lift dengan `shadow-brand-md`

### 9.4 Source indicator

Untuk membedakan task dari `manual` vs `cowork-agent` vs `csv-import` (PRD F9, F15):

```jsx
{source === 'cowork-agent' && (
  <span className="inline-flex items-center gap-1 text-xs text-source-cowork">
    🤖 Auto from MoM
  </span>
)}
```

---

## 10. Implementation handoff

### 10.1 File structure di repo

```
/apps/web/
├── public/
│   ├── favicon.svg                  # → dari /logo/favicon.svg
│   └── kalatask-logo-full.svg       # → dari /logo/
├── src/
│   ├── styles/
│   │   ├── theme.css                # design tokens (CSS vars)
│   │   └── globals.css              # @import './theme.css' di sini
│   └── assets/
│       └── logo/                    # semua varian logo SVG
└── tailwind.config.js               # extend dari snippet
```

### 10.2 Setup checklist (untuk Claude Code / IT dev)

- [ ] Copy semua file dari `/kalatask-brand/logo/` ke `/apps/web/src/assets/logo/`
- [ ] Copy `favicon.svg` ke `/apps/web/public/favicon.svg`
- [ ] Copy `theme.css` ke `/apps/web/src/styles/theme.css`
- [ ] Import `theme.css` di `/apps/web/src/main.tsx` atau `index.css`
- [ ] Merge `tailwind.config.snippet.js` ke project root `tailwind.config.js`
- [ ] Install Inter + JetBrains Mono via Google Fonts (di `index.html` atau via `@fontsource/inter`)
- [ ] Update `<title>` dan `<meta>` di `index.html` jadi "KalaTask"
- [ ] Update PWA manifest (`manifest.json`) dengan icon + brand colors

### 10.3 PWA manifest snippet (PRD N2)

```json
{
  "name": "KalaTask",
  "short_name": "KalaTask",
  "description": "Task management internal Kalaborasi Group Indonesia",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAFA",
  "theme_color": "#0060A0",
  "icons": [
    { "src": "/kalatask-icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/kalatask-icon-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "lang": "id-ID"
}
```

> **Action item:** generate PNG icons (192×192 dan 512×512) dari `kalatask-icon.svg` saat development. Tools: Figma export, atau CLI `npx pwa-asset-generator`.

---

## 11. Brand evolution & versioning

| Version | Date | Notes |
|---|---|---|
| v1.0 | 2026-04-27 | Initial brand kit untuk pilot — palette, logo, typography, voice |
| v2.0 | 2026-04-29 | Sprint 6 polish — Stitch MCP collab. Refined Asana/Monday-style microcopy guidelines (§13), Indonesian status labels locked, Stitch-derived hybrid tokens NOTED (surface tonal scale, M3-inspired typography) but **paper-only — never landed in code** (post-revision audit confirmed). |
| **v2.1** | **2026-04-30** | **Sprint 6 holistic overhaul — v2 tokens LAND IN CODE. theme.css §8b surface tonal scale (5 levels), §8c semantic feedback colors, §9b M3 typography (display/headline/title/body/label), §10b semantic spacing (gap-card/section/page), §14 motion tokens (fast/base/slow + ease-brand). tailwind.config.ts maps all to utility classes. PRODUCT.md + DESIGN.md companion docs added (manual Impeccable equivalent — external skill install blocked by sandbox). All raw bg-zinc-*, bg-emerald-*, bg-amber-*, bg-red-* refs eliminated from pages + components (103→0). Card / Dialog / Toast / Notifications / Status badges all consume v2.1 tokens.** |

### v2 — what changed

**Microcopy (NEW §13):**
- Lock 5 prinsip Asana/Monday-style: action-oriented, conversational professional, specific over generic, brevity (≤1 sentence), empty/error sebagai opportunity/recovery
- Indonesian status labels finalized: `Belum mulai / Sedang dikerjakan / Cek ulang / Selesai / Tertahan`
- Indonesian priority: `Rendah / Sedang / Tinggi / Sangat penting`
- Indonesian project status: `Perencanaan / Aktif / Ditahan / Selesai / Diarsipkan`
- Centralized di `apps/web/src/lib/labels.ts` — source of truth across UI

**Tokens (HYBRID Stitch + KalaTask v1):**
- v1 tokens RETAINED (color palette, Inter font, 8px roundness, status colors) — backwards compatible
- v2 OPTIONAL adoption from Stitch design systems "Professional Clarity" + "Modern Monitoring":
  - Surface tonal scale (5 levels: surface-container-lowest/low/medium/high/highest) — useful untuk depth tanpa heavy shadows
  - M3-inspired typography scale (display-lg, headline-md, body-base, label-sm, data-mono) — optional alongside h1-h4 + body-md/sm/lg current
  - Spacing tokens semantik (`card-gap`, `section-margin`, `container-padding`)
- v1 tokens jangan di-replace — v2 tambahan untuk power users

**No breaking changes** untuk Sprint 1-5 components. v2 = additive enhancement.

---

## 13. Microcopy Guidelines (v2 — NEW)

Source of truth untuk all user-facing text di KalaTask. Refined Asana/Monday-style profesional Indonesia.

### 13.1 Lima Prinsip

1. **Action-oriented (verb-led)** — kata kerja di depan, hindari nominalisasi
   - ✅ "Buat tugas baru" (Asana style: "Add task")
   - ❌ "Pembuatan tugas baru" / "Tugas baru" (statis, bukan ajakan)

2. **Conversational tapi profesional** — kayak rekan tim yang helpful
   - ✅ "Belum ada tugas — yuk buat yang pertama!"
   - ❌ "Data tidak ditemukan" (robotic + tidak actionable)

3. **Specific over generic** — selalu jelaskan WHAT + WHY + recovery
   - ✅ "Tugas gagal disimpan — koneksi terputus, coba lagi"
   - ❌ "Error terjadi" (vague)

4. **Brevity** — max 1 kalimat per micro-copy
   - Kalau perlu 2 kalimat: pisah jadi primary message + helper text typography hierarchy
   - Avoid jargon technical kecuali audience admin/dev

5. **Empty/error sebagai opportunity**
   - Empty state = onboarding moment dengan CTA jelas + ilustrasi
   - Error state = recovery path dengan actionable next step (Coba lagi, Hubungi admin, Lihat panduan)

### 13.2 Tone Indonesia santai-profesional

Bukan terjemahan literal Asana/Monday English. Indonesia natural:
- Pakai "kamu" (informal-respectful), bukan "Anda" (formal kaku)
- Pakai "yuk", "ayo" untuk inviting tone (sparing, tidak setiap CTA)
- Hindari "silakan" yang terlalu formal kaku
- Pakai "lho", "kok", "deh" sangat sparing — risiko terlalu santai

### 13.3 Catalogue ready-to-use copy

Lihat `apps/web/src/lib/labels.ts`:
- `ACTION` — button labels (CREATE_TASK, APPROVE_HIGH, dst)
- `EMPTY_STATE` — empty states with icon+title+body+cta per route
- `ERROR` — error messages with title + actionable body
- `TOAST` — short success/info messages
- `PLACEHOLDER` — form input placeholders
- `CONFIRM` — confirmation dialog copy (delete, archive)

### 13.4 Status labels (locked)

Task status: `Belum mulai / Sedang dikerjakan / Cek ulang / Selesai / Tertahan`
Task priority: `Rendah / Sedang / Tinggi / Sangat penting`
Project status: `Perencanaan / Aktif / Ditahan / Selesai / Diarsipkan`

Konsisten di semua component (Badge, Column header, Filter dropdown, Modal title).

### 13.5 Microcopy review checklist (untuk PR)

- [ ] Verb-led button labels (no nominalisasi)
- [ ] Empty state has icon + title + body + CTA
- [ ] Error state has actionable recovery
- [ ] No raw English in user-facing text (kecuali technical terms: API, OAuth, RLS yang stay English)
- [ ] Bahasa Indonesia santai-professional (kamu, no Anda)
- [ ] Max 1 kalimat per micro-copy
- [ ] Pakai constants dari `lib/labels.ts` (no hardcoded strings)

**Decision points untuk Phase 2 (post-pilot):**
- Apakah perlu motion brand language (transitions, micro-interactions sebagai signature)?
- Apakah perlu illustration set custom (vs pakai unDraw)?
- Apakah produk akan punya marketing site terpisah → butuh additional brand assets?
- Apakah perlu trademark "KalaTask" sebagai nama produk?

---

## 12. Approval

| Role | Nama | Tanggal | Status |
|---|---|---|---|
| BD Owner | {nama} | | Draft |
| Stakeholder Tim Early Adopter | | | |
| Manajemen | | | |

> **Note:** Brand kit ini bisa di-iterate setelah lihat hasil di context real (UI screens). Tidak perlu "final" sebelum development mulai — yang penting tokens (color, typography, spacing) sudah locked supaya konsistensi terjaga.
