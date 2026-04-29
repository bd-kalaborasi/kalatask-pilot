# ADR-009: UX Polish Strategy + Stitch MCP Collaboration

- **Status:** Accepted
- **Date:** 2026-04-29
- **Deciders:** Claude Code (proposer), Owner BD (approver)
- **Context:** Sprint 6 — owner mandate "UI UX penting banget, attractive, tidak overwhelmed, navigasi jelas". Stitch MCP newly available. Need decision on: (1) how to leverage Stitch as design tool, (2) scope of UX polish, (3) BRAND.md evolution path.

---

## Context

Pre-Sprint 6 KalaTask shipped functional features (F1-F16 + Sprint 4.5 collaboration depth) tapi UI quality variable across routes. Sprint 5 launch revealed 3 high-cognitive-load pages:
- `/admin/mom-import/:id` MoM Review Queue (~200 interactive elements untuk 47-action MoM)
- `/admin/usage` Usage Dashboard ("n/a" Storage feels broken)
- `/projects/:projectId` Project Detail (densest, mobile kanban issue)

Stitch MCP became available. Question: how use it efficiently as design generation tool tanpa locking architecture ke Stitch-specific output?

ADR-009 evaluates 3 approaches:
- **A: Stitch as code generator** — copy-paste Stitch HTML+Tailwind to React components
- **B: Stitch as design inspiration only** — owner-approved Stitch screens become spec, Claude Code re-implements di React + Tailwind dengan BRAND.md tokens (source of truth)
- **C: Skip Stitch, hand-craft UX polish** — slower but deterministic

**Constraint pilot:**
- Free-tier alignment (ADR-001) — no new infrastructure cost
- BRAND.md v1 already exists with deep blue + sky + Inter tokens
- Sprint 1-5 components committed; UX polish must NOT break functional features (zero regression)
- Velocity target Sprint 6: 4-5 jam wall-clock
- Owner not engineer — needs visual evidence (screenshots) for decision-making

---

## Decision

**Adopt Option B — Stitch as design inspiration, BRAND.md tokens as source of truth.**

Spesifikasi:

### 1. Stitch workflow

