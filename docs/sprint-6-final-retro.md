# Sprint 6 Final — Retro

**Date:** 2026-04-30
**Branch:** `sprint-6` → PR #7 → `main`
**Revert anchor:** tag `sprint-6-pre-overhaul`
**Commits:** 7 phase commits (a309b21 … 2202938)
**Wall-clock:** ~one autonomous session (Phase B owner checkpoint approved mid-flow)

---

## Goal

Land the unified design system spec (`docs/design-system-final-spec.md`, 790 lines, owner-curated from Stitch v1 + Asana/Monday/ClickUp research) into KalaTask v2.2 — additively, without breaking Sprint 1–5 functionality.

Owner decisions resolved before execution:
- **D1** Tertiary warm orange `#6F3600` = ADOPT
- **D2** Modal radius 12 → 16 px = BUMP
- **D3** Inter Display font (~10 KB) = ADD
- **D4** Primary split (`primary` darker for AA + `primary-container` for fill) = SPLIT
- **D5** Source-csv violet `#8B5CF6` = KEEP as legacy (dual-accent)

---

## Phase-by-phase log

| Phase | Scope | Commit | Key metric |
|---|---|---|---|
| A | Foundation tokens + Tailwind mappings (~80 entries) | `a309b21` | Bundle 146.57 → 150.28 KB (+3.71 KB) |
| B | Build verify + dashboard screenshot + **owner checkpoint** | (no commit; checkpoint cleared) | Type errors 0; checkpoint approved |
| C | Primitive refactor — Button + Card + Dialog + Input + status badge alpha | `a4915f2` | +0.13 KB; brand variants opt-in |
| D | Page typography upgrade (Inter Display via alias) + 3 leaf components | `8d333a8` | +0.02 KB; 12 page heads inherit Display |
| E | Microcopy library extended (spec §8 gaps) | `b9ab23c` | +47 LOC labels.ts; 0 KB JS impact |
| F | Animation polish — page mount fade-in × 12 routes + toast | `2d93277` | +0.02 KB; Emil-aligned ≤ 300 ms |
| G | EmptyState v2.2 with secondary-action API | `ef97faa` | +0.10 KB; 4 unit tests pass |
| H | Lighthouse + bundle + E2E sweep | `2202938` | a11y 93, perf 92, 145 E2E pass, 1 stale fixed, 1 backend flake |
| I | Visual evidence + retro + ADR-010 + BRAND.md v2.2 | (this commit) | 6 post-Stitch screenshots captured |

**Total bundle delta:** 146.57 → 150.73 KB gzip = **+4.16 KB** (target ≤ 5 KB ✅, hard ceiling 250 KB).

---

## What landed

### Tokens (theme.css §15 v2.2 block, ~211 lines)
- 9-level surface tonal scale (replaces v2.1 5-level — last-wins cascade redefines `surface-container-low/high`, adds `lowest/highest/variant`)
- M3 color triads — primary/secondary/tertiary with container variants per D4 split
- Tertiary warm orange (D1) for net-new accent without disturbing the deep-blue + sky-blue dual-tone identity
- Status fg + bg pairs with bg = `rgb(R G B / 0.1)` for cleaner tonal blends
- Outline tokens for borders (`outline`, `outline-variant`)
- Full M3 typography hierarchy: display/headline/title/body/label × lg/md/sm + caption
- Inter Display font @import (D3) — flows through `text-display` + `text-headline` aliases via Tailwind config one-line upgrade
- Stitch spacing — gutter 24 px, container 1280 px, margin-desktop/mobile
- Brand-tinted elevation 4-level (Deep Blue alpha 0.08–0.10) replacing neutral grey shadows
- Animation: 5 durations (0/100/200/300/500 ms) × 5 easings (linear/in/out/in-out/spring) + 3 reusable @keyframes (fade-in/fade-up/scale-in)

### Tailwind mappings (~140 lines added)
- 9-level surface scale, M3 triads, status fg+bg, outline, tertiary, source-mom alias
- `font-display` family + 18 fontSize entries (display-lg/md/sm … label-lg/md/sm + caption)
- Spacing/gap additions, `maxWidth.container` Stitch alias
- transitionDuration `medium`, full transitionTimingFunction palette
- keyframes + animation entries for fade-in/fade-up/scale-in
- `borderRadius.kt-xl` 20 px, `kt-lg` bumped 12 → 16 (D2)
- `shadow-brand-xl` 4th tier

