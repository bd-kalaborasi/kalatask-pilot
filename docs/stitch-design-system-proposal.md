# Stitch Design System — Code Adoption Proposal

**Date:** 2026-04-30
**Source:** Stitch full recommendations — `docs/stitch-full-recommendations/INDEX.md` (13 routes)
**Stitch design system asset:** `assets/f6a6eea0193c49ccbafdd0cf69a9cccf`
**Status:** Read-only proposal. NO code changes from this task. Owner consolidates with external research before applying.

---

## Executive summary

Stitch auto-generated a coherent design system across all 13 KalaTask routes, materially richer than the current `theme.css` v2.1. Adopting it requires:

- **Color expansion:** 9-level surface tonal scale (current code has 5), full M3 color triads with `-fixed` + `-fixed-dim` variants, separate primary `#00487A` (darker for AA contrast on light bg) vs primary-container `#0060A0` (the current brand-deep)
- **Typography refinement:** dual-font split (Inter Display for headline+display, Inter for body+label) with explicit letterSpacing + lineHeight per tier
- **Spacing semantic layer:** `gutter`, `margin-desktop/mobile`, `container-max` tokens beyond 4px scale
- **Variant FIDELITY:** Stitch chose this over MONOCHROME/NEUTRAL/TONAL_SPOT — keeps brand color saturated through tonal levels

Estimated implementation: **5-8 hours** for token foundation + primitive refactor. Subsequent route refactor is incremental.

---

## 1. Color system — proposed `theme.css` additions

### 1.1 Surface tonal scale (9 levels — replaces current 5)

```css
/* PROPOSED — replaces existing surface-* tokens */
:root {
  --kt-surface-container-lowest:  #FFFFFF;  /* deepest white — modal bg */
  --kt-surface-container-low:     #F3F3F6;  /* page section, recessed */
  --kt-surface-container:         #EEEEF0;  /* default container */
  --kt-surface-container-high:    #E8E8EA;  /* hover, lifted */
  --kt-surface-container-highest: #E2E2E5;  /* most prominent */
  --kt-surface:                   #F9F9FC;  /* default page bg */
  --kt-surface-bright:            #F9F9FC;  /* alias for accessibility */
  --kt-surface-dim:               #DADADC;  /* disabled/placeholder */
  --kt-surface-variant:           #E2E2E5;  /* card hover variant */

  /* Foreground tokens for surfaces */
  --kt-on-surface:          #1A1C1E;
  --kt-on-surface-variant:  #414750;
  --kt-inverse-surface:     #2F3133;
  --kt-inverse-on-surface:  #F0F0F3;

  /* Outline tokens for borders */
  --kt-outline:         #717781;
  --kt-outline-variant: #C1C7D2;
  --kt-surface-tint:    #0461A2;  /* tint for elevation overlay */
}
```

Naming: lowercase + dashes (matches existing convention). This **replaces** the current `--kt-surface-container-low` etc which exist at v2.1 but only at 5 levels — Stitch uses 9 (4 more granular).

### 1.2 Color triads (M3 standard) — adds new tokens

```css
:root {
  /* Primary triad */
  --kt-primary:                   #00487A;  /* darker for AA on white */
  --kt-on-primary:                #FFFFFF;
  --kt-primary-container:         #0060A0;  /* = current --kt-deep */
  --kt-on-primary-container:      #BBD9FF;
  --kt-inverse-primary:           #9DCAFF;
  --kt-primary-fixed:             #D1E4FF;
  --kt-primary-fixed-dim:         #9DCAFF;
  --kt-on-primary-fixed:          #001D35;
  --kt-on-primary-fixed-variant:  #00497C;

  /* Secondary triad */
  --kt-secondary:                  #00658F;
  --kt-on-secondary:               #FFFFFF;
  --kt-secondary-container:        #45BEFF;  /* = current --kt-sky */
  --kt-on-secondary-container:     #004A6B;
  --kt-secondary-fixed:            #C7E7FF;
  --kt-secondary-fixed-dim:        #86CFFF;
  --kt-on-secondary-fixed:         #001E2E;
  --kt-on-secondary-fixed-variant: #004C6D;

  /* Tertiary triad — NEW (no existing equivalent) */
  --kt-tertiary:                  #6F3600;
  --kt-on-tertiary:               #FFFFFF;
  --kt-tertiary-container:        #924902;
  --kt-on-tertiary-container:     #FFCCAA;
  --kt-tertiary-fixed:            #FFDCC6;
  --kt-tertiary-fixed-dim:        #FFB785;
  --kt-on-tertiary-fixed:         #301400;
  --kt-on-tertiary-fixed-variant: #713700;

  /* Error triad */
  --kt-error:               #BA1A1A;
  --kt-on-error:            #FFFFFF;
  --kt-error-container:     #FFDAD6;
  --kt-on-error-container:  #93000A;
}
```

