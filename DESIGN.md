# DESIGN.md — KalaTask Visual System

> Visual token registry. Pair with `PRODUCT.md` (strategy), `BRAND.md` v2.1 (voice).
> **Status:** v2.1 — Sprint 6 Holistic Overhaul tokens land in code.
> **Implementation:** `apps/web/src/styles/theme.css` + `apps/web/tailwind.config.ts`

---

## 1. Color system

### 1.1 Brand colors (BRAND.md §2.1, retained from v1)

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| `--kt-deep` (deep blue) | `#0060A0` | `bg-brand-deep`, `text-brand-deep` | Primary action, headings, "Kala" wordmark |
| `--kt-sky` (sky blue) | `#00A0E0` | `bg-brand-sky`, `text-brand-sky` | Accent, links, "Task" wordmark, in_progress state |

9-step scales `*-50` … `*-800` available for both. Hover/pressed states use `*-700`. Subtle backgrounds use `*-100`.

### 1.2 Surface tonal scale (NEW v2)

5-level depth scale inspired by Material 3 surface containers. Use to express elevation without heavy shadows.

| Token | Hex (light) | Tailwind | Use case |
|---|---|---|---|
| `--kt-surface-bright` | `#FFFFFF` | `bg-surface-bright` | Lifted modal, dialog, popover |
| `--kt-surface` | `#FFFFFF` | `bg-surface` | Default card, panel |
| `--kt-surface-container` | `#FAFAFA` | `bg-surface-container` | Subtle container variant |
| `--kt-surface-container-low` | `#F4F4F5` | `bg-surface-container-low` | Recessed track (progress bar bg, tab strip) |
| `--kt-surface-container-high` | `#E4E4E7` | `bg-surface-container-high` | Card hover, divider zones |
| `--kt-surface-dim` | `#D4D4D8` | `bg-surface-dim` | Disabled, placeholder zones |

Dark mode overrides scale these to zinc-800/700/600/500/400.

### 1.3 Status colors (BRAND.md §2.3, retained)

| Status | Hex | Tailwind |
|---|---|---|
| `todo` | `#A1A1AA` | `bg-status-todo` / `bg-status-todo-bg` |
| `in_progress` | `#00A0E0` (brand sky) | `bg-status-progress` / `bg-status-progress-bg` |
| `review` | `#F59E0B` | `bg-status-review` / `bg-status-review-bg` |
| `done` | `#16A34A` | `bg-status-done` / `bg-status-done-bg` |
| `blocked` | `#EF4444` | `bg-status-blocked` / `bg-status-blocked-bg` |

### 1.4 Semantic feedback colors (NEW v2)

For health banners, alerts, system messaging. Aligned with status palette but separated for semantic clarity.

| Token | Tailwind | Usage |
|---|---|---|
| `--kt-success` | `bg-feedback-success`, `text-feedback-success` | Health green, success toast, completed |
| `--kt-warning` | `bg-feedback-warning`, `text-feedback-warning` | Health amber, warning, attention |
| `--kt-danger` | `bg-feedback-danger`, `text-feedback-danger` | Health red, error, destructive |
| `--kt-info` | `bg-feedback-info`, `text-feedback-info` | Neutral hint, blue info |

Each has matching `-bg` (subtle background tint) and `-border` (border-l-4 hint).

---

## 2. Typography (M3-inspired, NEW v2)

Five-tier scale + role classes. Inter for sans, JetBrains Mono for technical text.

| Tier | Token | Size / line-height / weight | Tailwind utility | Use case |
|---|---|---|---|---|
| **Display** | `--kt-text-display` | 36px / 44px / 700 | `text-display` | Hero numbers, marketing headers (rare in product) |
| **Headline** | `--kt-text-headline` | 28px / 36px / 600 | `text-headline` | Page titles (`<h1>`) |
| **Title** | `--kt-text-title` | 20px / 28px / 600 | `text-title` | Section heads (`<h2>`, card titles) |
| **Body** | `--kt-text-body` | 14px / 22px / 400 | `text-body` | Default paragraph |
| **Label** | `--kt-text-label` | 12px / 16px / 500 | `text-label` | Caption, metadata, chip text |

`text-mono` keeps JetBrains Mono for IDs/timestamps.

Compatibility: existing Tailwind `text-2xl`, `text-sm`, etc remain supported during migration. New code uses semantic tier names.

---

## 3. Spacing (NEW v2 semantic layer)

Tailwind's 4px scale remains for fine-grain. New semantic tokens for layout-level decisions.

| Token | Value | Tailwind | Use case |
|---|---|---|---|
| `--kt-gap-card` | 12px | `gap-card`, `space-y-card` | Inner card content gap |
| `--kt-gap-section` | 24px | `gap-section`, `space-y-section` | Between sections within a page |
| `--kt-gap-page` | 40px | `gap-page`, `space-y-page` | Major page-level rhythm |
| `--kt-pad-card` | 16px | `p-card` | Card body padding |
| `--kt-pad-page` | 24px | `p-page` | Page main padding |

---

## 4. Elevation (NEW v2)

Depth without heavy drop shadows — uses tonal layering + minimal shadow.