### Globals (53 lines)
- Inter Display @import URL update
- `.elev-0 … .elev-4` utility classes (semantic shorthand for tonal+shadow combos)
- v2.2 animation recipes with `prefers-reduced-motion` honored

### Primitives
- **Button:** brand / brand-secondary / ghost-brand variants; active scale-[0.98] + transition-all duration-fast
- **Card:** bg-surface-container-lowest, border-outline-variant, shadow-brand-sm + hover:shadow-brand-md
- **Dialog:** rounded-kt-lg (16 px), bg-surface-container-lowest, animate-scale-in entrance
- **Input:** border-outline-variant, bg-surface-container-lowest, focus ring primary-container
- **Status badges:** bg now rgb 10 % alpha of fg hue

### Pages (12 routes touched mechanically)
- Top-level `min-h-screen bg-canvas` + `animate-fade-in` (200 ms ease-out soft entrance on mount)
- Typography auto-upgrade: `text-headline` + `text-display` aliases now inherit Inter Display family — zero per-page edits

### Leaf components
- KanbanView card → surface-container-lowest + outline-variant + shadow-brand-sm hover-md
- MentionAutocomplete → surface-container-lowest + outline-variant + shadow-brand-lg + animate-fade-up
- Tooltip → rounded-kt-md + shadow-brand-lg
- ToastContainer → rounded-kt-md + animate-fade-up (300 ms)

### Microcopy (`labels.ts` extension)
- ERROR: SERVER, VALIDATION_EMAIL, VALIDATION_REQUIRED
- ACTION: OK_GOT_IT, SKIP_FOR_NOW, CONTINUE, BACK, YES_CONTINUE, SAVE_CHANGES, EDIT, ADD, DONE
- TOAST: SAVE_FAILED, DELETE_FAILED, STATUS_FAILED, COMMENT_FAILED, UPLOAD_SUCCESS, UPLOAD_FAILED, INVITE_SENT(email), INVITE_FAILED
- PLACEHOLDER: DEADLINE, MENTION, GENERIC_SEARCH
- HELPER (new namespace): EMAIL_BUSINESS, TASK_TITLE, TASK_DESCRIPTION, DEADLINE_OPTIONAL

### EmptyState v2.2
- Inline `--kt-deep-*` style → semantic `bg-primary-container/15` + `text-on-primary-container`
- Title typography: `text-base/lg` → `text-title-md/lg`
- Body: `text-sm text-muted-foreground` → `text-body-md text-on-surface-variant`
- New optional API: `secondaryActionLabel + secondaryActionHref` for spec §7.5 link beside CTA

---

## Verification

### Build
- ✅ Vite production build clean across all 7 phases
- ✅ TypeScript strict, 0 errors
- ✅ tsc -b passes

### Bundle (gzip)
| Phase | Initial JS | Δ from baseline |
|---|---|---|
| Baseline | 146.57 KB | — |
| Post-A | 150.28 KB | +3.71 |
| Post-C | 150.41 KB | +3.84 |
| Post-D | 150.43 KB | +3.86 |
| Post-E | 150.61 KB | +4.04 |
| Post-F | 150.63 KB | +4.06 |
| Post-G | 150.73 KB | +4.16 |

Target ≤ +5 KB ✅. Hard ceiling 250 KB ✅ (40 % headroom).

### Lighthouse (login page, headless Chrome)
- Performance: **92** (Sprint 6 baseline 92 — held)
- Accessibility: **93** (target ≥ 90 — held)
- Best Practices: **100**
- SEO: **91**

### E2E (full Sprint 1-5 suite)
- 145 passed
- 1 stale assertion fixed (`sprint-2-checkpoint-3:379` `bg-red-100` → `bg-status-blocked-bg` — was already stale post Sprint 6 overhaul)
- 1 backend-timeout flake (`sprint-5-screenshots` MoM upload review queue) — pre-existing, not v2.2-related
- 5 intentional skips (pgTAP-only suites)
- 0 regressions caused by v2.2 token additions

