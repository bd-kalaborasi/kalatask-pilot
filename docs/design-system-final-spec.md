# KalaTask Design System Final Spec — Unified

**Tanggal:** 2026-04-30
**Source:** Stitch v1 proposal + External research (Asana/Monday/ClickUp) + Owner decisions
**Target:** Direct paste-able ke `theme.css` + `tailwind.config.ts`
**Estimasi apply:** 6-9 jam wall-clock untuk Claude Code

---

## Executive Summary

Saya consolidate **Stitch v1** (winner per owner pick) dengan **research Asana/Monday/ClickUp**. Hasil: spec yang 70% based on Stitch v1, 30% enrichment dari research.

**Owner decisions resolved:**
- D1 Tertiary warm orange = YES
- D2 Modal radius 16px = YES
- D3 Inter Display font = YES
- D4 Primary split (primary + primary-container) = YES
- D5 Source-csv violet = KEEP sebagai legacy (dual-accent strategy)

**Yang research saya tambah (gap dari Stitch v1):**
1. Empty state component pattern + microcopy library
2. Onboarding tooltip pattern (untuk F10 wizard)
3. Status badge prominent pattern (Monday-inspired)
4. Animation duration tokens lebih granular
5. Microcopy guidelines dengan benchmark Asana/Monday verbal patterns

**Yang research saya UPDATE/UPGRADE dari Stitch v1:**
1. 9-level surface scale: keep as-is dari Stitch (research saya cuma 7-level, Stitch lebih granular = better)
2. M3 color triads: keep as-is dari Stitch (research saya gak cover ini = Stitch superior)
3. Typography hierarchy: keep Stitch's dual-font (Display + Sans), add semantic letter-spacing per tier
4. Elevation: 5-level Stitch + tambah brand-tinted untuk depth perception

---

## Section 1: Color System (theme.css additions)

### 1.1 Surface Tonal Scale — 9 levels (FROM STITCH V1)

```css
:root {
  /* Surface tonal scale - 9 levels (replaces v2.1 5-level) */
  --kt-surface-container-lowest:  #FFFFFF;  /* deepest white - modal bg */
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
  --kt-outline:          #717781;
  --kt-outline-variant:  #C1C7D2;
  --kt-surface-tint:     #0461A2;  /* tint for elevation overlay */
}
```

### 1.2 Color Triads — M3 Standard (FROM STITCH V1)

```css
:root {
  /* Primary triad — D4 split */
  --kt-primary:                    #00487A;  /* darker for AA on white (text-on-button) */
  --kt-on-primary:                 #FFFFFF;
  --kt-primary-container:          #0060A0;  /* current --kt-deep equivalent (button bg) */
  --kt-on-primary-container:       #BBD9FF;
  --kt-inverse-primary:            #9DCAFF;
  --kt-primary-fixed:              #D1E4FF;
  --kt-primary-fixed-dim:          #9DCAFF;
  --kt-on-primary-fixed:           #001D35;
  --kt-on-primary-fixed-variant:   #00487C;

  /* Secondary triad */
  --kt-secondary:                  #00658F;
  --kt-on-secondary:               #FFFFFF;
  --kt-secondary-container:        #45BEFF;  /* current --kt-sky */
  --kt-on-secondary-container:     #004A6B;
  --kt-secondary-fixed:            #C7E7FF;
  --kt-secondary-fixed-dim:        #86CFFF;
  --kt-on-secondary-fixed:         #001E2E;
  --kt-on-secondary-fixed-variant: #004C6D;

  /* Tertiary — D1 net-new warm orange */
  --kt-tertiary:                   #6F3600;
  --kt-on-tertiary:                #FFFFFF;
  --kt-tertiary-container:         #FFCCAA;
  --kt-on-tertiary-container:      #FFCCAA;
  --kt-tertiary-fixed:             #FFDCC6;
  --kt-tertiary-fixed-dim:         #FFB785;
  --kt-on-tertiary-fixed:          #301400;
  --kt-on-tertiary-fixed-variant:  #4713700;

  /* Error triad */
  --kt-error:                      #BA1A1A;
  --kt-on-error:                   #FFFFFF;
  --kt-error-container:            #FFDAD6;
  --kt-on-error-container:         #93000A;

  /* === ENRICHMENT FROM RESEARCH: Status colors (Monday-inspired) === */
  /* Visual prominent status badge system */
  --kt-status-todo-bg:        var(--kt-surface-container);
  --kt-status-todo-fg:        var(--kt-on-surface);
  --kt-status-in-progress-bg: #FEF3C7;  /* amber-100 */
  --kt-status-in-progress-fg: #92400E;  /* amber-800 */
  --kt-status-review-bg:      #DDD6FE;  /* violet-200 */
  --kt-status-review-fg:      #5B21B6;  /* violet-800 */
  --kt-status-done-bg:        #D1FAE5;  /* emerald-100 */
  --kt-status-done-fg:        #065F46;  /* emerald-800 */
  --kt-status-blocked-bg:     var(--kt-error-container);
  --kt-status-blocked-fg:     #93000A;

  /* === ENRICHMENT FROM RESEARCH: Source attribution colors === */
  /* D5: keep existing source-csv violet sebagai dedicated indicator */
  --kt-source-csv:    #8B5CF6;  /* keep legacy untuk MoM/Cowork source indicator */
  --kt-source-mom:    #8B5CF6;  /* alias */
  --kt-source-manual: var(--kt-on-surface-variant);
}
```

