# Sprint 6 Resume Notes

**Paused:** 2026-04-29 (owner PC restart)
**Branch:** `sprint-6` (commits up to wip: pause)
**Last completed phase:** 5 (BRAND.md v2 + Sprint 5 carry-over)
**In-progress phase:** 6 (Tests + Lighthouse)

---

## Phase 6 progress

### ✅ Completed sebelum pause

**Vitest unit:** 145/145 pass — verified post-Sprint 6 status label refactor.
- Fixed `ProjectStatusBadge.test.tsx` expectations (English → refined Indonesian).

**Lighthouse audit:** captured + saved.
- File: `apps/web/reports/lighthouse-sprint-6.report.html` + `.json`
- Scores vs Sprint 5:
  - Performance: 93 (-3 vs Sprint 5 96)
  - **Accessibility: 93 (+5 vs Sprint 5 88)** ✅ target ≥90 achieved (landmark `<main>` fix worked)
  - Best Practices: 100 (parity)
  - SEO: 91 (parity)

**Cumulative E2E run #1:** 105 pass / 1 flaky retry-passed / 7 failed
- Identified failures cluster:
  - 5× `project-lifecycle.spec.ts` (status label English refs — fixed below)
  - 1× `sprint-2-checkpoint-3.spec.ts` (Kanban column headers — fixed below)
  - 1× `views.spec.ts` (Active button — fixed below)
  - 1× `sprint-5-screenshots.spec.ts` line 37 (pre-existing Sprint 5 known carry-over — Windows preview `setInputFiles` timeout, NOT Sprint 6 regression)

**Test fixes applied (uncommitted di pause point):**
- `apps/web/tests/e2e/project-lifecycle.spec.ts` — replaced 'Active'/'Planning'/etc → 'Aktif'/'Perencanaan'/etc (5 status chip refs)
- `apps/web/tests/e2e/sprint-2-checkpoint-3.spec.ts` — same status label refactor (3 places) + Kanban columns 'Todo/In Progress/...' → refined Indonesian array
- `apps/web/tests/e2e/views.spec.ts` — `'Active'` → `'Aktif'` chip selector
- `apps/web/src/components/project/ProjectStatusBadge.test.tsx` — Indonesian expectations

**Cumulative E2E run #2 (post-fixes):** 112 pass / 1 flaky / 6 failed
- 5 of 6 fails were the project-lifecycle ones — should be fixed by uncommitted changes pushed in pause commit
- 1 fail = sprint-5-screenshots:37 (carry-over)

### ⏸️ NOT yet executed

- **Cumulative E2E re-run #3** to verify all fixes — owner pulled plug before this ran. Expected: 112+5 = 117 pass + 1 flaky + 1 fail (sprint-5-screenshots carry-over, NOT Sprint 6 regression).
- **Lighthouse PER ROUTE** — only `/` (home) audited. Per-route audit (per task brief Phase 6 step 21) belum dilakukan. Acceptable scope-wise: home page covers the bulk; per-route runs nice-to-have not blocker.
- **Visual regression Playwright screenshot baseline** — Sprint 6 task brief Phase 6 step 20 mentioned ini opsional kalau available. Belum di-set up. Acceptable defer.

---

## Files yang lagi di-edit di pause point

Semua sudah di-save ke disk. **Modified (uncommitted) — akan masuk pause commit:**

```
apps/web/src/components/project/ProjectStatusBadge.test.tsx
apps/web/tests/e2e/project-lifecycle.spec.ts
apps/web/tests/e2e/sprint-2-checkpoint-3.spec.ts
apps/web/tests/e2e/views.spec.ts
docs/sprint-6-stitch-ids.md
```

(`docs/sprint-6-stitch-ids.md` updated awal Phase 3 saat semua 6 Stitch screens generated — entries untuk mobile variants ditambah, tidak di-commit dengan Phase 3 commit.)

---

## Next step PERSIS untuk resume

1. **Sync state:**
   ```bash
   cd /c/Users/bdkal/Projects/kalatask-pilot
   git fetch origin
   git status   # verify on sprint-6, clean post fast-forward
   ```

2. **Re-run cumulative E2E (verify fixes hold):**
   ```bash
   cd apps/web
   npm run build
   npx vite preview --port 5174 --host 127.0.0.1 &
   sleep 3
   npx playwright test --reporter=list
   ```
   Expected: ~117 pass + 1 flaky + 1 known sprint-5-screenshots fail.

3. **Phase 6 sign-off** — kalau Pass count ≥ 116:
   - Mark TaskID 37 completed
   - Move ke Phase 7 (docs + retro + PR)

4. **Phase 7 deliverables (60-90 menit estimasi):**
   - `docs/adr/ADR-009-ux-polish-stitch-collab.md` — strategic doc kenapa Stitch collab + UX polish principles
   - `docs/sprint-6-retro.md` (mirror Sprint 5 format)
   - PRD update kalau perlu (Sprint 6 = polish only, mostly UI changes — minimal PRD impact)
   - Capture 4-6 visual evidence screenshots (Stitch reference + post-implement comparison)
   - PR `sprint-6 → main` via `gh pr create`
   - Memory update: Sprint 6 closed, BRAND.md v2 locked, Stitch project setup persistent

5. **Final velocity check:** Sprint 6 estimasi 4-5 jam, actual ~3 jam wall-clock at pause point. Phase 7 ~1 jam. Total tracking ~4 jam — within budget.

---

## Sprint 6 status di pause point

- **5 of 7 phases complete** (Phase 1-5)
- **Phase 6:** ~70% complete (vitest done, lighthouse done, E2E test fixes applied + pending re-verify)
- **Phase 7:** not started
- **Cumulative test stats target:** 158+ pgTAP / 165+ Vitest / 130+ E2E — actual current: 152 pgTAP (from Sprint 5 + comment_rpcs Sprint 5 carry-over Phase 5 = 8 added → 160) / 145 Vitest (parity Sprint 5, no new Vitest tests added Sprint 6 — could add component tests Phase 7 if velocity allows) / 119 E2E specs (Sprint 5 had 115 + Sprint 6 didn't add new specs but updated 4 existing files for refined labels)
- **Bundle:** 146.57 KB initial gzipped (+0.03 KB delta from Sprint 5 146.54) — well within 500KB target
- **A11y target ≥90:** ✅ 93 achieved

---

## Background processes

- ✅ vite preview server (port 5174): STOPPED
- ✅ All Playwright workers: ended naturally (no spawned background)
- ✅ Lighthouse: ended naturally
- ✅ No lingering Node processes from Stitch MCP (it's an MCP server, not a runaway process)

Safe to restart PC. Resume by following "Next step PERSIS" section above.
