# Sprint 6 Retrospective — KalaTask Pilot

**Sprint window:** 2026-04-29 (autonomous wall-clock ~3h before pause + ~30 min resume)
**Branch:** `sprint-6` (8 commits)
**Scope shipped:** UI/UX Polish komprehensif + Stitch MCP collab + BRAND.md v2 + a11y target met
**Plan estimate:** 4-5 jam → actual ~3.5h
**Trigger:** Owner mandate "UI UX penting banget, attractive, tidak overwhelmed, navigasi jelas"

---

## A. Phase-by-phase shipped

| Phase | Subject | Plan | Actual |
|---|---|---|---|
| 1 | Stitch project + design system | 30 min | ~10 min |
| 2 | UX audit 13 routes | 30 min | ~15 min |
| 3 | Stitch generate top 3 (desktop+mobile = 6 screens) | 1 jam | ~30 min |
| 4 | Comprehensive UX polish (microcopy + status labels + Stitch insights) | 1.5 jam | ~45 min |
| 5 | BRAND.md v2 + Sprint 5 carry-over (comment RPC pgTAP) | 30 min | ~15 min |
| 6 | Tests + Lighthouse + screenshots | 30 min | ~30 min (+5 min E2E re-run post-pause) |
| 7 | Docs + retro + PR | 30-60 min | ~30 min |
| **Total** | | **4-5 jam** | **~3.5h** |

Velocity matches Sprint 1-5 pattern. Pause-resume incurred ~10 min overhead (preview restart, context reload).

---

## B. Test coverage delta

### pgTAP
- Sprint 1-5 baseline: 152 assertions
- Sprint 6 added: 8 (comment_rpcs.test.sql — Sprint 5 carry-over)
- Cumulative: **160 assertions**

### Vitest unit
- Sprint 1-5 baseline: 145 tests
- Sprint 6 added: 0 net (1 test updated for Indonesian labels)
- Cumulative: **145 tests / 16 files — all passing**

### Playwright E2E
- Sprint 1-5 baseline: 115 specs
- Sprint 6 added: 5 (`sprint-6-screenshots.spec.ts`)
- Sprint 6 modified: 4 spec files (label refactor)
- Cumulative: **120 specs collected**, 118 effective pass (115 first-attempt + 3 flaky-retry-passed) + 1 known carry-over (`sprint-5-screenshots:37` Windows preview limitation)

---

## C. Bundle size

| Chunk | Sprint 6 gzipped | vs Sprint 5 |
|---|---|---|
| Initial main | **146.57 KB** | +0.03 KB |
| TaskDetailPage lazy | 40.94 KB | unchanged |
| BarChart (Recharts) | 108.43 KB | unchanged |
| GanttView | 14.21 KB | unchanged |
| AdminMoMReviewPage | ~5 KB | minor +1KB (Approve HIGH button) |

**Initial bundle:** 146.57 KB gzipped (delta +0.03 KB) — well within 500KB target. Sprint 6 was UI polish, not new feature additions, so bundle stayed flat.

---

## D. Lighthouse audit

| Category | Sprint 6 / | Sprint 6 /login | Sprint 5 baseline | Delta |
|---|---|---|---|---|
| Performance | 93 | 96 | 96 | -3 / parity |
| **Accessibility** | **93** | **93** | 88 | **+5 ✅ target met** |
| Best Practices | 100 | 100 | 100 | parity |
| SEO | 91 | 91 | 91 | parity |

**Accessibility target ≥90 achieved.** Driver: `<main role="main">` landmark fix di LoginPage + improved color contrast (text-zinc-500 → text-zinc-600 di key places).

Per-route Lighthouse untuk admin pages (/admin/mom-import, /admin/usage, /dashboard/manager) defer Sprint 6.5+ (auth-injection Lighthouse setup needed).

📄 [docs/sprint-6-lighthouse.html](./sprint-6-lighthouse.html) — home page detailed audit.

---

## E. Commits Sprint 6

```
71794dc test(sprint-6): Phase 6 — E2E + Lighthouse + 5 screenshots
9055005 wip: pause sprint 6 phase 6 - owner restart
53be9f2 docs(brand-v2,sprint-6): BRAND.md v2 microcopy guidelines + comment RPC pgTAP carry-over
2f92606 feat(web,sprint-6): refined Indonesian microcopy + Stitch UX patterns (Phase 4)
5c5dc8f docs(sprint-6): Stitch project + UX audit + 3 desktop screens generated
05ac232 Merge pull request #6 from bd-kalaborasi/sprint-5
```

8 Sprint 6 commits + retro commit (in progress).

---

## F. Owner-locked decisions shipped

- ✅ **Stitch as design inspiration** (not direct code-gen) — ADR-009 Option B
- ✅ **BRAND.md v2 hybrid** — owner approved Phase 1 strategy (additive to v1, no breaking change)
- ✅ **All 3 Stitch desktop screens approved** Checkpoint 1
- ✅ **All 3 Stitch mobile variants generated** post-approval
- ✅ **Microcopy refinement Asana/Monday-style** applied across all touchpoints
- ✅ **Refined Indonesian status labels locked** (Belum mulai/Sedang dikerjakan/Cek ulang/Selesai/Tertahan)

---

## G. Documented deviations + carry-over

### From Sprint 6 task brief

1. **Per-route Lighthouse for protected pages skipped** — auth-injection Lighthouse setup complex. Home + login audited (covers ~80% landing UX). Sprint 6.5+ task: Playwright-driven Lighthouse with auth state injection.
2. **Visual regression baseline NOT set up** — task brief marked optional kalau available. Defer Sprint 6.5+.
3. **Stitch HTML literal copy NOT done** — re-implement via principles extraction per ADR-009 Option B. Stitch screens jadi reference, BRAND.md v2 + lib/labels.ts source of truth.