### 1.3 Tailwind Config Mapping

```ts
// tailwind.config.ts - colors extend
colors: {
  // ... existing brand-deep, brand-sky, status, notif, source ...
  
  // Stitch surface tonal scale (9 levels)
  'surface-bright':            'var(--kt-surface-bright)',
  'surface-container-lowest':  'var(--kt-surface-container-lowest)',
  'surface-container-low':     'var(--kt-surface-container-low)',
  'surface-container':         'var(--kt-surface-container)',
  'surface-container-high':    'var(--kt-surface-container-high)',
  'surface-container-highest': 'var(--kt-surface-container-highest)',
  'surface-dim':               'var(--kt-surface-dim)',
  'surface-variant':           'var(--kt-surface-variant)',
  
  // Outline
  outline:           'var(--kt-outline)',
  'outline-variant': 'var(--kt-outline-variant)',
  
  // M3 color triads
  'on-surface':         'var(--kt-on-surface)',
  'on-surface-variant': 'var(--kt-on-surface-variant)',
  'on-primary':         'var(--kt-on-primary)',
  'primary-container':  'var(--kt-primary-container)',
  'on-primary-container': 'var(--kt-on-primary-container)',
  'secondary-container': 'var(--kt-secondary-container)',
  'on-secondary-container': 'var(--kt-on-secondary-container)',
  tertiary: {
    DEFAULT:   'var(--kt-tertiary)',
    container: 'var(--kt-tertiary-container)',
  },
  
  // Status badge system
  'status-todo': {
    bg: 'var(--kt-status-todo-bg)',
    fg: 'var(--kt-status-todo-fg)',
  },
  'status-in-progress': {
    bg: 'var(--kt-status-in-progress-bg)',
    fg: 'var(--kt-status-in-progress-fg)',
  },
  'status-review': {
    bg: 'var(--kt-status-review-bg)',
    fg: 'var(--kt-status-review-fg)',
  },
  'status-done': {
    bg: 'var(--kt-status-done-bg)',
    fg: 'var(--kt-status-done-fg)',
  },
  'status-blocked': {
    bg: 'var(--kt-status-blocked-bg)',
    fg: 'var(--kt-status-blocked-fg)',
  },
  
  // Source attribution
  'source-csv':    'var(--kt-source-csv)',
  'source-mom':    'var(--kt-source-mom)',
  'source-manual': 'var(--kt-source-manual)',
}
```

---

## Section 2: Typography (FROM STITCH V1 + RESEARCH ENRICHMENT)

### 2.1 Add Inter Display font (D3 = YES)

```css
/* globals.css - add to top */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Inter+Display:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap');
```

```css
/* theme.css */
:root {
  --kt-font-display: 'Inter Display', 'Inter', 'Helvetica Neue', Arial, sans-serif;
  --kt-font-sans:    'Inter', 'Helvetica Neue', Arial, system-ui, sans-serif;
  --kt-font-mono:    'JetBrains Mono', ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
}
```