### Visual evidence
- `docs/sprint-6-final-screenshots/01-dashboard-phase-a-applied.png` — Phase B owner-checkpoint reference
- `docs/sprint-6-final-screenshots/0[1-6]-*-phase-i-final.png` — 6 post-Stitch routes captured at session end (dashboard, projects, admin/usage, admin/mom-import, tasks, productivity)
- Pre-Stitch baseline references: `docs/sprint-6-overhaul-screenshots/`

---

## Skills usage log

- **Impeccable** (UI polish + anti-pattern critique) — applied as inline mental review at primitive refactor (Phase C) and page polish (Phase D). No anti-patterns flagged that warranted blocking; brand-tinted elevation, semantic tokens, opt-in variants all align with skill principles.
- **emil-design-eng** (Kowalski animation principles) — drove Phase F decisions: page mount fade-in 200 ms ease-out (not decorative), button active:scale-[0.98] tactile press at 100 ms, modal scale-in 200 ms, toast fade-up 300 ms, all under 300 ms cap, `prefers-reduced-motion` already honored from v2.1.
- **kalatask-brand-tokens** — implicit guard against hardcoded hex; only token references introduced.
- **kalatask-microcopy** — extension of labels.ts followed BRAND voice santai-profesional Bahasa Indonesia.
- Both Impeccable + Emil were applied as guidance, not blocking gates — owner mandated continuous autonomous flow after Phase B checkpoint.

---

## What's NOT in this overhaul (scoped out)

- Spec §7.6 onboarding tooltip "spotlight" pattern — current Tooltip uses `--kt-deep` inline style; F10 onboarding revisit deferred to Sprint 7.
- v2.1 status namespace cleanup (`--kt-status-progress*` vs v2.2 `--kt-status-in-progress*` coexist). Components can migrate progressively.
- Wholesale `text-base/sm/xs` migration to `text-body-md/sm/label-md` — kept as Tailwind defaults to avoid visual regression risk (sizes shrink 2 px each in spec mapping). Owner can opt-in route-by-route.
- PRD UX section refresh — owner approved spec separately; PRD already references BRAND.md v2.x changelog.
- Light/dark mode contrast pass for new on-surface tokens — basic dark overrides added but not fully audited.

---

## Risks accepted

1. **Two surface naming schemes coexist** (v2.1 `surface-bright`/`container` + v2.2 `surface-container-lowest/highest/variant`). Documented in BRAND.md §11 v2.2 row; future cleanup sprint can collapse.
2. **Inter Display adds ~10 KB font payload at runtime** (not bundled in JS). Mobile FCP impact monitored via Lighthouse — Performance 92 held. If Δ > 200 ms in future audits, fallback to Inter sans-only (single var change).
3. **Spec §7.4 status pattern uses 10 % alpha bg** — possible contrast regression on dark mode; basic dark overrides shipped, full a11y audit deferred.

---

## Memory updates

- `sprint-6-final-closed.md` (NEW) — summarizes this overhaul + tag location + ADR-010 + BRAND.md v2.2.
- `sprint-6-closed.md` previous entry kept as historical reference.
- Naming locks (Plaud Template v2 etc) unchanged.
- `labels-source-of-truth.md` reaffirmed — `apps/web/src/lib/labels.ts` extended, no new locale files.

---

## Sprint 7 ready

Open agenda items:
1. Onboarding tooltip spotlight pattern (spec §7.6 deferred).
2. v2.1/v2.2 surface namespace consolidation (collapse to single naming).
3. Wholesale typography migration to `text-body-md/sm` semantic scale (route-by-route opt-in or one big PR).
4. Dark mode visual audit for v2.2 tokens.
5. Bundle audit if F-tier features added in Sprint 7+ approach +5 KB cumulative budget.

---

## Closing

PR #7 ready to undraft. Revert anchor in place. Owner can re-evaluate via the 6 post-Stitch screenshots in `docs/sprint-6-final-screenshots/` — pre-Stitch baseline at `docs/sprint-6-overhaul-screenshots/` for side-by-side comparison.

---

# Patch round (2026-04-30)

**Trigger:** Owner verified localhost vs Stitch references after the v2.2 token round and found a structural gap. Token-only refactor wasn't enough — Stitch screens require DOM hierarchy changes (KPI grids, panels, sidebar context, tab strips, leaderboards). Spec for the patch round captured in this same conversation.