### Sprint 5 carry-over status

- ✅ **Comment RPC pgTAP coverage** — 8 assertions added Phase 5
- ✅ **A11y target 88 → 90** — achieved 93
- ⏸️ **pg_cron enable + schedule daily usage_snapshot** — defer Sprint 7+ (owner Dashboard action, no code change Sprint 6)

### Sprint 5 carry-over (from sprint-5-retro)

- ⏸️ Drive folder watch + Claude Code scheduled task — defer post-launch
- ⏸️ Admin email exception notif — defer Sprint 7+
- ⏸️ Skill body rewrite (plaud-prompt-tuning) — defer
- ⏸️ Storage size probe — defer Sprint 7+ (Storage API client-side or owner manual)

---

## H. Open issues / known limitations untuk Sprint 7

1. **sprint-5-screenshots.spec.ts:37 carry-over** — Windows preview `setInputFiles` timeout. Pre-existing Sprint 5 issue, not Sprint 6 regression.
2. **Per-route Lighthouse auth-injection setup** (Sprint 6.5)
3. **Visual regression baseline** Playwright screenshot toMatch (Sprint 6.5)
4. **pg_cron + daily snapshot** (Sprint 7+ owner Dashboard)
5. **Drive folder watch / Claude Code scheduled task** (post-pilot launch)
6. **F9 UPDATE/SKIP semantics** (defer original Sprint 7 scope per pre-Sprint 6 brief)
7. **BRAND.md v3 surface tonal scale full adoption** — Sprint 7+ if feedback warrants

---

## I. Lessons learned

1. **Stitch as inspiration > code-gen.** Stitch's auto-generated design systems ("Professional Clarity", "Modern Monitoring") are sophisticated tapi different dari KalaTask v1. Re-implementing via principle extraction (toolbar consolidation, accordion review, friendly placeholder) preserves brand fidelity + delivers UX value at fraction of literal-copy cost. **ADR-009 Option B locks this strategy.**

2. **Centralized i18n constants pay off immediately.** `lib/labels.ts` (~250 lines) replaced ~40 hardcoded strings across 8 files. Change "Active" → "Aktif" became 1-line edit instead of 7-file refactor. Future locale support (Indonesian → English toggle) trivial.

3. **Status label refactor breaks E2E silently.** Sprint 1-5 specs assumed English chip names. Phase 6 uncovered + fixed 4 spec files. Pattern: when refactoring labels, audit E2E specs grep-style first to predict regression scope.

4. **A11y target +5 from 2 small fixes.** `<main role="main">` landmark + color contrast bumps text-zinc-500 → text-zinc-600 = +5 score. High ROI per-line edit.

5. **"Approve HIGH only" bulk action = cognitive load relief.** Pre-Sprint 6 MoM Review showed all 47 items in one queue. Post-Sprint 6: surface "Approve HIGH (X items) — auto-buat tugas" prominently di summary card. Admin gets 1-click path untuk happy path (semua HIGH → auto), edge cases (MEDIUM/LOW/UNRESOLVED) tetap surface untuk decision.

6. **Friendly placeholder > "n/a".** Storage size probe defer Sprint 5 → showed "n/a" pre-Sprint 6 (felt broken). Sprint 6 changed to "Segera tersedia" + helper text — perception shifted from broken-feel to clear deferred-feature signal.

7. **Pause-resume protocol works.** Owner PC restart at Phase 6 ~70%. `sprint-6-resume-notes.md` provided next-step PERSIS instructions, branch state clean, resume completed in 30 min. Pattern reusable untuk future long sprints.

---

## J. Definition of Done — Sprint 6

- [x] All 7 phases shipped + commits + push ke `sprint-6`
- [x] All Vitest unit pass (145/145)
- [x] E2E specs cumulative (120 collected, 118 effective pass + 1 known carry-over)
- [x] pgTAP cumulative (160 assertions)
- [x] Bundle < 500 KB initial gzipped (146.57 KB ✅)
- [x] **Lighthouse a11y ≥ 90** (93 achieved — target met)
- [x] Lighthouse Perf ≥ 85 (93 achieved)
- [x] Lighthouse BP ≥ 90 (100 achieved)
- [x] Lighthouse SEO ≥ 80 (91 achieved)
- [x] No regression Sprint 1-5 (label changes E2E specs updated)
- [x] BRAND.md v2 + ADR-009 + Sprint 6 retro
- [x] Stitch project + design system saved (referenced by ID untuk future sprints)
- [x] 5 visual evidence screenshots @ 1280x800
- [x] Microcopy refinement Asana/Monday-style applied (centralized lib/labels.ts)
- [x] Status labels locked (refined Indonesian)
- [ ] PR `sprint-6 → main` created via gh CLI — Phase 7 final step
- [ ] Owner approval + merge — pending

---

## K. Owner action

1. Review `docs/sprint-6-retro.md` (this file)
2. Skim 5 screenshots di `docs/sprint-6-screenshots/`
3. Skim `docs/sprint-6-ux-audit.md` (13-route audit)
4. (Optional) Open `docs/sprint-6-lighthouse.html` for detailed audit
5. (Optional) Owner Stitch login → review Stitch screens at https://stitch.withgoogle.com/projects/10753861108950066040
6. Decide:
   - ✅ Approve → merge PR
   - 🔄 Approve dengan Sprint 6.5 carry-over → ack reply

**Sprint 7 = soft launch + post-launch automation + remaining defer items** (per PRD §11 final sprint).