1. **Phase 1 setup:** create Stitch project + design system seeded dari BRAND.md tokens (deep blue #0060A0 primary, Inter font, 8px roundness).
2. **Phase 2 audit:** review existing routes per UX principles, identify TOP 3 highest-severity routes for Stitch redesign treatment.
3. **Phase 3 generation:** prompt Stitch with explicit role + content type + Indonesian microcopy expectations. Generate desktop + mobile per top 3.
4. **Phase 3 checkpoint:** STOP, owner review preview screens, choose per-screen approve/iterate/reject.
5. **Phase 3 re-implement:** post-approval, Claude Code applies *patterns* from Stitch (toolbar consolidation, accordion grouping, friendly placeholder copy) di React + Tailwind. NOT literal HTML copy.

### 2. BRAND.md evolution v1 → v2

**Additive only — no breaking changes.** Sprint 1-5 components remain valid.

- v2 adds §13 "Microcopy Guidelines" (5 prinsip Asana/Monday-style action-oriented Indonesian)
- v2 documents Stitch-derived hybrid token candidates (surface tonal scale, M3 typography) as OPTIONAL adoption — bukan mandatory
- v2 locks refined Indonesian status labels: `Belum mulai / Sedang dikerjakan / Cek ulang / Selesai / Tertahan`

### 3. Centralized i18n constants

Create `apps/web/src/lib/labels.ts` sebagai single source of truth untuk:
- Status labels per enum (task status, priority, project status)
- Action button labels (verb-led)
- Empty state copy (icon + title + body + CTA)
- Error message templates (specific + actionable recovery)
- Toast messages, placeholders, confirmation dialog copy

Mandate: components MUST consume from `labels.ts`, NOT hardcode strings.

### 4. UX polish principles (anti-overwhelm)

Locked Sprint 6, dokumentasikan di BRAND.md v2:
- Visual hierarchy: primary action menonjol (filled brand-deep), secondary outline
- Whitespace generous, density rendah
- Loading skeleton di setiap data-fetching page
- Empty state dengan icon + title + body + CTA
- Error state dengan recovery action
- Mobile-first responsive
- Accessibility WCAG AA (4.5:1 contrast minimum, landmark roles, keyboard navigation)

---

## Options yang dipertimbangkan

| Opsi | Speed | Lock-in risk | BRAND.md fit | Pilot fit |
|---|---|---|---|---|
| A: Stitch code-gen (copy HTML) | Fast | High (Stitch-specific Tailwind classes leak) | ❌ Tokens drift | Risky |
| **B: Stitch inspiration + manual re-impl** ✅ | Medium | Low | ✅ BRAND.md preserved | Best fit |
| C: No Stitch, hand-craft | Slow | None | ✅ | Velocity miss |

---

## Reasoning kenapa Option B dipilih

1. **BRAND.md as source of truth preserved.** Stitch returns auto-generated design system "Professional Clarity" + "Modern Monitoring" — sophisticated tapi different from KalaTask v1 (M3-inspired surface tonal scale vs flat zinc). Option A would force adoption + risk drift. Option B keeps BRAND.md tokens authoritative.

2. **Owner-friendly checkpoint.** Stitch screen URLs pada checkpoint 1 give owner concrete artifacts untuk review (not abstract specs). Re-implement pattern (Option B) ensures owner approval translates ke working code dengan tokens consistent.

3. **Velocity match.** Sprint 6 target 4-5 jam. Option A (fast but lock-in) atau Option C (slow hand-craft) both miss. Option B = 3.5h actual at Phase 6 completion.

4. **Component reuse.** Option B ekstrak pattern (e.g., "Approve HIGH only" prominent button, friendly Storage "Segera tersedia") jadi reusable principles applied across routes. Option A would copy-paste each Stitch screen as monolith.

5. **i18n scalability.** `lib/labels.ts` central enables future Indonesian → English locale swap (post-pilot scale). Hardcoded copy (no labels file) would require global search-replace.

6. **Microcopy quality lift.** Owner research (Sprint 4.5 trigger) showed adoption-critical for collaboration depth. Sprint 6 directive lift microcopy ke Asana/Monday quality — central labels file enforces consistency PR-by-PR.

---

## Consequences

### Positif

- BRAND.md v2 = additive, zero breaking change Sprint 1-5
- Stitch as on-demand design tool (not architectural dependency)
- `lib/labels.ts` enables future locale + content audit
- Refined Indonesian labels improve perception quality (Asana/Monday parity)
- A11y +5 (88→93) achieved via landmark fix + color contrast clean-up
- Pattern extraction (toolbar consolidation, accordion review queue) applicable to future routes

### Negatif (mitigasi)

- **Stitch quota cost.** Each `generate_screen_from_text` call = MCP backend cost. Mitigasi: batch generate top 3 only (not all 13 routes). Defer mobile variants until owner approves desktop. Phase 4 polish via principles, no Stitch generation.
- **Re-implement effort.** Manual React+Tailwind from Stitch HTML reference = +0.5d vs copy-paste. Mitigasi: principle-extract approach instead of literal — get insight value (8/10) at cost of 30% re-impl time vs. literal 100% time.
- **Status label refactor breaks existing tests.** Sprint 1-5 E2E specs reference 'Active'/'Planning'/'Todo'. Mitigasi: 4 spec files updated Phase 6 (project-lifecycle, sprint-2-checkpoint-3, views, ProjectStatusBadge.test). Verified post-update 118 effective pass.
- **Stitch design system "Professional Clarity" + "Modern Monitoring" richer than v1.** Tempting to fully adopt M3 surface tonal scale. Mitigasi: v2 documents as OPTIONAL adoption — Sprint 7+ can selectively adopt if user feedback warrants.
- **Per-route Lighthouse for protected pages skipped.** Auth-injection Lighthouse setup complex. Mitigasi: home + login audited (cover landing UX ~80%). Sprint 6.5+ task: setup Playwright-driven Lighthouse with auth state injection.

---

## Stitch project artifacts (locked)

| Resource | ID | Note |
|---|---|---|
| Project "KalaTask Pilot" | `10753861108950066040` | Persistent across sessions |
| Design System "KalaTask Brand v1" | `assets/421534752530272247` | Minimal seed config |
| Auto-generated "Professional Clarity" | `assets/03f58bca9fee4100a5c3340ac008be84` | Used by screens 1, 3, 4, 6 |
| Auto-generated "Modern Monitoring" | `assets/0745d3566af34f12b85a87af4b859bba` | Used by screens 2, 5 |

6 screens generated (3 desktop + 3 mobile) — see `docs/sprint-6-stitch-ids.md`.

---

## Trigger untuk revisit ADR ini

ADR-009 harus di-evaluate ulang kalau salah satu kondisi:

- **Sprint 7+ user feedback** consistently flag UX issues that re-implement principles tidak cover — pivot to Option A (Stitch direct code-gen) for faster iteration.
- **Stitch quota / cost** approaches free tier limit — re-evaluate frequency of generation.
- **BRAND.md v3** evolution requires breaking change (mis. M3 surface tonal scale full adoption) — re-anchor design system primary.
- **Multi-locale scaling** post-pilot — `lib/labels.ts` need evolve to i18n library (i18next, FormatJS) instead of plain TypeScript constants.
- **Visual regression failures** post-Sprint 6.5+ baseline — re-audit re-implement strategy.

---

## Related

- ADR-001 (Supabase managed) — free-tier philosophy alignment
- ADR-005 (CSV Import) — RPC pattern reuse precedent (similar low-coupling)
- BRAND.md v1 (2026-04-27) — token source pre-Sprint 6
- BRAND.md v2 (2026-04-29) — adds §13 Microcopy Guidelines + v2 versioning entry
- `docs/sprint-6-ux-audit.md` — 13-route audit + top 3 selection rationale
- `docs/sprint-6-stitch-ids.md` — Stitch project + design system + 6 screens reference
- `apps/web/src/lib/labels.ts` — centralized i18n constants
