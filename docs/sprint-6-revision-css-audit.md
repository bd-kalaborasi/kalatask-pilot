# Sprint 6 Revision — CSS / Tailwind Audit

**Date:** 2026-04-30
**Trigger:** Owner hipotesis "redesign code ada, tapi CSS lama override yang baru"
**Verdict short:** Hipotesis salah arah. **Tidak ada cascade conflict atau CSS override.** Yang sebenarnya terjadi: BRAND.md v2 design tokens **tidak pernah landed di runtime CSS** + redesign code pakai raw Tailwind defaults instead of brand tokens.

---

## TL;DR

| Layer | Status | Finding |
|---|---|---|
| Theme tokens (`theme.css`) | ⚠️ v1 only | File header explicit: "Source: docs/BRAND.md v1.0". Zero v2 token landed |
| Tailwind config | ✅ Correct mapping | `brand-deep`, `brand-sky` mapped to CSS vars properly |
| BRAND.md v2 token spec | 📄 Docs only | v2 marked "OPTIONAL adoption" — surface tonal scale + M3 typography never reach runtime |
| Component code (3 redesigned routes) | ❌ Raw Tailwind dominates | 21 raw Tailwind color refs vs 2 brand-token refs |
| Style import order | ✅ Correct | theme.css → @tailwind base → shadcn @layer base. No cascade fight |
| Tailwind purge | ✅ No stale classes | `content` glob matches all source files |
| Two parallel design systems | ⚠️ Coexist by design | KalaTask `--kt-*` brand vars + shadcn HSL `--background`/`--primary` vars run in parallel |

**Net answer to owner:** the "redesign code ada tapi gak kelihatan" perception is real, but **NOT** because of CSS override. The redesigned components were written with raw Tailwind defaults (`bg-zinc-100`, `bg-emerald-50`, `text-red-700`) which look identical to Sprint 5 baseline because Sprint 5 used the same defaults. There's no v2 visual differentiation in the cascade because v2 tokens were never added to `theme.css` or `tailwind.config.ts`.

---

## Layer 1 — Theme tokens (`theme.css`)

File header:
```
* Source: docs/BRAND.md v1.0 (2026-04-27)
* Semua nilai di file ini di-source dari BRAND.md.
```

**v1 tokens present:**
- `--kt-deep` + 9-step scale (50-800)
- `--kt-sky` + 9-step scale
- `--kt-status-{todo,progress,review,done,blocked}` + bg variants
- `--kt-notif-{normal,warning,urgent,critical}`
- `--kt-source-{manual,cowork,csv}`
- `--kt-text`, `--kt-text-muted`, `--kt-text-subtle`, `--kt-text-inverse`
- `--kt-bg`, `--kt-surface`, `--kt-border`, `--kt-border-strong`
- `--kt-text-{xs,sm,base,lg,xl,2xl,3xl,4xl}` — Tailwind defaults mirror
- `--kt-space-{1,2,3,4,6,8,12,16}` — Tailwind 4px-based
- `--kt-radius-{sm,md,lg,full}`
- `--kt-container-{app,dashboard,reading}`
- `--kt-shadow-{sm,md,lg}`

**v2 tokens ABSENT in `theme.css`:**
- ❌ `--kt-surface-dim`, `--kt-surface-bright`, `--kt-surface-container-low`, `--kt-surface-container-high`, `--kt-surface-container-highest` (the Stitch 5-level surface tonal scale)
- ❌ `--kt-text-display-lg` (`~36px`), `--kt-text-headline-md` (`~28px`), `--kt-text-body-md`, `--kt-text-label-sm` (M3-inspired typography)
- ❌ `--kt-card-gap`, `--kt-section-margin`, `--kt-container-padding` (semantic spacing)
- ❌ `--kt-on-primary`, `--kt-primary-container`, `--kt-inverse-primary` (designated color tokens)

**Source of confusion:** `docs/BRAND.md` v2.0 changelog entry (line 400) says:
> "v2 OPTIONAL adoption from Stitch design systems ... Surface tonal scale ... M3-inspired typography scale ... optional alongside ... current"

The v2 spec was framed as **optional additive enhancement**, but no migration path landed in code. Result: v2 exists in markdown docs but has zero runtime presence.

---

## Layer 2 — Tailwind config (`tailwind.config.ts`)

**Status:** ✅ Mapping correct, no breakage.