**Why split primary into `primary` + `primary-container`?** AA contrast — `#00487A` on white = 8.4:1 (AAA), `#0060A0` on white = 7.8:1 (AAA still, but tighter). For text-on-button, use the darker `primary`. For container backgrounds, the current `#0060A0` works.

**Tertiary** is brand-new — it's a warm orange that Stitch picked for accent variations. Probably useful for `source-csv` (currently violet `#8B5CF6`) replacement, or for "ringkasan" chips. **Owner decision:** keep current source-csv violet OR adopt tertiary orange.

### 1.3 Update `tailwind.config.ts` colors

```ts
colors: {
  // ... existing brand-deep, brand-sky, status, notif, source ...

  // NEW — Stitch surface tonal scale (9 levels)
  'surface-bright':            'var(--kt-surface-bright)',
  'surface-container-lowest':  'var(--kt-surface-container-lowest)',
  'surface-container-low':     'var(--kt-surface-container-low)',
  'surface-container':         'var(--kt-surface-container)',
  'surface-container-high':    'var(--kt-surface-container-high)',
  'surface-container-highest': 'var(--kt-surface-container-highest)',
  'surface-dim':               'var(--kt-surface-dim)',
  'surface-variant':           'var(--kt-surface-variant)',

  // NEW — outline
  outline:                     'var(--kt-outline)',
  'outline-variant':           'var(--kt-outline-variant)',

  // NEW — M3 color triads
  'on-surface':                'var(--kt-on-surface)',
  'on-surface-variant':        'var(--kt-on-surface-variant)',
  'on-primary':                'var(--kt-on-primary)',
  'primary-container':         'var(--kt-primary-container)',
  'on-primary-container':      'var(--kt-on-primary-container)',
  'secondary-container':       'var(--kt-secondary-container)',
  'on-secondary-container':    'var(--kt-on-secondary-container)',
  tertiary: {
    DEFAULT:   'var(--kt-tertiary)',
    container: 'var(--kt-tertiary-container)',
  },
}
```

---

## 2. Typography — proposed dual-font architecture

### 2.1 Add Inter Display font

`globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Display:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

`theme.css`:
```css
:root {
  --kt-font-display: 'Inter Display', 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --kt-font-sans:    'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif;
}
```

### 2.2 Refined type tokens

```css
:root {
  /* Stitch tier — explicit lineHeight + letterSpacing per tier */
  --kt-text-display-lg-size:        57px;
  --kt-text-display-lg-line:        64px;
  --kt-text-display-lg-tracking:    -0.25px;
  --kt-text-display-lg-weight:      700;
  --kt-text-display-lg-family:      var(--kt-font-display);

  --kt-text-headline-md-size:       28px;
  --kt-text-headline-md-line:       36px;
  --kt-text-headline-md-weight:     600;
  --kt-text-headline-md-family:     var(--kt-font-display);

  --kt-text-title-lg-size:          22px;
  --kt-text-title-lg-line:          28px;
  --kt-text-title-lg-weight:        500;
  --kt-text-title-lg-family:        var(--kt-font-sans);

  --kt-text-body-lg-size:           16px;
  --kt-text-body-lg-line:           24px;
  --kt-text-body-lg-tracking:       0.5px;
  --kt-text-body-lg-weight:         400;

  --kt-text-body-md-size:           14px;
  --kt-text-body-md-line:           20px;
  --kt-text-body-md-tracking:       0.25px;
  --kt-text-body-md-weight:         400;

  --kt-text-label-lg-size:          14px;
  --kt-text-label-lg-line:          20px;
  --kt-text-label-lg-tracking:      0.1px;
  --kt-text-label-lg-weight:        500;
}
```

### 2.3 Tailwind fontSize entry

```ts
fontSize: {
  'display-lg':  ['var(--kt-text-display-lg-size)',  { lineHeight: 'var(--kt-text-display-lg-line)',  fontWeight: 'var(--kt-text-display-lg-weight)',  letterSpacing: 'var(--kt-text-display-lg-tracking)', fontFamily: 'var(--kt-text-display-lg-family)' }],
  'headline-md': ['var(--kt-text-headline-md-size)', { lineHeight: 'var(--kt-text-headline-md-line)', fontWeight: 'var(--kt-text-headline-md-weight)', fontFamily: 'var(--kt-text-headline-md-family)' }],
  'title-lg':    ['var(--kt-text-title-lg-size)',    { lineHeight: 'var(--kt-text-title-lg-line)',    fontWeight: 'var(--kt-text-title-lg-weight)' }],
  'body-lg':     ['var(--kt-text-body-lg-size)',     { lineHeight: 'var(--kt-text-body-lg-line)',     fontWeight: 'var(--kt-text-body-lg-weight)',     letterSpacing: 'var(--kt-text-body-lg-tracking)' }],
  'body-md':     ['var(--kt-text-body-md-size)',     { lineHeight: 'var(--kt-text-body-md-line)',     fontWeight: 'var(--kt-text-body-md-weight)',     letterSpacing: 'var(--kt-text-body-md-tracking)' }],
  'label-lg':    ['var(--kt-text-label-lg-size)',    { lineHeight: 'var(--kt-text-label-lg-line)',    fontWeight: 'var(--kt-text-label-lg-weight)',    letterSpacing: 'var(--kt-text-label-lg-tracking)' }],

  // Keep existing v2.1 names as aliases for backward compat:
  display:  '...',  // → display-lg
  headline: '...',  // → headline-md
  title:    '...',  // → title-lg
}
```

**Code changes propagating from this:**
- 12 page-level `<h2 className="text-headline">` (current) → keep working as alias, OR migrate to `text-headline-md`
- DashboardPage greeting `text-display` → migrate to `text-display-lg` for explicit tier
- CardTitle `text-title` → `text-title-lg`

---

## 3. Spacing — proposed semantic layer

### 3.1 Add Stitch spacing tokens

```css
:root {
  /* Stitch semantic spacing */
  --kt-space-base:        8px;    /* atomic unit */
  --kt-space-gutter:      24px;   /* between major sections */
  --kt-space-container:   1280px; /* max content width */
  --kt-margin-desktop:    32px;
  --kt-margin-mobile:     16px;
}
```

### 3.2 Tailwind spacing additions

```ts
spacing: {
  // ... existing card, page, section ...

  // NEW — Stitch
  'gutter':          'var(--kt-space-gutter)',
  'margin-desktop':  'var(--kt-margin-desktop)',
  'margin-mobile':   'var(--kt-margin-mobile)',
},
maxWidth: {
  // ... existing app, dashboard, reading ...
  'container':       'var(--kt-space-container)',
}
```

---

## 4. Roundness — keep current 8px

Stitch chose `ROUND_EIGHT` matching BRAND.md v1 mandate (8px standard, 16px modal). No change needed.

Tailwind already has:
```ts
borderRadius: {
  'kt-md': 'var(--kt-radius-md)',  // 8px — buttons, cards, inputs
  'kt-lg': 'var(--kt-radius-lg)',  // 12px — modals (consider bumping to 16px to match Stitch)
}
```

**Open question:** bump modal radius to 16px (matches Stitch design)? Current 12px is close. **Owner decision.**

---

## 5. Elevation — formalize 5-level scale

Stitch defines 5 levels:
1. **Level 0 (Page BG):** `--kt-surface` only, no shadow
2. **Level 1 (Card/Surface):** `--kt-surface-container-lowest` + `shadow-sm` (1-2% blue tint)
3. **Level 2 (Lifted):** `--kt-surface-container-low` + `shadow-md` (8% blue tint)
4. **Level 3 (Overlay):** dropdown/nav rail — `--kt-surface-container-high` + `shadow-md` + 1px outline-variant
5. **Level 4 (Modal):** `--kt-surface-container-highest` + `shadow-lg` + 15% backdrop blur

### 5.1 Add helper utility classes (proposed for `globals.css` `@layer utilities`)

```css
@layer utilities {
  .elev-0 { background: var(--kt-surface); }
  .elev-1 { background: var(--kt-surface-container-lowest); box-shadow: var(--kt-shadow-sm); }
  .elev-2 { background: var(--kt-surface-container-low); box-shadow: var(--kt-shadow-md); }
  .elev-3 { background: var(--kt-surface-container-high); box-shadow: var(--kt-shadow-md); border: 1px solid var(--kt-outline-variant); }
  .elev-4 { background: var(--kt-surface-container-highest); box-shadow: var(--kt-shadow-lg); backdrop-filter: blur(15px); }
}
```

Replaces hardcoded `bg-surface shadow-brand-md` patterns scattered across components.

---

## 6. Anti-pattern audit table — UPDATE

Current `DESIGN.md` v2.1 anti-pattern table is partially obsolete with Stitch upgrade. Update:

| Anti-pattern | v2.1 fix | Stitch v3 fix (proposed) |
|---|---|---|
| `bg-zinc-100` | `bg-surface-container-low` | `bg-surface-container-low` ✓ same |
| `bg-zinc-50` | `bg-surface-container` | `bg-surface-container-low` (more granular) |
| `bg-zinc-200` | `bg-surface-container-high` | `bg-surface-container-high` ✓ same |
| `bg-zinc-300` | `bg-surface-dim` | `bg-surface-dim` ✓ same |
| `text-2xl font-semibold` | `text-headline` | `text-headline-md` (explicit tier) |
| `text-3xl font-semibold` | `text-display` | `text-display-lg` |
| `text-xl font-semibold` | `text-title` | `text-title-lg` |
| `text-sm` | implicit | `text-body-md` |
| `text-xs` | implicit | `text-label-lg` |
| `text-zinc-500` | `text-muted-foreground` | `text-on-surface-variant` |
| `border-border` | shadcn token | `border-outline-variant` (Stitch) |

**Decision:** keep both naming schemes during migration. Stitch tokens are MORE specific than v2.1 — no breaking change required.

---

## 7. Component pattern updates

### 7.1 `<Button>` — add ghost/outline variant alignment

Current:
- `default`: `bg-primary text-primary-foreground` (shadcn HSL — zinc-900-ish)
- `outline`: `border border-input bg-background`

Stitch design:
- Primary: `bg-primary-container text-on-primary-container` (deep blue → brand)
- Secondary: `bg-secondary-container text-on-secondary-container` (sky)
- Ghost: `text-on-surface-variant hover:bg-surface-container-low`

**Migration:** introduce `brand` variant alongside existing `default` — don't break shadcn pattern. Components opting in switch from `default` to `brand`.

### 7.2 `<Card>` — adopt elev-1 default

Current: `bg-card text-card-foreground shadow-sm`
Stitch: `bg-surface-container-lowest shadow-brand-sm border-l-0` (+ optional border-bottom in header for separator)

### 7.3 `<Dialog>` — modal radius 16px

If `--kt-radius-lg` bumped to 16px per Stitch, `<Dialog>` automatically inherits. Otherwise add explicit:
```tsx
className="rounded-[16px]"
```

### 7.4 Status / Priority / Confidence chips

Stitch pattern: 10% opacity bg + bold text in same hue.

Current pattern uses opaque `bg-status-todo-bg` + matching text. Already aligned.

**Refinement:** verify `--kt-status-*-bg` values are 10% alpha of `--kt-status-*` (currently they're hex equivalents, may not be true 10%). If so, swap to `rgb(R G B / 0.1)` for cleaner blends with surface tonal scale.

---

## 8. Migration sequencing

**Phase A — Foundation (1-2h):** Add new theme.css tokens + tailwind config additions. NO removals. v2.1 + Stitch coexist.

**Phase B — Verify build (30 min):** `npm run build`, visual smoke check. Build must pass with both naming schemes alive.

**Phase C — Primitive refactor (1-2h):** Update `<Button>`, `<Card>`, `<Dialog>`, `<Input>`, status badges to consume new tokens (introduce `brand` variant for Button, surface-container-lowest default for Card, etc).

**Phase D — Page refactor (3-5h):** Replace `text-2xl` → `text-headline-md`, raw `bg-zinc-*` → `bg-surface-container-*` (Stitch granularity), consolidate elevation patterns to `.elev-N` utility.

**Phase E — Verify Lighthouse + bundle (30 min):** No perf regression > 5pts, bundle delta ≤ 5KB (extra font + CSS variables).

**Phase F — Visual evidence + screenshots (30 min):** Re-capture 6 routes side-by-side: pre-Stitch vs post-Stitch tokens.

**Total: 6-9 hours** for complete adoption.

---

## 9. Open decisions for owner consolidation

1. **Tertiary color:** Stitch generated warm orange `#6F3600 / #924902`. Replace current `--kt-source-csv` violet `#8B5CF6`? Or keep both?
2. **Modal radius bump:** 12px → 16px (Stitch standard)?
3. **Inter Display font:** add second Google Font (~10KB) for headline+display tiers? Yes if you want sharper editorial feel.
4. **Primary token split:** adopt `--kt-primary` (`#00487A`) as button text/icon vs `--kt-primary-container` (current `#0060A0`) as bg? This is the meaningful AA contrast improvement.
5. **Replace existing `--kt-deep` references:** keep `brand-deep` as alias for backward compat OR migrate to `primary-container`?

