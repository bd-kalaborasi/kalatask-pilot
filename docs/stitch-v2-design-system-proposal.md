# Stitch v2 — Design System Proposal

**Date:** 2026-04-30
**Source:** Stitch v2 13 routes generated with Impeccable + Emil Kowalski skill enforcement
**Stitch v2 design system asset:** `assets/6153443513110765127`
**Stitch v2 project:** `3438363398905262377`
**Status:** Read-only proposal. Owner consolidates v1 vs v2 before applying.

---

## Executive summary — what's different from v1 proposal

v1 proposal (`docs/stitch-design-system-proposal.md`) was Material 3-leaning: 9-level surface scale, dual-font (Inter Display + Inter), tertiary warm orange auto-generated, FIDELITY color variant.

**v2 proposal is Linear/Notion-leaning:** 5-level neutral surface scale, single Inter family, two-color brand discipline (deep blue + sky), NEUTRAL color variant. Animation register fully defined per Emil Kowalski framework. Density: dense (40-44px rows). Anti-slop bans enforced as design system mandate, not optional.

**Direction question for owner:** v1 (M3-rich, Asana/Monday tier, decorative-acceptable) or v2 (Linear/Notion-restrained, productivity-grade, anti-slop strict)?

If v2 wins, apply this proposal. If v1 wins, archive v2 and apply v1 proposal.

---

## 1. Color system

### 1.1 Brand palette — Restrained discipline

```css
:root {
  /* Two-color brand only */
  --kt-deep:  #0060A0;  /* primary action, current selection, status indicator */
  --kt-sky:   #00A0E0;  /* accent, link, in_progress state, focus ring */

  /* Brand scales 50-800 retained from v1 BRAND.md (no change) */
}
```

**No tertiary.** v1 Stitch generation produced `#6F3600` warm orange via FIDELITY variant. v2 NEUTRAL variant suppressed it. Code MUST NOT introduce a third brand hue.

### 1.2 Surface tonal scale — 5 levels (NOT 9)

```css
:root {
  --kt-surface:                #F9F9FC;  /* page background */
  --kt-surface-bright:         #FFFFFF;  /* lifted: dialog, popover */
  --kt-surface-container-low:  #F4F4F5;  /* recessed track, tab strip */
  --kt-surface-container:      #EEEEF0;  /* default container */
  --kt-surface-container-high: #E8E8EA;  /* hover state */
  --kt-surface-dim:            #DADADC;  /* disabled, placeholder */
}
```

5 is enough for a productivity tool. v1 proposal had 9 levels (M3 standard). v2 simpler scale reduces decision overhead in component implementation — most cards just need bright + container-low + container-high.

### 1.3 Status palette — retained, no decoration

| Status | Hex | Usage |
|---|---|---|
| `todo` (slate) | `#A1A1AA` | small chip, NOT column bg |
| `in_progress` (sky) | `#00A0E0` | small chip, NOT column bg |
| `review` (amber) | `#F59E0B` | small chip |
| `done` (green) | `#16A34A` | small chip |
| `blocked` (red) | `#EF4444` | small chip + bold-red column header text |

**Critical:** status colors used as 24-32px chips, NEVER as 80-200px column backgrounds (v1 Kanban tinted columns by status — too much chroma). Bold-red column header text + red count chip carries urgency without color flood.

### 1.4 Semantic feedback — retained from v1

| Token | Use case |
|---|---|
| `--kt-success` `#16A34A` + `-bg` + `-border` | Health green, success toast |
| `--kt-warning` `#F59E0B` + `-bg` + `-border` | Health amber, warning |
| `--kt-danger` `#DC2626` + `-bg` + `-border` | Health red, error |
| `--kt-info` `#00A0E0` (= sky) + `-bg` + `-border` | Neutral hint |

Each pairs with **full 1px border + leading icon + tinted bg**. NEVER `border-left: 4px` colored — Impeccable absolute ban.

---

## 2. Typography — single Inter family

### 2.1 Drop Inter Display

v1 Stitch generation imposed Inter Display for headline+display tiers. v2 PRODUCT register requires single Inter family. Consequences:
- `globals.css` Google Fonts import: KEEP `Inter:wght@400;500;600;700;800` only. Drop `Inter Display`.
- Bundle delta: -0KB to +0KB (Inter Display was an extra HTTP request that the v2 proposal removes).

### 2.2 Type scale — tight ratio

```css
:root {
  --kt-text-h1:    24px; /* page title — was 28px in v1 */
  --kt-text-h1-line: 32px;
  --kt-text-h1-weight: 600;

  --kt-text-h2:    18px;  /* section title — was 22px */
  --kt-text-h2-line: 24px;
  --kt-text-h2-weight: 600;

  --kt-text-h3:    16px;  /* card title */
  --kt-text-h3-weight: 600;

  --kt-text-body:  14px;
  --kt-text-body-line: 20px;

  --kt-text-small: 12px;  /* labels, metadata, chips */
  --kt-text-small-line: 16px;
  --kt-text-small-weight: 500;
}
```