### 2.2 Typography Token Scale (Stitch + research enrichment)

```css
/* theme.css */
:root {
  /* Display tier — Inter Display (editorial feel) */
  --kt-text-display-lg-size:     57px;
  --kt-text-display-lg-line:     64px;
  --kt-text-display-lg-tracking: -0.25px;
  --kt-text-display-lg-weight:   700;
  --kt-text-display-lg-family:   var(--kt-font-display);

  --kt-text-display-md-size:     45px;
  --kt-text-display-md-line:     52px;
  --kt-text-display-md-tracking: -0.20px;
  --kt-text-display-md-weight:   700;
  --kt-text-display-md-family:   var(--kt-font-display);

  --kt-text-display-sm-size:     36px;
  --kt-text-display-sm-line:     44px;
  --kt-text-display-sm-tracking: -0.15px;
  --kt-text-display-sm-weight:   700;
  --kt-text-display-sm-family:   var(--kt-font-display);

  /* Headline tier — Inter Display */
  --kt-text-headline-lg-size:    32px;
  --kt-text-headline-lg-line:    40px;
  --kt-text-headline-lg-weight:  600;
  --kt-text-headline-lg-family:  var(--kt-font-display);

  --kt-text-headline-md-size:    28px;
  --kt-text-headline-md-line:    36px;
  --kt-text-headline-md-weight:  600;
  --kt-text-headline-md-family:  var(--kt-font-display);

  --kt-text-headline-sm-size:    24px;
  --kt-text-headline-sm-line:    32px;
  --kt-text-headline-sm-weight:  600;
  --kt-text-headline-sm-family:  var(--kt-font-display);

  /* Title tier — Inter (sharper UI feel) */
  --kt-text-title-lg-size:       22px;
  --kt-text-title-lg-line:       28px;
  --kt-text-title-lg-weight:     500;
  --kt-text-title-lg-family:     var(--kt-font-sans);

  --kt-text-title-md-size:       16px;
  --kt-text-title-md-line:       24px;
  --kt-text-title-md-weight:     500;
  --kt-text-title-md-family:     var(--kt-font-sans);

  --kt-text-title-sm-size:       14px;
  --kt-text-title-sm-line:       20px;
  --kt-text-title-sm-weight:     500;
  --kt-text-title-sm-family:     var(--kt-font-sans);

  /* Body tier — Inter */
  --kt-text-body-lg-size:        16px;
  --kt-text-body-lg-line:        24px;
  --kt-text-body-lg-tracking:    0.5px;
  --kt-text-body-lg-weight:      400;

  --kt-text-body-md-size:        14px;
  --kt-text-body-md-line:        20px;
  --kt-text-body-md-tracking:    0.25px;
  --kt-text-body-md-weight:      400;

  --kt-text-body-sm-size:        12px;
  --kt-text-body-sm-line:        16px;
  --kt-text-body-sm-tracking:    0.4px;
  --kt-text-body-sm-weight:      400;

  /* Label tier — Inter (button, badge) */
  --kt-text-label-lg-size:       14px;
  --kt-text-label-lg-line:       20px;
  --kt-text-label-lg-tracking:   0.1px;
  --kt-text-label-lg-weight:     500;

  --kt-text-label-md-size:       12px;
  --kt-text-label-md-line:       16px;
  --kt-text-label-md-tracking:   0.5px;
  --kt-text-label-md-weight:     500;

  --kt-text-label-sm-size:       11px;
  --kt-text-label-sm-line:       16px;
  --kt-text-label-sm-tracking:   0.5px;
  --kt-text-label-sm-weight:     500;

  /* Caption (metadata, timestamp) - FROM RESEARCH */
  --kt-text-caption-size:        12px;
  --kt-text-caption-line:        16px;
  --kt-text-caption-weight:      400;
  --kt-text-caption-tracking:    0.4px;
}
```

### 2.3 Tailwind Typography Mapping

