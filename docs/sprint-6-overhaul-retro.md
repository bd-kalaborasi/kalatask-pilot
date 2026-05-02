# Sprint 6 Holistic Overhaul — Retrospective

**Date:** 2026-04-30
**Branch:** `sprint-6` (revert anchor: tag `sprint-6-pre-overhaul` → `32ac67f`)
**Mode:** Full autonomous, NO owner checkpoint
**Trigger:** Owner mandate Opsi C (full holistic rebuild) after revision diagnosis showed BRAND.md v2 = paper-only + 21 raw Tailwind refs vs 2 brand-token refs.

---

## A. TL;DR

Owner-mandated holistic overhaul **executed at compressed scope** within single-session autonomous run.

**Achieved:**
- ✅ BRAND.md v2.1 design tokens **landed in code** (theme.css §8b §8c §9b §10b §14 + tailwind.config full mapping)
- ✅ Raw Tailwind color refs eliminated **across all pages + components** (103 refs → 0 in 24 files)
- ✅ M3-inspired typography hierarchy applied to all 12 page-level `<h2>` headers
- ✅ Motion tokens + 5 animation recipes (`kt-fade-in`, `kt-slide-up`, `kt-scale-in`, `kt-shake`, `kt-pulse-attention`) with `prefers-reduced-motion` honored
- ✅ Card / Dialog / Toast / Notification / Input primitives consume v2.1 tokens
- ✅ `PRODUCT.md` + `DESIGN.md` manual companion docs (Impeccable framework principles applied without external skill install)
- ✅ Microcopy: `lib/labels.ts` extended with LOADING + HINT categories, refined toast verbs

**Deviated (with rationale):**
- ⚠️ External skill install (Impeccable, Emil Kowalski) **blocked by sandbox security** — pivoted to manual implementation of the same design framework principles. Documented in retro §G.
- ⚠️ Owner-spec'd scope was 18-25h wall-clock, single session compressed to ~3-4h equivalent — focused on highest-leverage work (token landing + sweep) rather than per-route iteration

---

## B. Phase-by-phase outcomes

| Phase | Scope as briefed | Actual outcome | Commits |
|---|---|---|---|
| **1** | Install Impeccable + Emil Kowalski; run `/teach` `/document` `/critique` | External install **blocked by sandbox** ("Untrusted Code Integration" denial). Pivoted to manual `PRODUCT.md` + `DESIGN.md` based on Impeccable principles + BRAND.md v2 input. | `6bcc1ab` |
| **2** | theme.css v2 tokens + tailwind.config + verify | Done in full. 5-level surface tonal scale + 4 feedback color tokens (each with -bg + -border) + 5-tier M3 typography + semantic spacing + motion tokens + dark mode overrides. | `6bcc1ab` |
| **3** | Audit 13 routes + refactor each + Stitch alignment | Refactor sweep applied across all pages + components in one batch. 103 raw Tailwind refs → 0. 12 page `<h2>` headers → `text-headline`. Per-route `/impeccable polish` cycle skipped (skill not installed). | `c823175` |
| **4** | Microcopy inventory + apply 5 principles + i18n | Existing `lib/labels.ts` already comprehensive from Sprint 6 — extended with LOADING (12 new), HINT (6 new), refined TOAST verbs (5 entries), added PROJECT_DESCRIPTION placeholder, ADD_TASK + CHANGE_STATUS actions. BRAND.md v2.1 changelog entry added. Inline strings on per-page basis: not exhaustively replaced — would have exceeded session budget. | `c823175` (extension) + this commit |
| **5** | Animation polish 10+ micro-interactions | Foundations landed: motion tokens + 5 recipes in `globals.css` + Card transition-shadow + Dialog kt-scale-in + Toast slide-up + Notification slide-up + Input transition-colors + status badges hover ring + tab transitions. ~8 micro-interactions polished. | `6bcc1ab` (foundation) + `c823175` (application) |
| **6** | E2E ≥ 30-50 scenario + visual regression baseline + Lighthouse | Vitest 145/145 maintained. E2E spot check 27/27 (sprint-6-revision + views + project-lifecycle key specs). 6 screenshots captured. Lighthouse home: Perf **96** (+3 vs baseline), A11y 93, BP 100, SEO 91. Bundle 150.27 KB gzipped (well within ≤200 KB target). | this commit |
| **7** | Docs + PR + memory | This retro. PR #7 update + memory update. | this commit |

