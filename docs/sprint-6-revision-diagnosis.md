# Sprint 6 Revision — Root Cause Diagnosis

**Date:** 2026-04-30
**Trigger:** Owner rejected PR #7 merge with 5 findings
**Branch:** `sprint-6` (revert anchor: tag `sprint-6-pre-revision`)

---

## TL;DR

Owner findings confirmed by code audit:

| # | Finding | Status | Severity | Root cause |
|---|---|---|---|---|
| 1 | Create Project + Create Task buttons missing | ❌ Confirmed | HIGH | Never implemented; i18n labels exist but no `<Button>` rendered |
| 2 | Import MoM vs CSV labeling unclear | ⚠️ Confirmed | MEDIUM | Generic verbs, no differentiator copy |
| 3 | Status update only via Kanban | ❌ Confirmed | HIGH | `TaskStatusBadge` display-only; ListView no inline edit |
| 4 | Mention raw token visible in composer | ⚠️ Partial | LOW | Display layer works; composer is plain textarea |
| 5 | Stitch redesign overstated | ❌ Confirmed | HIGH | Only microcopy + 1 button shipped; structural redesign skipped |

**Honest retro correction:** Sprint 6 retro claimed "Comprehensive UX polish" — actual delta was ~5-10% visual + microcopy. Stitch screens generated as reference (per ADR-009 Option B), but the visual principle extraction step never landed in code beyond labels + 1 button.

---

## Issue-by-issue

### Issue 1 — Create CTAs missing

**Current state:**
- `ProjectsPage.tsx` (lines 54-138): no Create Project button anywhere on page
- `ProjectDetailPage.tsx` (lines 217-228): Tasks header has view toggle but no Create Task button
- `DashboardPage.tsx`: only "Buka Projects" link, no creation entry point
- `apps/web/src/lib/labels.ts` lines 60, 80, 136: labels `CREATE_TASK`, `CREATE_PROJECT`, `EMPTY_STATE.tasks.cta` defined but unused

**Gap:** No code path for user to create project/task from list pages. Only path may be admin CSV import (bulk) or task detail edit (after entity exists).

**Fix scope:** Add CTAs at:
- `/projects` header (admin/manager only, viewer hidden, member can create within team)
- `/projects/:id` Tasks header (admin/manager/member)
- `/dashboard` empty state for first-time users

### Issue 2 — Import MoM vs CSV labeling

**Current state:**
- Sidebar (AppHeader.tsx lines 84-122): "Import MoM" / "Import CSV" — both terse, no differentiator
- `AdminMoMImportPage` header: "Import MoM" / "Upload notulensi rapat ..."
- `AdminCsvImportPage` header: "Import CSV — Bulk Task" / "Upload file CSV ..."

**Gap:** "MoM" not self-explanatory to non-engineer admins; no contrast about purpose.

**Fix scope:**
- Sidebar: "Import Karyawan (CSV)" + "Import Notulensi (MoM)"
- Page taglines per task brief
- Empty-state explainer cards

### Issue 3 — List view status update

**Current state:**
- `ListView.tsx` line 70: `<TaskStatusBadge status={t.status} />` — display only
- `TaskStatusBadge.tsx`: returns `<span>`, no `onClick` or `<button>`
- `KanbanView.tsx` lines 99-114: dnd-kit drag handler calls `mutateStatus()`
- Task detail page has dropdown for status change

**Gap:** PRD F3 implies parity across views. Asana/Monday-style click-to-change missing.

**Fix scope:** Inline status dropdown on List view rows. Optimistic UI + rollback on RLS reject.

### Issue 4 — Mention render

**Current state:**
- `CommentComposer.tsx` lines 72-90: `@` autocomplete works; chosen mention injected as raw `@[Name](uuid)` token into `<textarea>`
- `CommentMarkdown.tsx` lines 20-44: token preprocessed → `[@Name](mention://uuid)` → renders as styled span. **Display works correctly post-submit.**
- Bug user observed: while typing, raw token is visible

**Gap:** Composer is plain `<textarea>` — no styled chip rendering. Fix needs contenteditable or library-based composer (tiptap heavy; cheap option = render readable label + hidden token map).

**Fix scope (MVP):** When user picks mention from autocomplete, insert visible "@Name" but track UUID resolution at submit time. Cheaper than full contenteditable swap.

### Issue 5 — Stitch redesign

**Current state:**
- `AdminMoMReviewPage.tsx` Sprint 6 diff: spacing tweak + Approve HIGH button + microcopy
- `AdminUsagePage.tsx` Sprint 6 diff: "Segera tersedia" placeholder
- `ProjectDetailPage.tsx`: zero structural change Sprint 6
- Stitch screen IDs documented but not consumed

**Gap:** ADR-009 Option B said "principle extraction" — that step skipped. Need to actually apply distinctive layout patterns from Stitch screens.

**Fix scope per route:**
- **mom-import detail** (Stitch `2ed251cf...`): summary card + grouped review table + bulk-action sticky footer
- **admin/usage** (Stitch `d407e53c...`): metric cards row + sparkline trends + alert callout
- **projects/:id** (Stitch `b093120a...`): sidebar context panel + status pill row + Kanban refined columns

---

## Strategy

1. Fix Issues 1 + 3 first (highest functional value, smallest blast radius).
2. Fix Issues 2 + 4 (label/copy + composer chip) — quick wins.
3. Fix Issue 5 last (structural redesign — requires component-level work; defer to dedicated commits per route).
4. E2E coverage per fix.
5. Bundle + Lighthouse re-audit at end.

---

## Revert anchor

- Tag: `sprint-6-pre-revision` → commit `5c6ee6b`
- Restore: `git reset --hard sprint-6-pre-revision`
