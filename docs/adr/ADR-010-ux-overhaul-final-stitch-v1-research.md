# ADR-010: UX Overhaul Final — Stitch v1 + Research Consolidation

- **Status:** Accepted
- **Date:** 2026-04-30
- **Deciders:** Owner BD (final approver), Claude Code (executor)
- **Context:** Sprint 6 final overhaul — owner picked Stitch v1 over v2 after side-by-side comparison, then consolidated v1 with external research (Asana / Monday / ClickUp benchmarks) into a unified spec at `docs/design-system-final-spec.md`. ADR-009 established Stitch-as-inspiration workflow; this ADR locks the final design-system surface adopted in code.

---

## Context

Pre-Sprint-6-final state (post ADR-009 + Sprint 6 overhaul):
- v2.1 tokens landed in code: 5-level surface tonal scale, M3 typography aliases, semantic feedback colors, motion tokens
- 103 raw `bg-zinc-*`/`bg-emerald-*`/`bg-amber-*`/`bg-red-*` refs eliminated → 0
- Owner directive: continue raising the bar — adopt Stitch v1 winner + external research (Asana / Monday / ClickUp UX benchmarks)
- Skills installed: Impeccable + emil-design-eng (UI craft polish)
- Microcopy already curated in `apps/web/src/lib/labels.ts` (BRAND voice Indonesian, Sprint 5–6 lineage)

Owner consolidated **Stitch v1** (preferred) with **research** into a single 790-line unified spec (`docs/design-system-final-spec.md`) and resolved 5 design decisions:
- D1 Tertiary warm orange `#6F3600` = ADOPT
- D2 Modal radius 12 → 16px = BUMP
- D3 Inter Display font (~10 KB) = ADD (split from Inter sans)
- D4 Primary split (`primary` darker for AA + `primary-container` for fill) = SPLIT
- D5 Source-csv violet `#8B5CF6` = KEEP as legacy (dual-accent strategy)

Question for ADR-010: how to land the unified spec in code without breaking Sprint 1–5 visual identity, while keeping a clean revert path for the owner.

---

## Decision

**Adopt the unified spec wholesale via additive token extension (v2.1 → v2.2).** All new tokens declared at `:root` in `theme.css` §15 as a clearly-labeled v2.2 block; v2.1 tokens preserved (last-wins cascade redefines surface scale + brand-tinted shadows where the spec calls for visual upgrade). Components opt into brand variants progressively — no forced migration.

Specifically:
1. **Tokens:** 80+ entries added — 9-level surface scale, M3 color triads (primary/secondary/tertiary + container variants), status fg+bg pairs (10% alpha), outline tokens, full M3 typography hierarchy (`display/headline/title/body/label × lg/md/sm` + caption), Stitch spacing (gutter/container/margins), brand-tinted 4-level elevation, granular animation tokens (5 durations × 5 easings + 3 reusable @keyframes).
2. **Primitives:** Button gains `brand`/`brand-secondary`/`ghost-brand` variants (opt-in). Card switches to `surface-container-lowest` + `shadow-brand-sm` + hover lift. Dialog inherits 16px radius via `--kt-radius-lg`. Input picks up `outline-variant` border + primary-container focus ring.
3. **Pages:** v2.1 typography aliases (`text-headline`, `text-display`) upgraded once in `tailwind.config.ts` to inherit Inter Display family — 12 page headlines automatically gain editorial typeface without per-page edits.
4. **Animations:** 12 page roots gain `animate-fade-in` (200 ms ease-out). Toast switches to `animate-fade-up` (300 ms). Existing primitives (Button press, Card hover, Dialog scale-in, MentionAutocomplete) already aligned with Emil Kowalski principles from Phase C/D.
5. **EmptyState v2.2:** existing component (Sprint 4 F10) upgraded to use semantic tokens + spec §7.5 secondary-action API, backward-compat preserved.
6. **Microcopy:** `labels.ts` extended with spec §8 missing keys (SERVER 500, validation, OK_GOT_IT/SKIP_FOR_NOW/CONTINUE/BACK/YES_CONTINUE, toast SAVE_FAILED/UPLOAD_SUCCESS/INVITE_SENT etc, HELPER namespace).

---

## Options Considered

