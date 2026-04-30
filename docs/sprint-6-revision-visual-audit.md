# Sprint 6 Revision — Visual Audit

**Date:** 2026-04-30
**Trigger:** Owner verify revision di /projects local dev — design masih kelihatan sama
**Scope:** Read-only audit of commit `326bc24` (Stitch redesign 3 routes)
**Verdict short:** Owner's perception is correct. Redesign was structural-additive, NOT visual-system refresh.

---

## TL;DR — Score per route

| Route | Score | Match Stitch principle |
|---|---|---|
| `/projects/:projectId` (Project Detail) | **PARTIAL** | ~40% — layout added sidebar; visual tokens unchanged |
| `/admin/usage` (Usage Dashboard) | **MINIMAL** | ~20% — banner additive on top; rest of page identical to Sprint 5 |
| `/admin/mom-import/:id` (MoM Review) | **MINIMAL-PARTIAL** | ~30% — tab nav added; ItemGroup card identical |

**Important context:** `/projects` (list page, not detail) was **NOT** in the redesign scope — only got the Create Project button (Issue 1). Owner expectation that `/projects` look would change is a scope mismatch. Redesigned routes are the **detail pages** (`/projects/:id`), `/admin/usage`, and `/admin/mom-import/:id`.

---

## Diff stats

Commit `326bc24` — 3 files, +285 / -39 lines:

| File | Lines added | Nature of change |
|---|---|---|
| `apps/web/src/pages/ProjectDetailPage.tsx` | +176 / -39 | Wrapped existing content in `<aside>` + main grid; added `ProjectTaskSummary` helper component |
| `apps/web/src/pages/AdminUsagePage.tsx` | +77 | Added `computeOverallHealth()` + banner JSX above existing content |
| `apps/web/src/pages/AdminMoMReviewPage.tsx` | +71 | Added `activeTab` state + tab nav JSX + filter wrapper around existing render |

**No files modified outside these 3 pages.** No new components added to `components/` directory. No design-token files touched (`theme.css`, `tailwind.config.ts`, `BRAND.md`).

---

## Per-route analysis

### Route 1 — `/projects/:projectId` (PARTIAL, ~40%)

**What changed structurally:**
```tsx
// Before (commit 5c6ee6b):
<div className="space-y-3">          // Project header
<Card>Status Project</Card>           // Status select card
<div className="space-y-4">           // Tasks header + view toggle + body

// After (commit 326bc24):
<div className="grid gap-6 lg:grid-cols-[280px_1fr]">
  <aside className="lg:sticky lg:top-6">
    <h2>{project.name}</h2>
    <ProjectStatusBadge/>
    <Card><Status/></Card>
    <Card><Ringkasan tugas/></Card>
    <p>Dibuat: ... / Selesai: ...</p>
  </aside>
  <div className="space-y-4">         // Same tasks header + view toggle + body
```

**What did NOT change:**
- `<Card>` primitive markup — same `bg-surface`, same border, same shadow
- Typography scale — `text-2xl font-semibold` (Sprint 5 baseline), no Material 3 `display-lg`/`headline-md`
- Color palette — `bg-zinc-100`, `bg-emerald-500`, `text-red-700` (Tailwind defaults), no Stitch surface tonal scale
- Spacing — raw Tailwind `gap-6`, `p-3`, `space-y-4`, no semantic `card-gap`/`section-margin` tokens
- Button styling — reused existing `<Button/>` variants unchanged

**Match against Stitch screen `b093120af4ae474aae65a255f811b748` (Project Detail Kanban):**
- ✅ Sidebar context panel (concept matched)
- ❌ Material 3 typography (display-lg headline, label-md captions)
- ❌ Surface tonal scale (5-level: surface, surface-dim, surface-bright, surface-container-low/high)
- ❌ Designated color tokens (on-primary, primary-container, inverse-primary)
- ❌ Refined Kanban column visual (the route still falls back to existing KanbanView when view=kanban)

**Net effect:** Layout shifted right on `lg+` viewports (sidebar visible). On mobile/tablet (`<lg`), entire change collapses — single-column layout looks IDENTICAL to Sprint 5 baseline.

### Route 2 — `/admin/usage` (MINIMAL, ~20%)

**What changed structurally:**
```tsx
// Added ABOVE existing content:
{summary && overallHealth && (
  <div className="rounded-lg border-l-4 px-4 py-3 ...">
    <span>{HEALTH_ICON[tone]}</span>      // 🚨 / ⚠️ / ✅ emoji
    <p>{headline}</p>
    <p>{detail}</p>
  </div>
)}

// All content below this is UNCHANGED from Sprint 5:
{summary.alerts.length > 0 && ...}        // Existing alerts list
<UsageCard label="Database" .../>         // Existing 3-card grid
<UsageCard label="Storage" .../>
<UsageCard label="MAU" .../>
{summary.top_tables && ...}               // Existing top tables list
```

**What did NOT change:**
- Page header
- 3 `<UsageCard/>` components (same progress bar, same colors)
- Alerts list (same red/amber border treatment)
- Top tables list (same border-b separator)
- Visual hierarchy — banner is just one more rectangle in the vertical stack

**Match against Stitch screen `d407e53cf3cc4cc59902cf3d11889cdd` (Usage Monitoring):**
- ✅ Status banner concept (matched as additive element)
- ❌ Sparkline / trend visualization (not implemented)
- ❌ Refined metric card visual (Material 3 surface-container-high vs flat surface)
- ❌ Refreshed typography hierarchy
- ❌ Captured timestamp formatting changes