External research consolidation may resolve some of these — e.g., Asana uses single primary, Monday uses split. Apply pattern that matches the chosen reference.

---

## 10. What this proposal is NOT

- Not a code change
- Not approved by owner (decision pending consolidation with external research)
- Not a literal copy of Stitch HTML — patterns extracted, brand voice preserved
- Not breaking change — additive on top of existing v2.1 tokens

---

## 11. Files this would touch (when applied)

- `apps/web/src/styles/theme.css` (~+80 lines tokens)
- `apps/web/tailwind.config.ts` (~+50 lines mappings)
- `apps/web/src/styles/globals.css` (~+30 lines elev utilities + Inter Display @import)
- `apps/web/src/components/ui/button.tsx` (+ brand variant)
- `apps/web/src/components/ui/card.tsx` (default bg-surface-container-lowest)
- `apps/web/src/components/ui/dialog.tsx` (radius 16px)
- 13 route pages → grep + replace for new typography aliases (mostly mechanical)

Estimated diff: ~500-800 LOC additions, ~200 mechanical replacements. Bundle delta: ~3-5 KB gzipped (extra font CSS vars + Inter Display @import).

---

## 12. Cross-reference

- Index of generated screens: `docs/stitch-full-recommendations/INDEX.md`
- Current code state: `apps/web/src/styles/theme.css` v2.1, `apps/web/tailwind.config.ts`
- Brand spec: `docs/BRAND.md` v2.1
- Visual audit precedent: `docs/sprint-6-revision-visual-audit.md` (this proposal addresses the gaps identified there)