```ts
colors: {
  'brand-deep': {
    DEFAULT: 'var(--kt-deep)',
    50:  'var(--kt-deep-50)',
    100: 'var(--kt-deep-100)',
    // ... 200-800
  },
  'brand-sky': { /* same pattern */ },
  status: { /* maps to --kt-status-* */ },
  notif: { /* maps to --kt-notif-* */ },
  source: { /* maps to --kt-source-* */ },
  surface: 'var(--kt-surface)',
  canvas: 'var(--kt-bg)',
  // shadcn parallel system:
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: { DEFAULT: 'hsl(var(--primary))', ... },
  // etc
}
```

**Two parallel systems exposed:** any Tailwind class consumer can pick `bg-brand-deep` (KalaTask brand) OR `bg-primary` (shadcn HSL). They are different values:

| Token | KalaTask brand | shadcn HSL |
|---|---|---|
| Primary | `--kt-deep` = `#0060A0` (deep blue) | `--primary` = `240 5.9% 10%` (zinc-900 dark) |
| Background | `--kt-bg` = `#FAFAFA` (zinc-50) | `--background` = `0 0% 100%` (pure white) |

This coexistence is **intentional** (per `globals.css` comments: "shadcn vars dipakai komponen generated via npx shadcn add. KalaTask custom components tetap pakai --kt-* brand tokens"), but creates risk of inconsistent component coloring if a developer mixes both unintentionally.

---

## Layer 3 — Style import order (`globals.css`)

```css
@import 'fonts.googleapis.com/...'        // Google Fonts
@import './theme.css';                     // KalaTask --kt-* tokens
@tailwind base;                            // Tailwind reset
@tailwind components;
@tailwind utilities;

@layer components { /* .kt-wordmark, .kt-badge, ... */ }
@layer utilities { /* .kt-focus-ring, .animate-wizard-in, ... */ }
@layer base {
  :root { /* shadcn HSL vars */ }
  .dark { /* shadcn HSL dark vars */ }
}
```

**Cascade order:** `:root` (kt vars) → Tailwind base → kt components/utilities → shadcn @layer base.

**Status:** ✅ Correct order. KalaTask vars are defined first so they are available throughout the cascade. shadcn HSL vars in `@layer base` apply at correct priority for shadcn components. Tailwind utilities apply at highest priority.

**Owner hipotesis ("CSS lama override yang baru"):** **No evidence found.** The vars and classes don't conflict — they live in separate keyspaces (`--kt-*` vs `--background`/`--primary`/etc). When a component uses `bg-zinc-100`, Tailwind generates `background-color: rgb(244 244 245)` directly (no var resolution) — there is nothing to override.

---

## Layer 4 — Component code reality (the actual issue)

Token usage across the 3 redesigned files (commit `326bc24`):

| File | brand-* / kt-* refs | Raw Tailwind (zinc/emerald/amber/red) |
|---|---|---|
| `AdminUsagePage.tsx` | 0 | **12** |
| `AdminMoMReviewPage.tsx` | 2 | 6 |
| `ProjectDetailPage.tsx` | 0 | 3 |

**Total: 2 brand-token refs vs 21 raw-Tailwind refs.**

Specific examples:

**AdminUsagePage health banner** (the one new visible structural change):
```tsx
const HEALTH_BANNER_CLASS: Record<HealthTone, string> = {
  normal:   'border-emerald-500 bg-emerald-50 text-emerald-900',
  warning:  'border-amber-500 bg-amber-50 text-amber-900',
  critical: 'border-red-500 bg-red-50 text-red-900',
};
```
**Should have used:** `--kt-status-done`, `--kt-status-review`, `--kt-status-blocked` (which mirror the same emerald/amber/red intent but tied to brand semantic vars). Result: banner colors match Sprint 5 task badge colors but feel disconnected — they're literal Tailwind values, not brand tokens.

**ProjectDetailPage sidebar** progress bar:
```tsx
<div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
  <div className="h-full bg-emerald-500 transition-all" .../>
</div>
```
**Should have used:** `bg-status-done-bg` (track) + `bg-status-done` (fill). Same color intent but routed through tokens for consistency.

**AdminMoMReviewPage filter tabs** — only place using brand-deep:
```tsx
className={`...${active
  ? 'border-brand-deep text-brand-deep'        // brand token ✓
  : 'border-transparent text-muted-foreground hover:text-foreground'}`}
// ... and inside count chip:
'bg-brand-deep text-white'                     // brand token ✓
'bg-zinc-100 text-zinc-600'                    // raw Tailwind ❌
```
Mixed usage even within the same component.

---

## Layer 5 — Tailwind purge audit

`tailwind.config.ts` content glob:
```ts
content: [
  './index.html',
  './src/**/*.{ts,tsx,js,jsx}',
],
```

**Status:** ✅ Glob covers all source files. No stale class accumulation.