**No display tier.** v1 had `--kt-text-display 36px`. v2 removes entirely. Even DashboardPage greeting deprecated (v2 design strips greeting from /dashboard). KPI big numbers cap at 32-36px tabular but apply rarely.

**Tabular numbers:** ALL numerical data uses `font-variant-numeric: tabular-nums`. Already in v2.1 theme; v2 enforces by default in mono utility class.

### 2.3 Tailwind fontSize entries

```ts
fontSize: {
  'h1':    ['var(--kt-text-h1)',    { lineHeight: 'var(--kt-text-h1-line)',    fontWeight: 'var(--kt-text-h1-weight)' }],
  'h2':    ['var(--kt-text-h2)',    { lineHeight: 'var(--kt-text-h2-line)',    fontWeight: 'var(--kt-text-h2-weight)' }],
  'h3':    [16, { lineHeight: '20px', fontWeight: '600' }],
  'body':  ['var(--kt-text-body)',  { lineHeight: 'var(--kt-text-body-line)' }],
  'small': ['var(--kt-text-small)', { lineHeight: 'var(--kt-text-small-line)', fontWeight: 'var(--kt-text-small-weight)' }],
}
```

Backward-compat aliases: `text-headline` → `text-h1`, `text-title` → `text-h2`, `text-body` keep, `text-label` → `text-small`. Apply as alias-only during migration.

---

## 3. Density — dense default

```css
:root {
  --kt-row-height-table:    44px;
  --kt-row-height-compact:  40px;
  --kt-row-height-sub:      32px;  /* sub-headers, group rows */

  --kt-pad-card:     12px;  /* was 16px in v2.1 */
  --kt-pad-page:     24px;  /* was 24-32px range */

  --kt-gap-card:     12px;
  --kt-gap-section:  16px;  /* was 24px */
  --kt-gap-page:     24px;  /* was 40px */
}
```

**Target:** 25+ rows visible on 1280×800 without scroll. v1 medium-spacious got ~12 rows. v2 dense gets ~25 — productivity-grade.

---

## 4. Motion register — complete Emil framework

### 4.1 Easing curves

```css
:root {
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);  /* Default UI ease-out (strong) */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* Reflow / cards rearranging */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);  /* Toast, drawer-style, slide-in panel */
  /* NEVER use ease-in for UI elements */
}
```

### 4.2 Duration tokens

```css
:root {
  --dur-instant:     0ms;     /* inline edit, optimistic update, tab body swap */
  --dur-press:       100ms;   /* button :active scale */
  --dur-fast:        150ms;   /* modal close, dropdown close, validation error */
  --dur-base:        200ms;   /* modal open, dropdown reveal, tab indicator, kanban reflow, slide-in panel */
  --dur-toast-in:    400ms;   /* toast enter only — slightly longer for positive surprise */
  --dur-toast-out:   200ms;   /* toast exit always faster than enter */
  --dur-skeleton:    2000ms;  /* skeleton calm pulse */
  --dur-hold:        2000ms;  /* hold-to-confirm (asymmetric: 2s in linear, 200ms out ease-out) */
}
```

### 4.3 Recipe library — minimum required

```css
@layer utilities {
  /* Buttons feel responsive */
  .kt-press {
    transition: transform var(--dur-press) var(--ease-out);
  }
  .kt-press:active {
    transform: scale(0.97);
  }

  /* Modal: scale-in centered (NO origin-aware) */
  .kt-modal-enter {
    animation: kt-modal-enter var(--dur-base) var(--ease-out);
  }
  @keyframes kt-modal-enter {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }

  /* Popover/coachmark: origin-aware (transform-origin set per-instance from trigger) */
  .kt-popover-enter {
    animation: kt-popover-enter var(--dur-base) var(--ease-out);
  }

  /* Toast: drawer pattern */
  .kt-toast-enter {
    animation: kt-toast-enter var(--dur-toast-in) var(--ease-drawer);
  }
  @keyframes kt-toast-enter {
    from { opacity: 0; transform: translateY(100%); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .kt-toast-exit {
    animation: kt-toast-exit var(--dur-toast-out) var(--ease-out) forwards;
  }

  /* Slide-in side panel (settings detail panel) */
  .kt-drawer-enter {
    animation: kt-drawer-enter var(--dur-base) var(--ease-drawer);
  }
  @keyframes kt-drawer-enter {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }

  /* Validation shake */
  .kt-shake {
    animation: kt-shake 250ms var(--ease-out);
  }
  @keyframes kt-shake {
    0%, 100% { transform: translateX(0); }
    25%      { transform: translateX(-4px); }
    75%      { transform: translateX(4px); }
  }

  /* Skeleton calm pulse */
  .kt-skeleton {
    animation: kt-skeleton var(--dur-skeleton) ease-in-out infinite;
  }
  @keyframes kt-skeleton {
    0%, 100% { opacity: 0.5; }
    50%      { opacity: 1; }
  }

  @media (prefers-reduced-motion: reduce) {
    .kt-press, .kt-modal-enter, .kt-popover-enter,
    .kt-toast-enter, .kt-toast-exit, .kt-drawer-enter,
    .kt-shake, .kt-skeleton {
      animation: none !important;
      transition: none !important;
    }
  }
}
```