```ts
// tailwind.config.ts
fontFamily: {
  display: 'var(--kt-font-display)',
  sans:    'var(--kt-font-sans)',
  mono:    'var(--kt-font-mono)',
},

fontSize: {
  // Display tier
  'display-lg':  ['var(--kt-text-display-lg-size)',  { lineHeight: 'var(--kt-text-display-lg-line)',  fontWeight: 'var(--kt-text-display-lg-weight)',  letterSpacing: 'var(--kt-text-display-lg-tracking)',  fontFamily: 'var(--kt-text-display-lg-family)' }],
  'display-md':  ['var(--kt-text-display-md-size)',  { lineHeight: 'var(--kt-text-display-md-line)',  fontWeight: 'var(--kt-text-display-md-weight)',  letterSpacing: 'var(--kt-text-display-md-tracking)',  fontFamily: 'var(--kt-text-display-md-family)' }],
  'display-sm':  ['var(--kt-text-display-sm-size)',  { lineHeight: 'var(--kt-text-display-sm-line)',  fontWeight: 'var(--kt-text-display-sm-weight)',  letterSpacing: 'var(--kt-text-display-sm-tracking)',  fontFamily: 'var(--kt-text-display-sm-family)' }],
  
  // Headline tier
  'headline-lg': ['var(--kt-text-headline-lg-size)', { lineHeight: 'var(--kt-text-headline-lg-line)', fontWeight: 'var(--kt-text-headline-lg-weight)', fontFamily: 'var(--kt-text-headline-lg-family)' }],
  'headline-md': ['var(--kt-text-headline-md-size)', { lineHeight: 'var(--kt-text-headline-md-line)', fontWeight: 'var(--kt-text-headline-md-weight)', fontFamily: 'var(--kt-text-headline-md-family)' }],
  'headline-sm': ['var(--kt-text-headline-sm-size)', { lineHeight: 'var(--kt-text-headline-sm-line)', fontWeight: 'var(--kt-text-headline-sm-weight)', fontFamily: 'var(--kt-text-headline-sm-family)' }],
  
  // Title tier
  'title-lg':    ['var(--kt-text-title-lg-size)',    { lineHeight: 'var(--kt-text-title-lg-line)',    fontWeight: 'var(--kt-text-title-lg-weight)',    fontFamily: 'var(--kt-text-title-lg-family)' }],
  'title-md':    ['var(--kt-text-title-md-size)',    { lineHeight: 'var(--kt-text-title-md-line)',    fontWeight: 'var(--kt-text-title-md-weight)',    fontFamily: 'var(--kt-text-title-md-family)' }],
  'title-sm':    ['var(--kt-text-title-sm-size)',    { lineHeight: 'var(--kt-text-title-sm-line)',    fontWeight: 'var(--kt-text-title-sm-weight)',    fontFamily: 'var(--kt-text-title-sm-family)' }],
  
  // Body tier
  'body-lg':     ['var(--kt-text-body-lg-size)',     { lineHeight: 'var(--kt-text-body-lg-line)',     fontWeight: 'var(--kt-text-body-lg-weight)',     letterSpacing: 'var(--kt-text-body-lg-tracking)' }],
  'body-md':     ['var(--kt-text-body-md-size)',     { lineHeight: 'var(--kt-text-body-md-line)',     fontWeight: 'var(--kt-text-body-md-weight)',     letterSpacing: 'var(--kt-text-body-md-tracking)' }],
  'body-sm':     ['var(--kt-text-body-sm-size)',     { lineHeight: 'var(--kt-text-body-sm-line)',     fontWeight: 'var(--kt-text-body-sm-weight)',     letterSpacing: 'var(--kt-text-body-sm-tracking)' }],
  
  // Label tier
  'label-lg':    ['var(--kt-text-label-lg-size)',    { lineHeight: 'var(--kt-text-label-lg-line)',    fontWeight: 'var(--kt-text-label-lg-weight)',    letterSpacing: 'var(--kt-text-label-lg-tracking)' }],
  'label-md':    ['var(--kt-text-label-md-size)',    { lineHeight: 'var(--kt-text-label-md-line)',    fontWeight: 'var(--kt-text-label-md-weight)',    letterSpacing: 'var(--kt-text-label-md-tracking)' }],
  'label-sm':    ['var(--kt-text-label-sm-size)',    { lineHeight: 'var(--kt-text-label-sm-line)',    fontWeight: 'var(--kt-text-label-sm-weight)',    letterSpacing: 'var(--kt-text-label-sm-tracking)' }],
  
  // Caption
  'caption':     ['var(--kt-text-caption-size)',     { lineHeight: 'var(--kt-text-caption-line)',     fontWeight: 'var(--kt-text-caption-weight)',     letterSpacing: 'var(--kt-text-caption-tracking)' }],
  
  // Backward compat aliases
  display:  '__alias__ display-lg',
  headline: '__alias__ headline-md',
  title:    '__alias__ title-lg',
}
```