| Tier | Tailwind | Use case |
|---|---|---|
| `elev-0` (flat) | `bg-surface` only | Page background |
| `elev-1` (subtle) | `bg-surface shadow-brand-sm` | Default card |
| `elev-2` (lifted) | `bg-surface-bright shadow-brand-md` | Hovered card, dropdown |
| `elev-3` (modal) | `bg-surface-bright shadow-brand-lg` | Dialog, drawer |
| `elev-4` (overlay) | `bg-surface-bright shadow-brand-lg ring-1 ring-border` | Popover above modal |

---

## 5. Border + radius

Retained from v1. Radius `--kt-radius-md` (8px) for buttons/inputs/cards, `--kt-radius-lg` (12px) for modals, `--kt-radius-full` for pills/badges.

---

## 6. Motion (NEW v2 — Emil Kowalski-aligned principles)

Animation MUST be purposeful, ≤ 300ms, eased. Decorative motion is an anti-pattern.

| Token | Value | Use case |
|---|---|---|
| `--kt-motion-fast` | 150ms ease-out | Button press, tab switch |
| `--kt-motion-base` | 200ms cubic-bezier(0.16, 1, 0.3, 1) | Card hover, dropdown reveal, status badge change |
| `--kt-motion-slow` | 300ms cubic-bezier(0.16, 1, 0.3, 1) | Modal open/close, page transition fade |

Tailwind classes: `duration-fast`, `duration-base`, `duration-slow` + `ease-brand` (custom curve).

**Easing curve** `cubic-bezier(0.16, 1, 0.3, 1)` is "ease-out-expo soft" — accelerates fast then settles, feels native.

**Anti-motion:** no spring overshoot, no bounce, no parallax decoration, no auto-rotate.

### 6.1 Recipe library

| Recipe | Class | Behavior |
|---|---|---|
| `kt-fade-in` | `.kt-fade-in` | opacity 0→1 over 200ms ease-brand |
| `kt-slide-up` | `.kt-slide-up` | translateY(8px)→0 + opacity 0→1, 200ms ease-brand |
| `kt-scale-in` | `.kt-scale-in` | scale(0.96)→1 + opacity 0→1, 200ms ease-brand |
| `kt-shake` | `.kt-shake` | 4px horizontal nudge ×2, 250ms (form errors) |
| `kt-pulse-attention` | `.kt-pulse-attention` | 1× soft scale pulse (1→1.02→1) over 600ms (CTA highlight) |

---

## 7. Component patterns

| Component | Token usage |
|---|---|
| `<Button>` | `bg-brand-deep text-white` (primary), `bg-brand-deep-100 text-brand-deep` (subtle), `bg-surface-container-low text-foreground` (ghost) |
| `<Card>` | `bg-surface shadow-brand-sm rounded-md p-card` |
| `<Input>` | `bg-surface-container-low border-border focus-visible:ring-brand-deep` |
| `<StatusBadge>` | Status palette + `bg-{status}-bg text-{status}` |
| `<Dialog>` | `bg-surface-bright shadow-brand-lg rounded-lg`, scale-in animation |
| `<Toast>` | `bg-surface-bright shadow-brand-md rounded-md`, slide-up animation |

---

## 8. Anti-pattern audit (replaces, NOT augments)

Code older than v2 may use raw Tailwind for status colors. **Replace** during overhaul:

| Anti-pattern | Replace with |
|---|---|
| `bg-zinc-100` | `bg-surface-container-low` |
| `bg-zinc-50` | `bg-surface-container` |
| `bg-zinc-200` | `bg-surface-container-high` |
| `text-zinc-500` | `text-muted-foreground` |
| `text-zinc-600` | `text-muted-foreground` (or `text-foreground` if needs more contrast) |
| `text-zinc-700` | `text-foreground` |
| `text-zinc-900` | `text-foreground` |
| `bg-emerald-50 text-emerald-900 border-emerald-500` | `bg-feedback-success-bg text-feedback-success border-feedback-success` |
| `bg-amber-50 text-amber-900 border-amber-500` | `bg-feedback-warning-bg text-feedback-warning border-feedback-warning` |
| `bg-red-50 text-red-900 border-red-500` | `bg-feedback-danger-bg text-feedback-danger border-feedback-danger` |
| `bg-emerald-500` | `bg-feedback-success` |
| `text-2xl font-semibold` | `text-headline font-semibold` |
| `text-xl font-semibold` | `text-title font-semibold` |
| `text-sm text-muted-foreground` | `text-body text-muted-foreground` |

---

## 9. Migration plan

1. Land tokens in `theme.css` + map in `tailwind.config.ts` (Phase 2).
2. Refactor primitives (`<Card>`, `<Button>`, `<Input>`, status badges) to consume new tokens — single source of token usage propagates.
3. Refactor pages route-by-route, replacing anti-patterns from §8 table.
4. Verify zero `bg-zinc-*`, `bg-emerald-*`, `bg-amber-*`, `bg-red-*` raw color refs remain in `apps/web/src/pages/` and `apps/web/src/components/` (allowed: `text-red-700` for inline form-error if exact tone required, but prefer `text-feedback-danger`).

Verification grep target: zero raw Tailwind color refs in pages + components by Phase 3 completion.