### 4.4 What does NOT animate

- Cmd-K palette open/close → instant (used 100s/day per Emil keyboard rule)
- Tab content swap → instant (only indicator pill animates)
- Inline edit text↔input → instant (no morph crossfade)
- Optimistic data swap → instant (the data IS the feedback)
- Status badge color change → instant (no crossfade)
- Drag-drop pointer follow → 1:1 (no spring smoothing)

---

## 5. Component pattern updates (vs v2.1 current code)

| Component | v2.1 current | v2 proposed change |
|---|---|---|
| `<Button>` | scale(0.97) :active 100ms | KEEP (already correct) |
| `<Card>` | `bg-surface shadow-brand-sm rounded-md p-card` | `bg-surface-bright` for elev-1, dense p=12px (v2.1 was 16px) |
| `<Dialog>` | scale-in 200ms ease-brand from center | KEEP (already correct, transform-origin: center) |
| `<Toast>` | slide-up 200ms | UPDATE: 400ms enter / 200ms exit asymmetric, ease-drawer |
| `<Input>` | bg-surface-container-low border-border focus-ring | KEEP |
| `<StatusBadge>` | inline-flex chip with bg-{status}-bg | KEEP |
| `<Tab>` | indicator pill animates | UPDATE: animate ONLY pill, body swap INSTANT (v2.1 may have content fade) |
| `<InlineStatusEdit>` | dropdown reveal | UPDATE: ensure transform-origin from trigger (Radix popover var), 150ms |
| Coachmark / Popover | (NOT YET BUILT) | NEW: origin-aware popover for /onboarding inline coachmarks |
| Drawer / Slide-in panel | (NOT YET BUILT) | NEW: translateX(100%→0) 200ms ease-drawer for /settings detail panel |

---

## 6. Files this would touch (when applied)

- `apps/web/src/styles/theme.css` — replace 9-level surface scale with 5-level (compress); remove display tier; tighten body+small sizes; expand motion tokens to include all `--dur-*` + `--ease-*`; remove dual-font setup
- `apps/web/tailwind.config.ts` — remove `text-display` entry, add `text-h1`/`text-h2`/`text-small` semantic, add `kt-press`/`kt-modal-enter`/etc utility classes, update transitionDuration with new tokens
- `apps/web/src/styles/globals.css` — remove `Inter Display` Google Fonts import; add full Emil recipe library; honor `prefers-reduced-motion`
- `apps/web/src/components/ui/card.tsx` — pad-card 12px default
- `apps/web/src/components/ui/toast-container.tsx` — asymmetric in/out timing
- `apps/web/src/components/views/KanbanView.tsx` — remove status-tinted column backgrounds, replace "Tertahan" red border-l with bold-red header text + red count chip
- `apps/web/src/pages/AdminUsagePage.tsx` — remove border-l-4 from health banner, full 1px border + leading icon
- `apps/web/src/pages/DashboardPage.tsx` — strip `display-lg` greeting (or the entire greeting), open directly to actionable content
- `apps/web/src/pages/ProjectsPage.tsx` — replace 3-col card grid with dense table
- `apps/web/src/pages/AdminMoMReviewPage.tsx` — collapse 5-card stats + sidebar layered nav into compact header + sticky bottom + single column
- 7 routes with hero-metric stat-card rows: replace with inline pill rows in section header
- `apps/web/src/components/onboarding/WizardTour.tsx` — refactor from modal wizard to inline coachmark popover anchored to UI elements

Estimated diff: ~600-1000 LOC changes (more aggressive than v1 proposal because v2 enforces stricter bans). Bundle delta: -3 to -5 KB (drop Inter Display + simpler surface scale).

---

## 7. Open decisions vs v1 proposal

The v1 proposal had 5 open decisions. v2 proposal has firm answers for 3:

1. **Tertiary color** → v1 left open; **v2: NO tertiary, two-color brand only** (NEUTRAL variant locked)
2. **Modal radius bump** → v1 suggested 12→16px; **v2: keep 12px (8px standard, 12px modal — Stitch ROUND_EIGHT design system, NOT 16px)**
3. **Inter Display font** → v1 suggested adding; **v2: drop entirely, single Inter family**
4. **Primary token split** (`#00487A` darker for AA vs `#0060A0` brand) → still open. v2 leans toward keeping single `#0060A0` since v2 NEUTRAL variant tunes contrast separately.
5. **Replace existing `--kt-deep` references** → keep `brand-deep` as alias for backward compat. No migration churn.

---

## 8. Cross-reference

- v2 generated screens: `docs/stitch-v2-recommendations/INDEX.md` (13 routes catalog)
- v2 critique + skill log: `docs/stitch-v2-pre-generation-critique.md`
- v1 generated screens: `docs/stitch-full-recommendations/INDEX.md`
- v1 design system proposal: `docs/stitch-design-system-proposal.md`
- Current code state: `apps/web/src/styles/theme.css` v2.1
- Brand spec: `docs/BRAND.md` v2.1
- Strategy companion: `PRODUCT.md` (root)
- Visual token registry: `DESIGN.md` (root)