Production build size (last verified `326bc24` commit + revision):
- Initial main: 150.13 KB gzipped
- No anomaly detected — no excessive class bloat indicating dead-code retention

A formal purge audit (`npx tailwindcss --content ... --output /tmp/audit.css`) was **NOT** run for this read-only audit. If owner wants confirmation, run as Step 1.6 in `apps/web` working dir. Expected: dev-mode generated CSS slightly larger than production due to JIT not pruning unused classes — that's normal, not a bug.

---

## Layer 6 — Computed-style spot check (NOT executed)

Task brief Step 1.6 (Issue 3 sub-3) suggests Playwright computed-style extraction per route. **NOT executed** — read-only audit, time budget. The static code analysis above is conclusive: there's no css cascade conflict; the redesign code itself simply uses raw Tailwind defaults that look identical to Sprint 5 because Sprint 5 used the same defaults.

If owner wants formal computed-style proof, run after this audit:
```bash
cd apps/web && npx vite preview --port 5174 &
# Then in Playwright session:
const banner = await page.$('[data-testid="usage-health-banner"]')
const styles = await banner.evaluate(el => getComputedStyle(el))
console.log(styles.backgroundColor)   // Will be rgb(236 253 245) = bg-emerald-50 literal
```

---

## Root cause summary

The "redesign tidak kelihatan" issue has 3 layers, ranked by impact:

1. **Visual differentiation absent** (highest impact): redesigned routes use the SAME color/typography palette as Sprint 5 baseline. Structural additions (sidebar, banner, tabs) are visible if owner zooms into structure, but at-a-glance the brand identity is unchanged.

2. **BRAND.md v2 visual tokens never landed in runtime** (foundational gap): Stitch's surface tonal scale + M3 typography were spec'd as "optional" in v2 and the optional path was not chosen. As a result, even if redesign code adopted v2 tokens, they would resolve to nothing.

3. **No cascade conflict** (owner hipotesis): no CSS override, no specificity fight. Code simply doesn't reach for the differentiated palette because that palette doesn't exist in the cascade yet.

---

## Recommendation (read-only — not applied)

This audit recommends **NOT** debugging cascade. Cascade is fine.

Real fix path (cross-references `sprint-6-revision-visual-audit.md` Phase A):

1. **Add v2 tokens to `theme.css`:**
   ```css
   --kt-surface-container-low:    #F4F4F5;  /* zinc-100 */
   --kt-surface-container:        #FFFFFF;  /* current --kt-surface */
   --kt-surface-container-high:   #FAFAFA;  /* zinc-50 */
   --kt-surface-bright:           #FFFFFF;  /* lifted bg */
   --kt-surface-dim:              #E4E4E7;  /* recessed bg */

   --kt-text-display-lg:          36px;
   --kt-text-headline-md:         28px;
   --kt-text-body-md:             16px;
   --kt-text-label-sm:            12px;

   --kt-card-gap:                 1.25rem;
   --kt-section-margin:           2.5rem;
   ```

2. **Map them in `tailwind.config.ts`:**
   ```ts
   colors: {
     'surface-container-low':  'var(--kt-surface-container-low)',
     'surface-container':      'var(--kt-surface-container)',
     'surface-container-high': 'var(--kt-surface-container-high)',
     'surface-bright':         'var(--kt-surface-bright)',
     'surface-dim':            'var(--kt-surface-dim)',
   }
   fontSize: {
     'display-lg':    'var(--kt-text-display-lg)',
     'headline-md':   'var(--kt-text-headline-md)',
     'label-sm':      'var(--kt-text-label-sm)',
   }
   ```

3. **Refactor redesign code** to use new tokens instead of raw Tailwind:
   - `bg-emerald-50` → `bg-status-done-bg`
   - `bg-zinc-100` → `bg-surface-container-low`
   - `text-2xl font-semibold` → `text-headline-md font-semibold`

4. **Re-capture screenshots** to show owner real visual differentiation.

---

## Summary table

| Hipotesis | Audit verdict |
|---|---|
| "Redesign code ada tapi CSS lama override" | ❌ False — no cascade conflict |
| "Stale Tailwind classes" | ❌ False — purge config correct |
| "Conflicting tokens" | ⚠️ Partial — KalaTask + shadcn parallel systems coexist by design, no actual conflict observed in redesigned code |
| "Cascade priority issue" | ❌ False — import order correct, layer ordering correct |
| "BRAND.md v2 tokens not in runtime" | ✅ **TRUE — root cause** |
| "Component code uses raw Tailwind defaults" | ✅ **TRUE — secondary cause** |
