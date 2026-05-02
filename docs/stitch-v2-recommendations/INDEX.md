# Stitch v2 — Skills-enforced design recommendations

**Date:** 2026-04-30
**Project:** `3438363398905262377` ("KalaTask v2 (with skills)")
**Design system asset:** `assets/6153443513110765127` ("KalaTask v2 — PRODUCT register")
**Method:** Impeccable + Emil Kowalski skills invoked, critique findings injected into every prompt, NEUTRAL color variant + single Inter family + dense layout enforced.

**Companion docs:**
- `docs/stitch-v2-pre-generation-critique.md` — full skill invocation log + Impeccable critique + Emil motion register
- `docs/stitch-v2-design-system-proposal.md` — code adoption blueprint
- `docs/stitch-full-recommendations/INDEX.md` — v1 catalog (for side-by-side compare)

URL pattern: `https://stitch.withgoogle.com/projects/3438363398905262377/screens/{screen_id}`

---

## v1 vs v2 — what changed and why

| Dimension | v1 | v2 | Skill source |
|---|---|---|---|
| Color variant | FIDELITY (auto-generated tertiary orange) | NEUTRAL (no tertiary, brand discipline) | Impeccable PRODUCT register §Color (Restrained) |
| Typography | Inter Display + Inter (dual family, display-lg 57px greeting) | Inter only, no Inter Display, max 22-24px headings | Impeccable PRODUCT bans §"Display fonts in UI" |
| Density | medium-spacious | dense (40-44px table rows, 12-16px card padding) | Impeccable + PRODUCT.md §6 decision principle #1 |
| Hero-metric template | 7 of 13 routes | 0 of 13 routes (replaced with inline pill row) | Impeccable absolute ban |
| Side-stripe colored borders | /admin/usage + /projects/:id Tertahan | 0 instances | Impeccable absolute ban |
| Identical card grids | /projects 3-col | /projects dense table primary | Impeccable PRODUCT register |
| Modal-only onboarding | /onboarding 5-step modal wizard | Inline coachmark anchored to UI | Impeccable absolute ban |
| Donut chart | /workload | Horizontal stacked bar | Impeccable visual hierarchy |
| Cute emoji (☕🥇🥈🥉) | /tasks empty + /productivity leaderboard | None | Impeccable PRODUCT bans |
| Animation register | Undefined | Defined (state-only, asymmetric, custom easing, transform+opacity only) | Emil Kowalski Animation Decision Framework |

---

## 13 v2 desktop screens

### 1. `/dashboard` (Beranda) — DESKTOP
- **Screen ID:** `c712330f92ee48129754369abff35069`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/c712330f92ee48129754369abff35069
- **v1 had:** display-lg 57px hero greeting + 3 hero-metric cards + activity feed + priorities sidebar
- **v2 has:** NO greeting, NO hero stats. Cmd-K search pill in app bar (Raycast-pattern). Section "Untuk kamu hari ini" 18px title with single inline pill row "5 perlu perhatian · 3 lewat tenggat · 2 cek ulang". Dense priorities table (40-44px rows, inline status dropdown). 320px right rail dense activity timeline (28px rows, no cards).
- **Skill insight:** Impeccable PRODUCT-register said "tool disappears into the task." Emil Animation Decision Framework: dashboard opens 12+×/day → dashboard greeting wears users out by 9am. Strip the greeting entirely. Open directly to actionable content.

### 2. `/projects` (Daftar Proyek) — DESKTOP
- **Screen ID:** `27863fda6fcf45f08f9a554cd3296caf`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/27863fda6fcf45f08f9a554cd3296caf
- **v1 had:** 3-column rich card grid with avatar stack + progress bar + ... menu hover
- **v2 has:** dense table 40-44px rows. Columns: name | status pill | owner avatar+name | progress bar 60px + % mono | tasks count mono | last update relative ID | "..." menu. Filter chips with counts inline in 56px header. Table | Grid view toggle (table active). 12+ rows visible without scroll. Empty state inline instructional copy + "Buat project pertama" inline (NOT modal).
- **Skill insight:** Impeccable §"Identical card grids" ban. Linear renders projects as dense rows for a reason — at 24+ projects, scrolling 8 rows of 3 cards is slower than scanning 24 rows.

### 3. `/projects/:projectId` (Detail Project — Kanban) — DESKTOP
- **Screen ID:** `21cf621175ad4f1ea79af284880a3a12`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/21cf621175ad4f1ea79af284880a3a12
- **v1 had:** "Tertahan column has red border-l-3 visual urgency" (BANNED). Status-tinted column backgrounds.
- **v2 has:** 280px sticky left sidebar with horizontal stacked bar for "Ringkasan tugas" + count list inline. Right main: tabs (List/Kanban/Gantt) with indicator pill 200ms animate, body INSTANT swap. 5-column Kanban with NEUTRAL white column backgrounds. "Tertahan" column header text-red-700 + red count chip, NO border-l-3 stripe. Cards dense 12px padding, drag handle 12px.
- **Skill insight:** Impeccable absolute ban on side-stripe borders. The column header bold-red text + red count chip carries the same urgency signal without triggering the AI-tell pattern.