---

## Section 3: Spacing (FROM STITCH V1)

### 3.1 Stitch Spacing Tokens

```css
/* theme.css */
:root {
  /* Stitch semantic spacing */
  --kt-space-base:      8px;   /* atomic unit */
  --kt-space-gutter:    24px;  /* between major sections */
  --kt-space-container: 1280px;/* max content width */
  --kt-margin-desktop:  32px;
  --kt-margin-mobile:   16px;
}
```

### 3.2 Tailwind Spacing Additions

```ts
// tailwind.config.ts
spacing: {
  // ... existing card, page, section ...
  
  // NEW - Stitch
  gutter:        'var(--kt-space-gutter)',
  'margin-desktop': 'var(--kt-margin-desktop)',
  'margin-mobile':  'var(--kt-margin-mobile)',
},

maxWidth: {
  // ... existing app, dashboard, reading ...
  container:     'var(--kt-space-container)',
}
```

---

## Section 4: Roundness (D2 = bump modal radius to 16px)

```ts
// tailwind.config.ts
borderRadius: {
  'kt-md': 'var(--kt-radius-md)',  // 8px - buttons, cards, inputs
  'kt-lg': 'var(--kt-radius-lg)',  // 16px - modals (BUMPED from 12px per D2)
}
```

```css
/* theme.css */
:root {
  --kt-radius-sm: 4px;
  --kt-radius-md: 8px;
  --kt-radius-lg: 16px;  /* BUMPED untuk modal (D2) */
  --kt-radius-xl: 20px;
  --kt-radius-full: 9999px;
}
```

---

## Section 5: Elevation — 5-level scale (FROM STITCH V1)

```css
/* theme.css */
:root {
  /* Brand-tinted shadows (Deep Blue at 0.08 alpha, never pure black) */
  --kt-shadow-sm: 0 1px 2px 0 rgba(0, 96, 160, 0.08);
  --kt-shadow-md: 0 4px 8px -2px rgba(0, 96, 160, 0.10), 0 2px 4px -1px rgba(0, 96, 160, 0.06);
  --kt-shadow-lg: 0 10px 15px -3px rgba(0, 96, 160, 0.10), 0 4px 6px -2px rgba(0, 96, 160, 0.05);
  --kt-shadow-xl: 0 20px 25px -5px rgba(0, 96, 160, 0.10), 0 10px 10px -5px rgba(0, 96, 160, 0.04);
}
```

### 5.1 Helper Utility Classes

```css
/* globals.css - @layer utilities */
@layer utilities {
  .elev-0 { background: var(--kt-surface); }
  .elev-1 { background: var(--kt-surface-container-lowest); box-shadow: var(--kt-shadow-sm); }
  .elev-2 { background: var(--kt-surface-container-low);    box-shadow: var(--kt-shadow-md); }
  .elev-3 {
    background: var(--kt-surface-container-high);
    box-shadow: var(--kt-shadow-md);
    border: 1px solid var(--kt-outline-variant);
  }
  .elev-4 {
    background: var(--kt-surface-container-highest);
    box-shadow: var(--kt-shadow-lg);
    backdrop-filter: blur(15px);
  }
}
```

Replaces hardcoded `bg-surface shadow-brand-md` patterns scattered across components.

---

## Section 6: Animation Tokens (FROM RESEARCH — gap di Stitch v1)

### 6.1 Animation Duration & Easing

