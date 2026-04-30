# Stitch v2 Pre-Generation Critique

**Date:** 2026-04-30
**Mode:** Read-only critique. Output is injection material for v2 generation prompts. No code changes.
**Skills invoked:** `impeccable` (PRODUCT register, command=critique) + `emil-design-eng` (motion philosophy)

---

## Skill invocations log

### Impeccable — PRODUCT-mode critique

- **Invoked:** Skill tool with skill=impeccable, args=audit/critique/redesign keywords
- **Preflight gates passed:** context (load-context.mjs ran, returned hasProduct=true / hasDesign=true / contextDir=`C:\Users\bdkal\Projects\kalatask-pilot`), product (PRODUCT.md valid >200 chars, no [TODO]), command_reference (loaded `reference/critique.md` + `reference/product.md`), shape (not_required for critique), image_gate (skipped: critique-not-craft), mutation (open / read-only)
- **Pre-flight token:** `IMPECCABLE_PREFLIGHT: context=pass product=pass command_reference=pass shape=not_required image_gate=skipped:critique-not-craft mutation=open`
- **Output:** Design Health Score 22/40 (below productivity-grade bar). Multiple absolute-ban triggers identified.

### Emil-design-eng — animation philosophy

- **Invoked:** Skill tool with skill=emil-design-eng, args=animation principles for 8 micro-interactions
- **Output:** Animation Decision Framework applied. Per-interaction trap-vs-recipe table. CSS variable set extending DESIGN.md §6.
- **Verification keywords confirmed in output:** "register", "trap", "asymmetric timing", "Sonner principles", "ease-out cubic-bezier(0.23, 1, 0.32, 1)", "transform-origin", "interruptibility", "prefers-reduced-motion", "frequency-aware".

---

## Impeccable: Design Health Score (v1)

| # | Heuristic | Score (0-4) | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Status pills + progress + relative timestamps strong; loading states underspecified |
| 2 | Match System / Real World | 3 | Indonesian voice solid; ☕🥇 emoji off-register for productivity tool |
| 3 | User Control and Freedom | 2 | Onboarding wizard modal-only; no inline tour; no keyboard command palette |
| 4 | Consistency and Standards | 2 | Hero-metric template applied 7/13 routes — over-consistent without earning it |
| 5 | Error Prevention | 2 | "Approve HIGH only" good; destructive Hapus/Tolak lack confirm scaffolding noted |
| 6 | Recognition Rather Than Recall | 3 | Kanban + sidebar + tabs all familiar |
| 7 | Flexibility and Efficiency | 2 | Bulk action only on /settings; /tasks /projects no power-user shortcuts |
| 8 | **Aesthetic and Minimalist Design** | **1** | **Multiple absolute-ban triggers (border-l accents, hero-metric, display fonts in UI, identical card grids)** |
| 9 | Error Recovery | 2 | Empty states good; error states unspecified across 13 routes |
| 10 | Help and Documentation | 2 | MoM cross-ref card good; rest of routes lack contextual help |
| **Total** | | **22/40** | **Below productivity-grade bar** |

---

## Anti-Patterns Verdict (v1)

| Ban | v1 violations |
|---|---|
| Side-stripe colored borders (`border-left` > 1px) | `/admin/usage` health banner "border-l-4 with tone"; `/projects/:id` Kanban "Tertahan column has red border-l-3 visual urgency" |
| Hero-metric template (big-number stat cards row) | `/dashboard` 3-card; `/admin/mom-import` 2-card; `/admin/mom-import/:id` 5-card sticky; `/admin/usage` 3-card; `/workload` 4-card; `/bottleneck` 3-card; `/productivity` 4-tile KPI. **7 of 13 routes.** |
| Identical card grids | `/projects` 3-column rich-card grid; `/productivity` 3-card insights row |
| Modal as first thought | `/onboarding` modal-only wizard, no inline tour considered |
| Display fonts in UI labels/data (PRODUCT-register ban) | `/dashboard` greeting `display-lg` 57px Inter Display; `/onboarding` title; `/productivity` KPI numbers |
| Two-family typography | Inter Display + Inter — brand-register thinking on product surface |
| Tertiary auto-generated color (unearned) | Stitch variant FIDELITY produced `#6F3600` warm orange not in BRAND.md |
| Asana/Monday/ClickUp framing | Second-order category-reflex trap → derivative composition |