### 4. `/tasks` (Tugas Saya) — DESKTOP
- **Screen ID:** `6a75e564e075450fa9726efaa4d271d4`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/6a75e564e075450fa9726efaa4d271d4
- **v1 had:** collapsible deadline buckets with sky chevron + cute emoji "istirahat dulu yuk ☕"
- **v2 has:** dense table 40px rows. Tabs "Hari ini | Minggu ini | Akan datang | Selesai" with count badges. Group sub-header rows 32px (Lewat tenggat in bold-red, others bold-neutral, no color stripes). Inline status dropdown editable. Bulk action bar 44px sticky bottom on selection. 25+ rows visible. Empty state: single instructional line "Tidak ada tugas aktif. Buat tugas baru atau lihat tab Selesai." NO emoji.
- **Skill insight:** Impeccable PRODUCT bans cute emoji. ☕ in productivity tool = brand-cute that doesn't earn it.

### 5. `/tasks/:id` (Detail Tugas) — DESKTOP
- **Screen ID:** `8b97572c56f04959bca6bd77c7e2fe9b`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/8b97572c56f04959bca6bd77c7e2fe9b
- **v1 had:** headline-md 28px editable title (too large for editable label) + 70/30 fixed sidebar
- **v2 has:** title 18px editable inline (INSTANT text↔input swap, no morph crossfade). 720px max single-column primary. Status / assignee / priority / "..." chips in toolbar row 44px. Subtasks accordion. Activity / Komentar tabs (indicator only animates). Right rail 240px collapsible (NOT fixed sidebar). Mention chips render as `@Name` inline (NOT raw `@[Name](uuid)` token). Bottom "Hapus" small danger link (NOT button).
- **Skill insight:** Emil Animation Decision Framework: inline edit (5-20×/day) → INSTANT swap, no crossfade. Crossfade reads as "data uncertain."

### 6. `/admin/mom-import` (Daftar Import MoM) — DESKTOP
- **Screen ID:** `40ae579ff2164c7b92f696a539ddbfc6`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/40ae579ff2164c7b92f696a539ddbfc6
- **v1 had:** 2 hero-metric stat cards "12 Menunggu review" + "48 Tugas tergenerate"
- **v2 has:** inline subtitle "Convert action items rapat jadi tugas otomatis · 12 menunggu review · 48 tergenerate bulan ini" middot single-line. Dense table 44px rows (filename mono + uploader avatar+name + tanggal + breakdown chip "8H · 3M · 1U" inline + status pill + aksi link). Cross-reference 1px-bordered note (NOT card). Empty state: instruction text only, no illustration.
- **Skill insight:** Impeccable hero-metric template ban. 2 cards became inline pill row → recovers ~80px vertical, dashboard scans faster.

### 7. `/admin/mom-import/:id` (MoM Review Queue) — DESKTOP
- **Screen ID:** `be2535c3909e44e6afb6dc2e7ea110ac`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/be2535c3909e44e6afb6dc2e7ea110ac
- **v1 had:** 5-card sticky stats row + tab nav + 70/30 split + sidebar = 4 layered nav surfaces above the actual decision
- **v2 has:** Compact header 44px (filename + meeting date + status pill + Approve primary). Inline summary line "14 action items: 8 HIGH · 3 MEDIUM · 2 LOW · 1 UNRESOLVED · 14% decided" 12px middot. Tab row with indicator. Single column item list (NO 70/30 split). Each item 64-72px with action_id mono + title + confidence pill + inline-tray decision (segmented "Buat | Lewati | Tolak" 28px + PIC dropdown). Sticky bottom bar replaces sidebar.
- **Skill insight:** PRODUCT.md §4 cognitive load: 4 nav layers above the decision = banner blindness within 5 minutes. Collapse to compact header + sticky bottom = 2 layers max.

### 8. `/admin/usage` (Monitoring Penggunaan) — DESKTOP
- **Screen ID:** `4213fa014a3a43489bf5c73f382e862b`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/4213fa014a3a43489bf5c73f382e862b
- **v1 had:** border-l-4 health banner (BANNED) + 3 hero-metric cards each with sparkline + trend chip
- **v2 has:** Banner with FULL 1px border + leading icon + tone-tinted bg, no border-l. 3 dense rows (NOT cards) for Database/Storage/MAU each with 200px stacked bar + tabular numbers + small inline trend chip. Top tabel: 5 rows with 80px inline bar + tabular size. Tips section: numbered list (NOT callout box).
- **Skill insight:** Impeccable absolute ban on side-stripe colored borders. Full 1px outline + leading icon carries the same severity signal without the AI-tell.