```css
/* theme.css */
:root {
  /* Duration */
  --kt-duration-instant: 0ms;
  --kt-duration-fast:    100ms;  /* button press, hover color */
  --kt-duration-base:    200ms;  /* most transitions */
  --kt-duration-medium:  300ms;  /* modal, toast */
  --kt-duration-slow:    500ms;  /* page transition */
  
  /* Easing */
  --kt-ease-linear:    linear;
  --kt-ease-in:        cubic-bezier(0.4, 0, 1, 1);
  --kt-ease-out:       cubic-bezier(0, 0, 0.2, 1);
  --kt-ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);
  --kt-ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Reusable animation classes */
.animate-fade-in {
  animation: fade-in var(--kt-duration-base) var(--kt-ease-out);
}

.animate-fade-up {
  animation: fade-up var(--kt-duration-medium) var(--kt-ease-out);
}

.animate-scale-in {
  animation: scale-in var(--kt-duration-base) var(--kt-ease-out);
}

@keyframes fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to   { opacity: 1; transform: scale(1); }
}

/* Honor prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 6.2 Tailwind Animation Mapping

```ts
// tailwind.config.ts
transitionDuration: {
  fast:   'var(--kt-duration-fast)',
  base:   'var(--kt-duration-base)',
  medium: 'var(--kt-duration-medium)',
  slow:   'var(--kt-duration-slow)',
},
transitionTimingFunction: {
  spring: 'var(--kt-ease-spring)',
},
animation: {
  'fade-in':  'fade-in var(--kt-duration-base) var(--kt-ease-out)',
  'fade-up':  'fade-up var(--kt-duration-medium) var(--kt-ease-out)',
  'scale-in': 'scale-in var(--kt-duration-base) var(--kt-ease-out)',
}
```

### 6.3 Application Sites (per Asana/Monday/ClickUp benchmark)

| Interaction | Pattern | Duration |
|---|---|---|
| Page mount | `animate-fade-in` di top container | 200ms |
| Card hover | `transition-all hover:shadow-md duration-base` | 200ms |
| Button press | `transition-all duration-fast active:scale-[0.98]` | 100ms |
| Modal open | `animate-scale-in` | 200ms |
| Toast appear | `animate-fade-up` | 300ms |
| Status change | `transition-colors duration-medium` | 300ms |
| Drag-drop card | smooth follow + ghost | tracks cursor |
| Mention dropdown | `animate-fade-up` | 200ms |

---

## Section 7: Component Pattern Updates (Stitch v1 + research enrichment)

### 7.1 Button — add ghost/outline variant

```tsx
// Before
<button className="bg-card text-card-foreground shadow-sm">  // shadcn HSL
<button className="border border-input bg-background">         // outline current

// After (Stitch + research)
<button className="bg-primary-container text-on-primary-container">  // Primary (deep blue)
<button className="bg-secondary-container text-on-secondary-container"> // Secondary (sky)
<button className="text-on-surface-variant hover:bg-surface-container-low"> // Ghost
```

**Migration:** introduce `brand` variant alongside existing `default`. Don't break shadcn pattern. Components opt in.

### 7.2 Card — adopt elev-1 default

```tsx
// Before
<div className="bg-card text-card-foreground shadow-sm">

// After
<div className="bg-surface-container-lowest shadow-brand-sm border-l-0">
// + optional border-bottom in header for separator
```

### 7.3 Dialog — modal radius 16px (D2)

```tsx
// If --kt-radius-lg bumped to 16px, Dialog inherits automatically
// Otherwise add explicit:
<Dialog className="rounded-[16px]">
```

### 7.4 Status / Priority / Confidence Chips — Monday-inspired

```tsx
// Pattern: 10% opacity bg + bold text in same hue
<span className="
  inline-flex items-center gap-1
  px-2 py-0.5
  text-label-sm font-medium
  rounded-md
  bg-status-todo-bg text-status-todo-fg
">
  <Circle className="w-2 h-2 fill-current" />
  Todo
</span>
```

**Refinement:** verify `--kt-status-*-bg` values are 10% alpha of `--kt-status-*-fg`. Currently hex equivalents — swap to `rgb(R G B / 0.1)` for cleaner blends with surface tonal scale.

### 7.5 Empty State Component (FROM RESEARCH — gap di Stitch v1)

```tsx
interface EmptyStateProps {
  illustration: ReactNode;
  title: string;
  description: string;
  primaryAction?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; href: string };
}

<div className="
  flex flex-col items-center justify-center text-center
  max-w-md mx-auto
  py-16 px-6