**Workflow change (now mandatory):** per route, fetch raw Stitch HTML via `mcp__stitch__get_screen → htmlCode.downloadUrl → curl save`, adapt DOM hierarchy in React, swap Stitch raw colors for v2.2 brand tokens, screenshot pair side-by-side. Pre-flight `mcp__stitch__list_screens` recommended to handle ID typos (one ID in spec was 33-hex; actual was 32-hex).

## Patch phase log

| Phase | Scope | Commit |
|---|---|---|
| 1 | Extract 13 raw Stitch HTML into `docs/stitch-html-export/` (5 184 lines) | `5354136` |
| 2a route 1 | `/dashboard` — hero + 3-KPI strip + quick-action strip + 2-col activity feed/featured project + priorities/illustration | `b05b83f` |
| 2a route 2 | `/dashboard/productivity` — 4-KPI sparkline strip + 2-col velocity-chart + leaderboard + insights row (derived) | `5baf75b` |
| 2a route 3 | `/admin/usage` — 3-metric strip + 2-col top-tables + alerts panel + Optimization Tips callout | `7fdc2d9` |
| 2b | `/projects` (status pill row + card grid hover lift) | `687480e` |
| 2b | `/workload` + `/bottleneck` (severity summary KPI cards + token-tinted detail panels) | `98c1c51` |
| 2b | `/admin/mom-import` (list + review with breadcrumb + section panels) | `783817a` |
| 2b | `/projects/:id` + `/tasks/:id` (breadcrumbs + display headlines) | `ac45dbf` |
| 2b | `/dashboard/manager` (KPI tiles preserved + section panel re-skin) | `9a101e5` |
| Build hygiene | unused imports + `ProjectStatus` import path fix | `e3ab266` |

**Routes deferred (no existing route in `App.tsx`):** `/tasks`, `/onboarding`, `/settings`. Stitch refs available in `docs/stitch-html-export/04-tasks.html`, `12-onboarding.html`, `13-settings-team.html` for future sprint.

## Visual evidence (`docs/sprint-6-patch-comparison/`)

7 post-Stitch screenshots paired with 5 Stitch references (manager-dashboard has no dedicated Stitch ref — Stitch '06 settings' is closest analog):

| File pair | Route |
|---|---|
| `01-dashboard-{stitch,after}.png` | `/` |
| `02-projects-{stitch,after}.png` | `/projects` |
| `08-admin-usage-{stitch,after}.png` | `/admin/usage` |
| `09-workload-{stitch,after}.png` | `/workload` |
| `10-bottleneck-{stitch,after}.png` | `/bottleneck` |
| `11-productivity-{stitch,after}.png` | `/dashboard/productivity` |
| `14-manager-dashboard-after.png` | `/dashboard/manager` (no separate Stitch ref) |

## Test surface — patches required

The structural refactor changed several headings and labels. Stale assertions surfaced and were updated, not bypassed:

- **`auth.spec.ts`** — `getByRole heading user.fullName` no longer matches; new dashboard hero is `Selamat datang, {firstName}`. Email no longer rendered on dashboard body (AppHeader still shows full name + role badge).
- **`dashboards.spec.ts`** — heading text labels: `Productivity Dashboard` → `Productivity` (matches Stitch); `Workload View` → `Workload Tim`; `Bottleneck View` → `Bottleneck Tugas`. Period filter caption replaced by tab role (`getByRole tab Kuartal selected`).
- **`ProductivityDashboardPage.tsx`** — refactor introduced hooks-order violation (`useMemo` placed after `if (authLoading) return`). Fixed by moving all `useMemo` calls above the early-return guards.

## Bundle metric (post-patch)

153.54 KB gzip — Δ +6.97 KB from baseline 146.57 KB. Within 250 KB hard ceiling, slightly over the +5 KB target, accepted given the structural depth (4-KPI sparklines, leaderboard, insights derivation, 2-col layouts, semantic section panels).

## Acceptance

Owner approved Phase 2a checkpoint (`/dashboard`, `/dashboard/productivity`, `/admin/usage` pairs in `docs/sprint-6-patch-comparison/`) and instructed continuous autonomous execution for the remaining 7 routes. PR #7 carries all patch-round commits; tag `sprint-6-patch-complete` marks the closing point.
