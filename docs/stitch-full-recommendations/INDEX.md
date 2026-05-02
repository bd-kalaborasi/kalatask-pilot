# Stitch Full Recommendations — Index

**Generated:** 2026-04-30 (Sprint 6 Holistic Overhaul follow-up)
**Stitch project:** `10753861108950066040` (KalaTask Pilot)
**Purpose:** Reference design system for owner consolidation with external research (Asana / Monday / ClickUp). Read-only — no code changes from this task.

**Shared design prompt constraints applied to all routes:**
- Asana / Monday / ClickUp-tier polish
- Brand: deep blue primary `#0060A0`, sky accent `#00A0E0`
- Typography: Inter, M3 hierarchy (display / headline / title / body / label)
- Density: medium-to-spacious (anti-overwhelm per BRAND.md v2 §4)
- Voice: Bahasa Indonesia santai-profesional ("kamu", verb-led)
- Audience: 10-30 internal Kalaborasi employees, 4 roles (admin / manager / member / viewer)

Direct-link URL pattern: `https://stitch.withgoogle.com/projects/10753861108950066040/screens/{screen_id}`

---

## Auto-generated design system

Stitch auto-applied / created a fresh design system on first generation:

- **Design system asset:** `assets/f6a6eea0193c49ccbafdd0cf69a9cccf`
- **Display name:** KalaTask Design System
- **Color mode:** LIGHT, variant FIDELITY
- **Custom seed color:** `#0060A0` (deep blue), secondary override `#00A0E0`
- **Roundness:** ROUND_EIGHT (8px standard, 16px modal)
- **Body font:** Inter; **Headline:** Inter Display (sharper editorial feel)
- **Surface tonal scale (9 levels):** `surface-container-lowest` (#FFFFFF) → `surface-container-low` (#F3F3F6) → `surface-container` (#EEEEF0) → `surface-container-high` (#E8E8EA) → `surface-container-highest` (#E2E2E5); plus `surface-bright` / `surface-dim` / `surface` / `surface-variant`
- **Typography:** display-lg (57px / 700 / Inter Display), headline-md (28px / 600 / Inter Display), title-lg (22px / 500 / Inter), body-lg (16px / 400), body-md (14px / 400), label-lg (14px / 500)
- **Spacing tokens:** base=8px, container-max=1280px, gutter=24px, margin-desktop=32px, margin-mobile=16px
- **Color triads (M3):** primary `#00487A` + on-primary `#FFF` + primary-container `#0060A0` + on-primary-container `#BBD9FF`; secondary `#00658F` + container `#45BEFF`; tertiary `#6F3600` + container `#924902`; error `#BA1A1A` + container `#FFDAD6`
- **Elevation language:** brand-tinted shadows (Deep Blue at 0.08 alpha), never pure black

This is a step beyond current `theme.css` v2.1 — see `docs/stitch-design-system-proposal.md` for the proposed code-side adoption path.

---

## Route screens — desktop variants

All 13 routes generated. Mobile variants deferred (Stitch project preserves desktop screens; mobile can be regenerated as needed).

### 1. `/dashboard` (Beranda) — DESKTOP

- **Screen ID:** `0b0ad2fcd1514c34af5c23f22cf5d88e`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/0b0ad2fcd1514c34af5c23f22cf5d88e
- **Title:** "Beranda KalaTask"
- **Rationale:** Entry point for any of 4 roles. Hero greeting `Selamat datang, Budi` (display-lg / 57px / Inter Display) sets warm personal tone immediately. 3-card "Ringkasan kamu hari ini" surfaces pending tasks + active projects + team updates count. Quick-action verb-led buttons (`Buat project`, `Buat tugas`, `Lihat semua project`) replace previous "Buka Projects" link. Two-column main: activity feed (5 items, time-relative ID) + sticky priorities panel — separates broad context from focused next-step. Distinct from current /dashboard which has only one CTA + role description text.

### 2. `/projects` (Daftar Proyek) — DESKTOP

- **Screen ID:** `37773ac77c0349eb887c7079697175fe`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/37773ac77c0349eb887c7079697175fe
- **Title:** "Daftar Proyek KalaTask"
- **Rationale:** 3-column rich-card grid with progress bar, owner+avatar stack, status pill, last-update Indonesian relative time. Filter row: status chips with counts (`Aktif (5)`, `Perencanaan (3)` etc) + team selector + search + grid/list toggle. Hover lift reveals "..." menu. Distinct from current /projects which renders flat link cards with status badge only — no progress, no avatar stack, no count chips on filters.

### 3. `/projects/:projectId` (Detail Project — Kanban) — DESKTOP

- **Screen ID:** `051cd97d5d4c44cbbcb1de9f840dbd2f`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/051cd97d5d4c44cbbcb1de9f840dbd2f
- **Title:** "Detail Proyek - Kanban Board"
- **Rationale:** 280px sticky left sidebar shows project metadata (status pill, owner avatar+name, "Dibuat 5 Apr 2026", description, members avatar stack, "Update progress" CTA, ringkasan tugas with progress bar + per-status counts). Main right column: tabs row (List / Kanban / Gantt — Kanban active) + filter bar + 5-column Kanban with status-tinted column backgrounds, count chips per column, drag-handle cards with title + priority pill + assignee avatar + deadline relative. "Tertahan" column has red border-l-3 visual urgency. Distinct from current implementation which has columns but flat shell with no sidebar context.

### 4. `/tasks` (Tugas Saya — My Tasks) — DESKTOP

- **Screen ID:** `fb85fbd244424acea0f824265a524be8`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/fb85fbd244424acea0f824265a524be8
- **Title:** "Tugas Saya - KalaTask"
- **Rationale:** Cross-project My Tasks page (Asana-style). Tabs "Hari ini | Minggu ini | Akan datang | Selesai" with count badges. Group sections by deadline bucket (`Lewat tenggat (2)`, `Hari ini (4)`, `Besok (3)`, `Minggu ini (3)`) collapsible with sky chevron. Table rows 56px with inline status dropdown editable, project pill, priority pill. Empty state copy "Tugas kamu kosong — istirahat dulu yuk ☕". This route currently doesn't exist in the app — /tasks merges into /projects/:id list view. Stitch design proposes a dedicated cross-project task list.

### 5. `/tasks/:id` (Detail Tugas) — DESKTOP

- **Screen ID:** `feed8eb11459454388220e053f76013f`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/feed8eb11459454388220e053f76013f
- **Title:** "Detail Tugas - KalaTask"
- **Rationale:** Linear/ClickUp-tier task detail. 70/30 two-column. Left: editable title (headline-md), status pill click-to-edit dropdown, rich description body-lg, subtasks accordion with progress count, Activity & Komentar tabs with timeline + composer with @mention chips. Right sidebar: assignee/priority/deadline/project metadata, tags chip group, mini activity, watcher avatars stack, danger Delete + ghost Archive. Distinct from current TaskDetailPage which uses single-column layout, status badge non-interactive, no subtask accordion, no metadata sidebar.

### 6. `/admin/mom-import` (Daftar Import MoM) — DESKTOP

- **Screen ID:** `921fba453df342d2a8fba11cfd7686a2`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/921fba453df342d2a8fba11cfd7686a2
- **Title:** "Daftar Import MoM - KalaTask Admin"
- **Rationale:** Admin list of MoM imports. Stat row: 2 cards "12 Menunggu review" warning + "48 Tugas tergenerate bulan ini" success. Table rows 64px: file (filename mono + uploader avatar+name), tanggal rapat, action items count + breakdown chip "8 HIGH · 3 MEDIUM · 1 UNRESOLVED", status pill (pending_review/auto_approved/approved/rejected), aksi link. Filter row: status + date range + search filename + uploader. Cross-reference card bottom explains MoM vs CSV. Distinct from current AdminMoMImportPage which is upload-only (no list of past imports surfaces in header level).

### 7. `/admin/mom-import/:id` (MoM Review Queue) — DESKTOP

- **Screen ID:** `6c1a06158d174c128683c2f7c23bfe5e`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/6c1a06158d174c128683c2f7c23bfe5e
- **Title:** "Admin MoM Review Queue (High-Fi)"
- **Rationale:** Linear-tier approval workflow. Sticky stats card row 5 confidence levels with progress bar + "Approve HIGH saja (8 item)" bulk action. Tab nav with count chips. 70/30 split: left expandable item cards with confidence pill + raw PIC chip + decision buttons "Buat Tugas" primary / "Lewati" ghost / "Tolak" danger. Right sidebar "Ringkasan keputusan" with running counts + "Hint" callout + sticky bottom Approve. Distinct from current AdminMoMReviewPage which renders all groups in scroll without persistent decision tracking sidebar.

### 8. `/admin/usage` (Monitoring Penggunaan) — DESKTOP

- **Screen ID:** `cfc56e29193f49a98d4559f0caef444e`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/cfc56e29193f49a98d4559f0caef444e
- **Title:** "Monitoring Penggunaan"
- **Rationale:** Asana-tier free-tier health monitor. Health banner border-l-4 with tone (success ✅ / warning ⚠️ / critical 🚨). 3 metric cards: DB / Storage / MAU each with big mono value, progress bar tone-colored, % below, sky trend chip "+12 MB minggu ini". 50/50 split: left "Top tabel terbesar" list with sizes + bars; right "Alerts aktif" with empty state "Semua resource sehat ✅". Bottom callout "Tips menjaga free tier" 4 bullets. Distinct from current AdminUsagePage which has banner + 3 cards but no trends, no top-tables sparkline, no tips section.

### 9. `/workload` (Workload Tim) — DESKTOP

- **Screen ID:** `04cdea376a944ad6b0c5521df085a06a`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/04cdea376a944ad6b0c5521df085a06a
- **Title:** "Workload Tim - KalaTask"
- **Rationale:** Manager view of team task distribution. Stat row 4 cards (members / tasks aktif / overloaded / underloaded). 60/40 split: left stacked bar chart per-member with status segments (slate/sky/amber/emerald/red); right donut chart "Distribusi tim" load levels with center "60% Normal". Bottom "Anggota perlu perhatian" list of overloaded/blocked members with Reassign link. Distinct from current /workload which renders only a list of indicators without chart visualization.

### 10. `/bottleneck` (Bottleneck Tugas) — DESKTOP

- **Screen ID:** `6d9429a3951a4d2abeb97a73265d2388`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/6d9429a3951a4d2abeb97a73265d2388
- **Title:** "Bottleneck Tugas - KalaTask"
- **Rationale:** Manager view stuck tasks. Stat row 3 cards (total / avg stuck days / oldest). Heatmap section: status × age grid (3×3) with intensity color cells (green=0, amber=1-5, red=>5). Below: "Daftar tugas tertahan terlama" table sorted by stuck-days desc with hari stuck mono large + danger pill. ">7d" column gets red border-l visual urgency. Distinct from current BottleneckPage which has same data but flat unranked list.

### 11. `/productivity` (Productivity Dashboard) — DESKTOP

- **Screen ID:** `910a8dbb5e874b6a908b4ce9e4d21e81`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/910a8dbb5e874b6a908b4ce9e4d21e81
- **Title:** "Productivity Dashboard - KalaTask"
- **Rationale:** Manager performance overview. KPI row 4 metric tiles (Completion / Velocity / On-time / Cycle Time) each with display-lg big number + 60px sparkline + emerald trend chip. 60/40 split: left "Trend Mingguan" 4-line line chart toggleable legend; right "Top performer" leaderboard 5 members with medal emoji 🥇🥈🥉. Bottom "Insights" 3-card row: best day / bottleneck signal / recommendation with action button. Distinct from current ProductivityDashboardPage which lacks insights row and leaderboard.

### 12. `/onboarding` Wizard — DESKTOP

- **Screen ID:** `f879e1bb24064bbca37ce97479229a12`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/f879e1bb24064bbca37ce97479229a12
- **Title:** "KalaTask Onboarding - Langkah 3"
- **Rationale:** Modal centered max-w-lg, 16px corners, surface-bright bg, brand-tinted shadow-lg. Progress dots row (3 active, 2 outline) + "Langkah 3 dari 5" label-sm muted. Hero illustration ~120px Indonesian-themed orbital ring. Display-lg title + body-lg body. Visual demo: 3-tab toggle showing List/Kanban/Gantt switching. Bottom row: "Lewati tutorial" ghost + "Mundur" outline + "Lanjut" primary. ESC hint bottom-right. Distinct from current WizardTour which is functional but lacks brand illustration + demo + step number label hierarchy refinement.

### 13. `/settings` + `/admin/users` (Admin Settings) — DESKTOP

- **Screen ID:** `6c260f9d1205428590eef6fb8c3ca72e`
- **Direct URL:** https://stitch.withgoogle.com/projects/10753861108950066040/screens/6c260f9d1205428590eef6fb8c3ca72e
- **Title:** "Anggota Tim - Settings"
- **Rationale:** Linear/Notion-tier settings architecture. Left vertical nav 240px sticky with sections "Akun kamu" (Profile/Notifikasi/Keamanan), "Workspace" (Umum/Anggota tim active/Roles/Integrations), "Admin" (Usage/Audit log/App settings). Active = Anggota tim: search + role filter + "Undang anggota" primary, table with avatar+email/role pill dropdown/team badge/status chip/bergabung/aksi. Sticky bottom bulk action bar appears when checkboxes selected. Right slide-in panel for user detail edit. Distinct from current implementation which lacks unified settings shell — admin pages live as standalone routes without shared nav.

---

## Mobile variants

Mobile generation deferred for this batch — Stitch project preserves desktop screens and mobile can be regenerated via `mcp__stitch__generate_variants` from approved desktop screens when needed (cheaper than fresh generation since it operates on existing screens).

Suggested next session: pick top 3-5 mobile-critical routes (dashboard, /projects, /projects/:id, /tasks/:id, /onboarding) and generate `MOBILE` device-type variants applying the same design system.

---

## How to use these screens

1. **Owner preview:** open direct URLs (Stitch login required for project access)
2. **Compare with external research:** Asana / Monday / ClickUp screenshots side-by-side
3. **Consolidate:** unify Stitch + external findings into single design spec
4. **Tokenize:** extract recurring patterns into `theme.css` upgrade — see [`docs/stitch-design-system-proposal.md`](./../stitch-design-system-proposal.md)
5. **Apply to code:** Phase A (token foundation) → Phase B (primitive refactor) → Phase C (route refactor)

This INDEX is the **reference catalog**. The proposal doc is the **adoption blueprint**. Both are read-only — no code changes from this batch.