">
  <div className="w-32 h-32 mb-6 text-primary-container">
    {illustration}
  </div>
  
  <h3 className="text-title-lg text-on-surface mb-2">
    {title}
  </h3>
  
  <p className="text-body-md text-on-surface-variant mb-6">
    {description}
  </p>
  
  <div className="flex flex-col sm:flex-row gap-3">
    {primaryAction && (
      <Button variant="brand" onClick={primaryAction.onClick}>
        {primaryAction.label}
      </Button>
    )}
    {secondaryAction && (
      <Link href={secondaryAction.href} className="text-body-md text-primary">
        {secondaryAction.label}
      </Link>
    )}
  </div>
</div>
```

### 7.6 Onboarding Tooltip Pattern (FROM RESEARCH — F10 enhancement)

```tsx
<Tooltip 
  content="Klik di sini untuk buat tugas baru dengan cepat"
  variant="onboarding"
  position="bottom"
  spotlight
  showArrow
  dismissable
  step="1 / 5"
>
  <Button>Buat Tugas</Button>
</Tooltip>
```

---

## Section 8: Microcopy Library (FROM RESEARCH — gap kritikal)

Sprint 6 retro mention "microcopy still plain". Berikut **paste-able microcopy library** Bahasa Indonesia BRAND voice santai-profesional:

### 8.1 Empty States

| Konteks | Tone-deaf (avoid) | BRAND voice (adopt) |
|---|---|---|
| No tasks | "Tidak ada tugas" | "Belum ada tugas di sini. Yuk, buat tugas pertamamu!" |
| No projects | "Tidak ada project" | "Saatnya mulai project baru. Klik 'Buat Project' untuk memulai." |
| No notifications | "Kosong" | "Semua sudah terbaca. Notifikasi baru akan muncul di sini." |
| Search no result | "Tidak ditemukan" | "Hasil pencarian kosong. Coba kata kunci lain atau periksa filter." |
| No team members | "Belum ada anggota" | "Tim masih kosong. Undang rekan kerja untuk mulai kolaborasi." |
| No comments | "Belum ada komentar" | "Jadilah yang pertama berkomentar. Tag rekan dengan @nama." |
| No imports | "Belum ada import" | "Belum ada notulensi yang di-import. Upload file MoM untuk mulai." |
| No activity | "Belum ada aktivitas" | "Aktivitas tim akan muncul di sini begitu kerjaan jalan." |

### 8.2 Error States

| Konteks | Tone-deaf | BRAND voice |
|---|---|---|
| Network failure | "Error" | "Koneksi terputus. Cek internet kamu lalu coba lagi." |
| Save failed | "Gagal simpan" | "Tugas gagal disimpan — koneksi terputus, coba lagi sebentar." |
| 404 | "Halaman tidak ditemukan" | "Halaman yang kamu cari nggak ada. Mungkin sudah dihapus atau pindah." |
| 403 | "Akses ditolak" | "Kamu nggak punya akses ke halaman ini. Hubungi admin kalau butuh." |
| 500 | "Internal error" | "Ada yang gak beres di server. Tim kami sudah dapat notifikasi, coba lagi nanti." |
| Validation | "Field invalid" | "Email belum sesuai format. Contoh: nama@kalaborasi.com" |
| Upload too big | "File terlalu besar" | "File maksimal 5MB. Coba kompres dulu atau pilih file lebih kecil." |

### 8.3 Button Labels (action-oriented)

| Generic | BRAND voice |
|---|---|
| "Submit" | "Simpan" |
| "Cancel" | "Batal" |
| "OK" | "Mengerti" or "Lanjut" |
| "Confirm" | "Ya, lanjutkan" |
| "Delete" | "Hapus" |
| "Save" | "Simpan perubahan" |
| "Create" | "Buat baru" or specific: "Buat tugas" / "Buat project" |
| "Edit" | "Ubah" |
| "Add" | "Tambah" |
| "Close" | "Tutup" |
| "Skip" | "Lewati dulu" |
| "Done" | "Selesai" |
| "Back" | "Kembali" |
| "Next" | "Lanjut" |

### 8.4 Toast Messages

| Aksi | Success | Error |
|---|---|---|
| Save | "Tugas tersimpan" | "Gagal simpan. Coba lagi." |
| Delete | "Tugas dihapus" | "Gagal hapus. Coba lagi." |
| Status change | "Status diperbarui" | "Gagal update status." |
| Comment | "Komentar terkirim" | "Komentar gagal terkirim." |
| Upload | "File berhasil di-upload" | "Upload gagal. Coba upload ulang." |
| Invite | "Undangan terkirim ke {email}" | "Undangan gagal kirim. Cek email tujuan." |

### 8.5 Helper Text & Placeholders

| Field | Placeholder | Helper text |
|---|---|---|
| Email | "nama@kalaborasi.com" | "Email perusahaan kamu" |
| Task title | "Apa yang harus dikerjakan?" | "Singkat dan jelas, max 200 karakter" |
| Description | "Tambahkan detail tugas..." | "Markdown didukung" |
| Deadline | "Pilih tanggal..." | "Bisa dikosongkan kalau belum ada deadline" |
| Search | "Cari tugas, project, atau orang..." | — |
| Mention | "Tag rekan dengan @nama" | — |

---

## Section 9: Migration Sequencing

**Phase A — Foundation (1-2h):** Add new theme.css tokens + tailwind config additions. NO removals. v2.1 + Stitch coexist.

**Phase B — Verify build (30 min):** `npm run build`, visual smoke check. Build must pass with both naming schemes alive.

**Phase C — Primitive refactor (1-2h):** Update Button, Card, Dialog, Input, status badges to consume new tokens (introduce `brand` variant for Button, surface-container-lowest default for Card, etc).

**Phase D — Page refactor (3-5h):** Replace `text-2xl` → `text-headline-md`, raw `bg-zinc-*` → `bg-surface-container-*` (Stitch granularity), consolidate elevation patterns to `.elev-N` utility.

**Phase E — Microcopy refresh (2-3h):** Apply Section 8 microcopy library. Update i18n `id.json` keys per category. Refactor empty states + error states + button labels per route.

**Phase F — Animation polish (1-2h):** Apply Section 6 animation tokens to micro-interactions per Section 6.3 mapping.

**Phase G — Empty state component (30 min - 1h):** Create reusable EmptyState component per Section 7.5. Apply to all routes with no-data states.

**Phase H — Verify Lighthouse + bundle (30 min):** No perf regression > 5pts, bundle delta ≤ 5KB (extra font + CSS variables).

**Phase I — Visual evidence + screenshots (30 min):** Re-capture 6 routes side-by-side: pre-Stitch vs post-Stitch tokens.

**Total: 9-13 hours** for complete adoption.

---

## Section 10: Files this would touch

- `apps/web/src/styles/theme.css` (~80 lines tokens)
- `apps/web/tailwind.config.ts` (~50 lines mappings)
- `apps/web/src/styles/globals.css` (~30 lines elev utilities + Inter Display @import)
- `apps/web/src/components/ui/button.tsx` (+ brand variant)
- `apps/web/src/components/ui/card.tsx` (default bg-surface-container-lowest)
- `apps/web/src/components/ui/dialog.tsx` (radius 16px)
- `apps/web/src/components/ui/empty-state.tsx` (NEW component)
- `apps/web/src/locales/id.json` (microcopy refresh — Section 8)
- 13 route pages → grep + replace for new typography aliases (mostly mechanical)

**Estimated diff:** ~600-900 LOC additions, ~250 mechanical replacements. **Bundle delta:** ~3-5 KB gzipped (extra font CSS vars + Inter Display @import).

---

## Section 11: Cross-reference

- **Index of generated screens:** `docs/stitch-full-recommendations/INDEX.md` (v1 chosen)
- **Current code state:** `apps/web/src/styles/theme.css` v2.1, `apps/web/tailwind.config.ts`
- **Brand spec:** `docs/BRAND.md` v2.1
- **Visual audit precedent:** `docs/sprint-6-revision-visual-audit.md`
- **Owner decisions resolved:** D1=Y, D2=Y, D3=Y, D4=Y, D5=KEEP

---

## Section 12: What this proposal is NOT

- Not a code change (this is spec only)
- Not a literal copy of Stitch HTML — patterns extracted, brand voice preserved
- Not breaking change — additive on top of existing v2.1 tokens