**Net effect:** One new rectangle at top of page. Owner navigating to `/admin/usage` will see baseline Sprint 5 dashboard with a banner stuck on top. The "redesign" perception is muted because the bulk of page real-estate (3 metric cards + alerts + top tables) is identical.

### Route 3 — `/admin/mom-import/:id` (MINIMAL-PARTIAL, ~30%)

**What changed structurally:**
```tsx
// Added BETWEEN summary card and group list:
<div role="tablist" className="flex flex-wrap gap-1 border-b">
  <button>Semua [N]</button>
  <button>HIGH [N]</button>
  ...
</div>

// Existing render conditioned on activeTab:
{visibleGroups.map(conf => <ItemGroup .../>)}  // Same component, filtered list
```

**What did NOT change:**
- `<ItemGroup/>` component — same per-item card layout, same radio buttons, same select dropdown
- Summary card with HIGH approve button — unchanged
- Sticky bottom Approve button — unchanged
- Confidence badges, color coding — unchanged

**Match against Stitch screen `2ed251cf65634098a0b60439b7fe7e8e` (MoM Review Queue):**
- ✅ Tab filter concept (matched)
- ❌ Two-column layout (items list + decision panel)
- ❌ Per-item card visual refresh (still has same radio button clutter)
- ❌ Bulk action toolbar (only HIGH-approve button at top, no contextual bulk select)
- ❌ Material 3 typography
- ❌ Surface tonal scale

**Net effect:** A horizontal tab strip appears between summary and item list. Clicking tab filters — useful UX, but visual identity of items below is identical to Sprint 5 baseline.

---

## Root cause: BRAND.md v2 design tokens never landed in code

ADR-009 Option B mandate: "principle extraction, BRAND.md tokens source of truth."

**What landed:** Principle extraction (sidebar, banner, tabs) — structural patterns.
**What did NOT land:** BRAND.md v2 token enrichment to match Stitch sophistication.

Specifically:
1. **Surface tonal scale** — Stitch uses 5 levels (`surface`, `surface-dim`, `surface-bright`, `surface-container-low`, `surface-container-high`). KalaTask still uses flat `bg-surface` + Tailwind `bg-zinc-100`/`bg-zinc-50`. Components feel flat compared to Stitch's layered depth.
2. **Material 3 typography** — Stitch uses `display-lg` (~36px), `headline-md` (~28px), `body-lg/md/sm`, `label-md/sm` with refined line-heights. KalaTask uses Tailwind defaults (`text-2xl`, `text-sm`, `text-xs`) — flatter hierarchy.
3. **Designated color tokens** — Stitch differentiates `on-primary` (text on primary bg), `primary-container` (subtle primary bg), `inverse-primary` (dark mode). KalaTask uses raw `text-white`, `bg-brand-deep`, `text-zinc-700` — less semantic.
4. **Spacing tokens** — Stitch uses `card-gap`, `section-margin`, `container-padding` semantic. KalaTask uses raw `gap-6`, `space-y-4`, `p-6`.

**The redesigns I shipped operate on the OLD Sprint 5 visual system with new layout patterns layered on top. The result is "Sprint 5 with a sidebar / banner / tabs" — not "redesigned visual system with Stitch sophistication."**

---

## Recommendation (NOT applied — read-only audit)

To deliver perceptible visual refresh that matches owner expectation:

1. **Phase A — BRAND.md v2.1 token enrichment** (foundation work, ~2 hours):
   - Add surface tonal scale: `--kt-surface`, `--kt-surface-dim`, `--kt-surface-bright`, `--kt-surface-container-low`, `--kt-surface-container-high`
   - Add Material 3 typography classes via `tailwind.config.ts`: `text-display-lg`, `text-headline-md`, `text-body-md`, `text-label-sm`
   - Add semantic spacing: `--kt-card-gap` (1.25rem), `--kt-section-margin` (2.5rem)
   - Update `theme.css` with new variables
   - Document in BRAND.md v2.1 changelog

2. **Phase B — Update primitive components** (~1 hour):
   - `<Card/>` adopts `bg-surface-container-low` default
   - `<Button/>` variants adopt new color tokens
   - Heading utility class for page titles uses `text-display-lg`
   - Section spacing uses semantic tokens

3. **Phase C — Re-apply redesigns with new tokens** (~2 hours):
   - ProjectDetailPage sidebar uses new surface tones for visual depth
   - AdminUsagePage metric cards refresh to layered surface
   - AdminMoMReviewPage item cards adopt new typography hierarchy

4. **Phase D — Visual evidence + owner sign-off** (~30 min):
   - Re-capture screenshots
   - Update PR with before/after side-by-side
   - Wait for owner approval before marking done

**Estimated total:** 5-6 hours wall-clock for an honest visual refresh.

---

## Honest correction to revision retro

`docs/sprint-6-revision-retro.md` Section B says:
> "Stitch redesign — sidebar context layout (280px sticky) + ringkasan tugas card. /admin/usage overall health banner (worst-case utilisasi). /admin/mom-import/:id confidence filter tabs"

That description is **structurally accurate but understates what wasn't done**. The phrase "Stitch redesign" implies visual-system parity with Stitch screens. What landed was **structural-additive principle extraction without visual-system refresh**.

A more honest framing for the retro would have been:
> "Structural additions inspired by Stitch screens — sidebar layout, health banner, filter tabs. Visual system (typography, surface tonal scale, semantic spacing) deferred to BRAND.md v2.1."

This audit corrects that record.