| Option | Pros | Cons | Cost |
|---|---|---|---|
| **A. Additive v2.2 layer** ✅ | Zero forced migration; revert via tag; spec-aligned naming; bundle delta tiny | Two namespaces coexist (v2.1 + v2.2) until next cleanup sprint | 6 commits, ~+4 KB bundle |
| B. Hard-cut v2.1 → v2.2 | Single source of truth right away | High regression risk; every component must migrate in one pass; ~20+ files at risk | 3× higher risk, no faster |
| C. Defer adoption to Sprint 7 | Avoids Sprint 6 scope creep | Wastes the consolidated spec + skill investment; owner wants this now | Negative ROI |

---

## Reasoning

1. **Owner approved spec is exhaustive (790 lines, 5 D-decisions resolved)** — re-litigating during implementation wastes the consolidation effort. Best execute as written.
2. **Additive avoids breakage.** Sprint 1-5 components keep working unchanged; primitives opt-in to brand variants. Tag `sprint-6-pre-overhaul` provides 1-step revert.
3. **Bundle ceiling held.** Initial JS gzip went 146.57 → 150.73 KB (+4.16 KB) — well under the +5 KB target and far from the 250 KB hard ceiling (N1).
4. **Lighthouse a11y stable.** 93 / 90 target maintained post-overhaul (Sprint 6 baseline 93). Performance 92 / 92 unchanged.
5. **Skills (Impeccable + Emil) integrated by mental review** at primitive + page polish phases — purposeful motion ≤300 ms, brand-tinted elevation, tactile button press, soft fade-in entrances. No decorative animation.

---

## Consequences

### Positive
- Inter Display flowing through all `text-headline` + `text-display` usages — editorial feel on all 12 page heads with single config edit.
- Brand-tinted shadows (Deep Blue at 0.08–0.10 alpha) replace neutral grey shadows — stronger brand presence in elevation.
- Status badges using rgb(R G B / 0.1) blend cleanly with new surface tonal scale.
- M3 color triads provide a complete palette for future v3 components without palette-stretching.
- Animation tokens consolidated: page mount, button press, modal entrance, toast, mention dropdown all use shared duration/easing curves.
- EmptyState now supports primary CTA + secondary link side-by-side per spec §7.5.

### Negative (mitigations in place)
- Two surface naming schemes coexist (`--kt-surface-bright` v2.1 + `--kt-surface-container-lowest` v2.2 plus `surface-container-low/high` redefined). Documented in BRAND.md v2.2 §8d. Cleanup sprint can collapse later.
- v2.1 `--kt-status-progress*` namespace coexists with v2.2 `--kt-status-in-progress*`. Components should prefer the v2.2 namespace going forward.
- Spec section 7.6 onboarding tooltip "spotlight" pattern not implemented this sprint — current Tooltip uses `--kt-deep` inline style. Defer to Sprint 7 if F10 onboarding needs deeper polish.

### Test surface
- 1 stale assertion fixed in `sprint-2-checkpoint-3.spec.ts` line 379 (`bg-red-100` → `bg-status-blocked-bg`) — was already stale post Sprint 6 overhaul, surfaced here.
- 1 known flake: `sprint-5-screenshots.spec.ts` "review queue" — backend `process_mom_upload` 60 s timeout; not v2.2-related.

---

## Trigger to Revisit

- If a v3 design system is proposed (e.g., dark-mode-first or material-you alignment).
- If bundle creep from successive token additions exceeds the +20 KB cumulative budget.
- If pilot scales beyond 30 users and needs different elevation language for higher information density (e.g., dense data tables).
- If Inter Display font load impacts mobile FCP > 200 ms in Lighthouse perf audits.

---

## Related

- ADR-009 — UX Polish Strategy + Stitch MCP Collaboration (sets the workflow this ADR fulfills)
- `docs/design-system-final-spec.md` (790-line unified spec, owner-curated)
- `docs/BRAND.md` v2.2 (this overhaul lands in §11 changelog and §8d coexistence note)
- `docs/sprint-6-final-retro.md` (phase-by-phase execution log)
- PR #7 (sprint-6 → main) — undrafted post Phase I
- Tag `sprint-6-pre-overhaul` (revert anchor)