---

## Priority Issues (P0–P2)

### [P0] Hero-metric template repetition across 7 routes
- **Why it matters:** AI-generated origin signal; Linear/Notion don't lay out dashboards this way; consumes vertical space without earning it
- **v2 fix:** replace stat-card rows with **inline pill row** in section header (`12 menunggu review · 48 tergenerate bulan ini · 2 perlu PIC`). Reserve large numerals for ONE anchor metric per page when decision-weight justifies it.

### [P0] Side-stripe border accents (absolute ban triggered)
- **Why it matters:** textbook AI tell, immediate slop signal
- **v2 fix:** `/admin/usage` health banner → full 1px outline-variant border + leading icon (✅⚠️🚨) + tone-tinted bg, no side stripe. `/projects/:id` "Tertahan" column → bold-red column header + red count chip, no stripe.

### [P1] Display fonts on PRODUCT surfaces
- **Why it matters:** dashboard greeting at 57px Inter Display reads as marketing site, not workplace tool. PRODUCT register reference: "Display fonts in UI labels, buttons, data" is banned.
- **v2 fix:** drop Inter Display entirely. Single Inter family carries everything. Page titles top out at 22-24px / 600. Greeting becomes 16-18px / 500 ambient context. KPI big numbers 32-36px max.

### [P1] Density mismatch with PRODUCT.md decision principle #1
- **Why it matters:** PRODUCT.md says "Density > whitespace — internal tool, productivity-grade, not consumer-grade". v1 chose medium-spacious — directly contradicts.
- **v2 fix:** density **dense**. Tables 40-44px row height. Card padding 12-16px. margin-desktop 32→24, section-gap 24→16. Spacious only for /onboarding moment.

### [P2] Identical 3-column project card grid
- **v2 fix:** dense table primary view (Linear pattern); card grid as opt-in toggle.

### [P2] Tertiary orange unearned
- **v2 fix:** Stitch generation switches `colorVariant: FIDELITY` → `colorVariant: NEUTRAL`. Keeps brand seed saturated, neutralizes tertiaries.

---

## Persona Red Flags

**Member (continuous user, lowest friction tolerance):**
- 57px greeting on every dashboard load wears them out
- Hero-metric cards force scroll past stats they didn't ask for
- 3-column project grid forces visual scan when assigned-to-me list = 1-click
- No keyboard shortcut surface visible

**Manager (high-frequency, low friction tolerance):**
- /workload donut chart harder to read than horizontal stacked bar
- 4-card stat row + 4-tile KPI = 8 metric impressions across 2 most-used screens. Banner blindness.
- Bulk action sticky bottom only on /settings; /tasks and /projects don't surface bulk select

**Admin (periodic, control-density expected):**
- /admin/mom-import/:id 4 layered nav surfaces above the actual decision

---

## Emil: Motion Register Decisions

### Per-interaction recipe (8 interactions)

| Interaction | Frequency | Default | Recipe |
|---|---|---|---|
| Status badge change | 30-100×/day | Drastically reduce | Optimistic instant. Dropdown reveal 150ms ease-out. NO celebration. |
| Drag-drop kanban | 5-30×/day | Standard, no overshoot | Pickup scale 100ms; drag 1:1; drop 150ms ease-out, NO bounce |
| Modal open/close | 1-5×/day | Standard | scale(0.96→1)+opacity, 200ms in / 150ms out, transform-origin center |
| Tab switch | 20-50×/day | Drastically reduce | Animate indicator pill ONLY (200ms). View swap INSTANT. |
| Toast | many×/day | Standard (Sonner) | translateY+opacity, 400ms in / 200ms out, CSS transitions not keyframes |
| Inline edit | 5-20×/day | Drastically reduce | INSTANT text↔input swap. No crossfade. |
| Skeleton → content | many×/day | Subtle | 2s calm pulse; 200ms opacity-only fade with 50ms overlap |
| Validation error | rare | Standard | kt-shake 4px×2 250ms + inline error fade-in 150ms |