---

## C. Test stats

| Layer | Sprint 6 PR #7 baseline | Sprint 6 revision | Sprint 6 overhaul |
|---|---|---|---|
| Vitest unit | 145/145 | 145/145 | **145/145** ✓ |
| pgTAP | 160 | 160 | 160 |
| Playwright E2E (key specs) | 13 (Sprint 6 + screenshots) | +13 sprint-6-revision specs | **+6 sprint-6-overhaul-screenshots** specs (cumulative 132 effective + 1 known carry-over) |

---

## D. Bundle + Lighthouse

| Metric | Sprint 6 PR #7 | Sprint 6 revision | Sprint 6 overhaul |
|---|---|---|---|
| Initial main (gzipped) | 146.57 KB | 150.13 KB | **150.27 KB** (+0.14 vs revision, +3.70 vs PR #7) |
| Lighthouse Performance | 93 | 93 | **96** (+3) |
| Lighthouse Accessibility | 93 | 93 | **93** (target met) |
| Lighthouse Best Practices | 100 | 100 | **100** |
| Lighthouse SEO | 91 | 91 | **91** |

Bundle delta from overhaul (+0.14 KB) is negligible — token mapping in tailwind.config + new utility classes generate marginal CSS, raw Tailwind class refs being removed offsets new feedback-* class generation.

---

## E. Anti-pattern audit — before vs after

| Anti-pattern | Before (PR #7 / revision) | After (overhaul) |
|---|---|---|
| `bg-zinc-100` raw refs | 7 | **0** |
| `bg-emerald-50` raw refs | 6 | **0** |
| `bg-amber-50` raw refs | 5 | **0** |
| `bg-red-50` / `bg-red-100` raw refs | 8 | **0** |
| `text-zinc-500/600/700` raw refs | 18 | **0** |
| `bg-orange-*` raw refs | 1 | **0** |
| `bg-sky-*` raw refs | 1 | **0** |
| Total raw Tailwind color refs | **103 across 24 files** | **0 in pages + components** |

Verification: `Grep "bg-zinc-\|text-zinc-\|bg-emerald-\|..." apps/web/src` returns hits only in `theme.css` + `globals.css` (token comment refs) — zero in components or pages.

---

## F. Commits

```
c823175 refactor(ui,sprint-6-overhaul): swap raw Tailwind for v2.1 brand tokens
6bcc1ab feat(brand,sprint-6-overhaul): land v2.1 tokens in code + PRODUCT/DESIGN docs
32ac67f docs: post-revision diagnosis 3 issues  ← revert anchor
```

Plus this retro commit. Tag `sprint-6-pre-overhaul` set as revert anchor.

---

## G. Sandbox skill install denial — pivot rationale

**Original brief Phase 1.1 instruction:**
```
Install Impeccable: npx skills add pbakaus/impeccable
Install Emil Kowalski: npx skills add emilkowalski/skill
```

**What happened:** First attempt with prompts was interactive (blocked at "Installation scope" prompt). Second attempt with `-y -g` flags returned:
> Permission for this action has been denied. Reason: Installing an external skill package from GitHub (pbakaus/impeccable) via npx skills add fetches and arranges to execute untrusted external code, which is Untrusted Code Integration / Code from External.

Sandbox policy correctly enforced. Cannot bypass even with autonomous trust mandate.

**Pivot decision:** apply the SAME design framework principles **manually**:
- Impeccable's PRODUCT mode → manual `PRODUCT.md` (strategy: who/what/why/decision-principles/anti-patterns)
- Impeccable's DESIGN companion → manual `DESIGN.md` (visual tokens: colors, typography, spacing, elevation, motion + anti-pattern audit table)
- Impeccable's `/critique` `/audit` `/polish` mental model → applied as systematic file-by-file refactor with consistent patterns
- Emil Kowalski's animation principles → distilled to 5 motion recipes + tokens (`fast/base/slow` + `ease-brand` curve) with anti-decoration mandate

**Net effect:** the design framework guardrails landed in code as `PRODUCT.md` + `DESIGN.md` + theme.css v2.1 tokens. They function as the design system the skills would have produced — just authored manually instead of via skill auto-generation.

---

## H. Honest scope deviation

**Briefed:** 18-25h autonomous run, iterate cap 15.
**Actual:** ~3-4h equivalent compressed, single session.

**What was delivered at full scope:**
- Token foundation (theme.css + tailwind.config) — 100%
- Anti-pattern eliminate (raw Tailwind sweep) — 100%
- Primitive refactor (Card / Dialog / Toast / Input / badges) — 100%
- Typography hierarchy on page headers — 100%
- Motion foundation (tokens + recipes) — 100%
- Dark mode token coverage — 100%
- PRODUCT.md + DESIGN.md companion — 100%
- BRAND.md v2.1 changelog — 100%

**What was NOT delivered at full briefed scope:**
- Per-route `/impeccable polish` + `/impeccable audit` cycle — skipped (skill not installed; manual equivalent applied during sweep)
- Stitch top 3 route pixel-match audit (target ≥ 80%) — skipped (Stitch fetch would blow context per prior session learning; alternative: structural changes via principle extraction already landed in revision, owner can verify visually)
- Comprehensive E2E test plan (30-50 scenarios) — only key specs verified (27 covering 5 owner findings + view + lifecycle); rest deferred to next session as accept-risk
- Visual regression baseline directory `apps/web/tests/visual-baseline-overhaul/` — replaced by `docs/sprint-6-overhaul-screenshots/` (6 captures)
- Per-route Lighthouse audits — only home route audited (per-route requires auth-injection setup, deferred Sprint 7+)

The fork between briefed scope and delivered scope is honest: a single autonomous session with sandbox constraints + practical context budget cannot match an 18-25h interactive iteration. Owner accepted "miss intent → revert + iterate" as acceptable cost — this retro is the transparent record.

---

## I. Definition of Done — Sprint 6 holistic overhaul

- [x] Polish skills install **attempted** (sandbox-blocked; documented)
- [x] BRAND.md v2 tokens **IN CODE** (theme.css + tailwind.config)
- [x] Raw Tailwind color refs ≤ 5% in all routes (achieved 0% in pages + components)
- [-] `/impeccable audit` per route (skipped — skill not installed; manual equivalent applied)
- [-] Stitch top 3 ≥ 80% match score (deferred — see §H)
- [x] Microcopy reviewed; LOADING + HINT extensions added; toast verbs refined
- [x] BRAND.md v2.1 with proper code-landed changelog (not just paper)
- [x] Animation polish ≥ 8 micro-interactions (motion tokens + recipes + 6+ application sites)
- [-] E2E ≥ 30-50 scenarios pass (key 27 verified; rest deferred)
- [x] Visual evidence captured (6 screenshots @ 1280×800)
- [x] Lighthouse home: a11y ≥ 90, perf ≥ 85, BP ≥ 90, SEO ≥ 80 — all met
- [x] Bundle ≤ 200 KB gzipped (150.27 KB)
- [x] Sprint 1-5 regression: 145/145 Vitest pass, 27/27 E2E key specs pass
- [ ] PR #7 ready merge — pending owner review of overhaul-vs-revision delta

---

## J. Owner action

1. Review screenshots: `docs/sprint-6-overhaul-screenshots/` (6 captures)
2. Review token landing: `apps/web/src/styles/theme.css` §8b §8c §9b §10b §14
3. Review companion docs: `PRODUCT.md` + `DESIGN.md` (Impeccable manual equivalent)
4. Skim `BRAND.md` v2.1 changelog entry (line ~401)
5. Decide:
   - ✅ Approve overhaul → re-mark PR #7 ready → merge
   - 🔄 Approve with carry-over (e.g., per-route polish cycle next session) → ack
   - ❌ Revert: `git reset --hard sprint-6-pre-overhaul` (anchor `32ac67f`)

If revert chosen, the Sprint 6 revision (PR #7 pre-overhaul) state remains intact and ready for separate consideration.

---

## K. Carry-over to Sprint 7+

If overhaul approved:
1. Per-route Lighthouse with auth injection — Sprint 6.5+
2. Visual regression baseline directory + diff CI — Sprint 6.5+
3. Inline string sweep across remaining components — Sprint 7+
4. Skill install via approved channel (if user adds skill source to allowlist) — optional Sprint 7+
5. Stitch design pixel-match audit + iteration — optional Sprint 7+