### 9. `/workload` (Workload Tim) — DESKTOP
- **Screen ID:** `c470ea7de4c84bd0b2d3a4dcfb61ccda`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/c470ea7de4c84bd0b2d3a4dcfb61ccda
- **v1 had:** 4 hero-metric stat cards + donut chart (BANNED for percentages — donuts harder to read at glance)
- **v2 has:** Inline pill row "12 anggota · 48 tugas aktif · 3 overloaded · 2 underloaded" 13px middot. Period chip selector inline. Section "Distribusi tim" with FULL-WIDTH horizontal stacked bar (24px tall) + inline labels. Section "Per-anggota" dense table 44px rows with 200px individual stacked bars. NO donut.
- **Skill insight:** Impeccable visual hierarchy heuristic: donut chart for percentages forces the user to compare arc lengths (slow). Horizontal stacked bar uses pre-attentive length perception (instant).

### 10. `/bottleneck` (Bottleneck Tugas) — DESKTOP
- **Screen ID:** `60d52aa1095d4f6184e44ed2a436b695`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/60d52aa1095d4f6184e44ed2a436b695
- **v1 had:** 3 hero-metric stat cards + heatmap with `>7d column has subtle red border-l visual urgency` (BANNED)
- **v2 has:** Inline pill summary "12 stuck · rata-rata 5.4 hari · paling lama 14 hari" 13px middot. Inline editable threshold control "Ambang stuck > [3] hari". 3×3 heatmap with tone-bg cells (NO border-l-4 on >7d column, use header bg-tinted instead). Dense table 44px sorted by stuck-days desc (hari stuck mono 14px tabular + danger color when >7d).
- **Skill insight:** Same Impeccable side-stripe ban. Header bg-tint achieves "this column is the urgent zone" signal.

### 11. `/productivity` (Productivity Dashboard) — DESKTOP
- **Screen ID:** `0a39cdf8614e427f8de2896669c2328e`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/0a39cdf8614e427f8de2896669c2328e
- **v1 had:** 4-tile KPI hero with display-lg big numbers + 60px sparklines + emerald trend chips + medal emoji 🥇🥈🥉 leaderboard + 3 insight cards
- **v2 has:** Inline metric row "Selesai 87% (+5%) · Velocity 14.5/hari (+1.2) · Tepat waktu 92% (+3%) · Cycle time 3.2 hari (-0.4)" tabular numbers, deltas in semantic colors. Multi-line trend chart. Top performer: dense table with rank numbers 1-5 (NO medals). Insights as 3 inline rows (NOT cards) with leading icon + headline + body + "Buka" link.
- **Skill insight:** Impeccable hero-metric template ban + cute emoji ban. 🥇 medals in productivity tool — brand-cute that doesn't earn it. Rank numbers carry the same ordering signal.

### 12. `/onboarding` (Inline Coachmark) — DESKTOP
- **Screen ID:** `c5467aa5d9ad4d04b61e75f3f26a4193`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/c5467aa5d9ad4d04b61e75f3f26a4193
- **v1 had:** modal-only 5-step wizard with progress dots + display-lg title + Indonesian-themed orbital ring illustration + 3-tab demo
- **v2 has:** Inline coachmark anchored to "Buat tugas" button via arrow pointer (transform-origin from trigger, NOT center). Background dimmed to 70% opacity (NOT blocked). Coachmark popover 280px max-w-sm, scale(0.96→1)+opacity 200ms ease-out from trigger. Step counter "3/5" mono compact (NOT 5 progress dots). NO display-lg title (16px). NO illustration. ESC + click-outside dismiss.
- **Skill insight:** Impeccable absolute ban "Modal as first thought." Emil Animation Decision Framework: popover transform-origin from trigger (not center) — modals are exempt from origin-aware rule, but coachmarks are NOT modals so they ARE origin-aware.

### 13. `/settings` + `/admin/users` (Anggota Tim) — DESKTOP
- **Screen ID:** `c63ccb78069c4561958004d860cc6507`
- **URL:** https://stitch.withgoogle.com/projects/3438363398905262377/screens/c63ccb78069c4561958004d860cc6507
- **v1 had:** Already strong — 240px left nav + table + bulk action bar + slide-in detail panel
- **v2 has:** Same architecture but tightened density. Sub-nav 36px items. Title 22px (NOT display). Inline pill row "3 admin · 2 manager · 5 member · 2 viewer" added below title. Dense table 44px. Slide-in detail panel uses translateX(100%→0) 200ms ease-out cubic-bezier(0.23, 1, 0.32, 1) per Emil — drawer-pattern, NOT modal.
- **Skill insight:** Emil drawer easing applied. Settings was already mostly-correct in v1; v2 just refines density + animation register.

---

## How to use these screens

1. **Owner preview:** open direct URLs side-by-side with v1 (v1 catalog at `docs/stitch-full-recommendations/INDEX.md`)
2. **Compare with external research:** Asana / Monday / ClickUp (v1 framing) versus Linear / Notion / Raycast (v2 framing)
3. **Decide:** which register fits KalaTask's pilot intent? Productivity-grade dense (v2) or feature-grade spacious (v1)?
4. **If v2 winning:** apply migration plan from `docs/stitch-v2-design-system-proposal.md`
5. **If v1 winning:** keep `docs/stitch-design-system-proposal.md` as adoption blueprint, archive v2

This INDEX is the **catalog**. The proposal doc is the **adoption blueprint**. Both are read-only — no code changes from this batch.