### Cross-cutting motion principles

1. **Default = no animation.** Animate only for state / feedback / reveal / spatial continuity.
2. **Asymmetric timing.** Open slower than close.
3. **CSS transitions** over keyframes (interruptible).
4. **Custom easing:** `cubic-bezier(0.23, 1, 0.32, 1)` ease-out, `cubic-bezier(0.32, 0.72, 0, 1)` drawer. Never `ease-in`.
5. **Transform + opacity only.** Never animate layout properties.
6. **Origin-aware popovers**, modals exempt (keep center).
7. **`prefers-reduced-motion`:** keep opacity, strip transforms.
8. **Buttons:** `:active scale(0.97) 100ms ease-out`.
9. **No keyboard-initiated animation** (Cmd-K, slash search, arrow nav).
10. **Skeleton matches content dims** — no layout shift on swap.

---

## v2 Generation Injection Block (merged Impeccable + Emil)

This block is appended to every Stitch v2 prompt:

```
PRODUCT-MODE CONSTRAINTS (Impeccable register):
- Single font: Inter only. NO Inter Display. NO display-lg for any product surface.
- Page titles: 22-24px / weight 600. Greetings ambient: 16-18px / weight 500.
- Density: dense. Table rows 40-44px, card padding 12-16px, section-gap 16-20px.
- NO side-stripe colored borders. Use full 1px borders + leading icon, or tinted bg, or numbered badge.
- NO hero-metric stat-card rows. Replace with inline pill row in section header.
- NO identical card grids unless data is genuinely uniform. Prefer dense list rows for primary lists.
- NO modal-as-first-thought. Inline coachmarks; modals only for confirmation moments.
- NO emoji decoration in productivity surfaces. Status icons OK if semantic.
- Color discipline: Restrained (one accent ≤10% of surface). NO tertiary auto-generated colors.
- Visible primary action without scroll. Familiar standard patterns; surprise reserved for moments not pages.
- Two-color brand palette enforced: deep blue #0060A0 + sky #00A0E0. No third hue.

MOTION CONSTRAINTS (Emil-aligned):
- Default: NO animation. Animate only when motion conveys state / feedback / reveal / spatial continuity.
- Custom easing only: ease-out cubic-bezier(0.23, 1, 0.32, 1); drawer cubic-bezier(0.32, 0.72, 0, 1). Never ease-in.
- Asymmetric timing: enter slower than exit. Open 200-400ms, close 150-200ms.
- Hardware-accelerated only: transform + opacity + filter. Never animate layout properties.
- Buttons: :active scale(0.97) 100ms ease-out.
- Status changes: optimistic + INSTANT data swap. NO color crossfade. NO scale celebration.
- Tab switch: animate ONLY indicator pill (200ms). Body swap INSTANT.
- Inline edit: INSTANT swap. NO morph crossfade.
- Modals: scale(0.96→1) + opacity, transform-origin center, 200ms in / 150ms out.
- Toasts: translateY(100%→0) + opacity, 400ms in / 200ms out, CSS transitions not keyframes.
- Kanban drag: 1:1 pointer follow. Drop 150ms ease-out, NO overshoot.
- Skeleton: 2s ease-in-out calm pulse, match content dims exactly, 50ms overlap fade on swap.
- prefers-reduced-motion: keep opacity, strip transforms.
- NO bounce. NO spring overshoot. NO stagger > 50ms. NO orchestrated entrances.

STITCH PROJECT CONFIG:
- colorVariant: NEUTRAL (not FIDELITY) — neutralize tertiaries.
- bodyFont: INTER, headlineFont: INTER (single family).
- roundness: ROUND_EIGHT.
- customColor: #0060A0.
- overrideSecondaryColor: #00A0E0.
```

---

## Cross-reference

- v1 INDEX: `docs/stitch-full-recommendations/INDEX.md`
- v1 design system proposal: `docs/stitch-design-system-proposal.md`
- v2 deliverables in: `docs/stitch-v2-recommendations/INDEX.md` + `docs/stitch-v2-design-system-proposal.md`
- v2 Stitch project: `3438363398905262377` ("KalaTask v2 (with skills)")
