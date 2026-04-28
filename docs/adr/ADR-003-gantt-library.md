# ADR-003: Gantt Library Selection

- **Status:** Accepted
- **Date:** 2026-04-28
- **Deciders:** Claude Code (proposer), Owner BD (approver)
- **Context:** Pre-Sprint 2 — F3 (Three Views: List + Kanban + Gantt read-only) butuh library Gantt sebelum implementasi mulai. Per PRD §11 Sprint 2 + CLAUDE.md Keputusan 1.

---

## Context

PRD F3 (acceptance criteria line 205) butuh Gantt chart **read-only** di pilot, drag-resize ditunda Phase 2. Schema task sudah punya kolom `deadline (DATE)`, `estimated_hours (int)`, `start_date (DATE)` untuk Gantt rendering (lihat migration `20260427150000_create_tasks_table.sql`). Task dependencies (blocked-by, finish-to-start) **out of scope pilot** (PRD §3.3 line 179).

Constraint pilot:
- **PRD N1:** initial JS budget < 500KB. Sprint 1 baseline = 393KB gzipped → ada budget ~107KB sisa untuk Gantt + future features.
- **License:** pilot internal pakai apa saja, tapi Phase 2 commercial scale-up berarti license harus compatible dengan closed-source product.
- **Feature minimal:** read-only saja. Tidak butuh dependency/critical path/auto-schedule.
- **Stack fit:** React 18 + TS strict + Vite + Tailwind + shadcn (existing).

Default PRD §13 line 423 list 2 kandidat: **frappe-gantt** (lightweight, MIT) vs **dhtmlx-gantt** (lebih kaya, ada free tier). ADR ini lock pilihan dengan data konkret.

## Decision

**Adopt `frappe-gantt` v1.2.2** sebagai Gantt library untuk pilot.

Pin version: `"frappe-gantt": "1.2.2"` di `apps/web/package.json` (locked, bukan caret) sampai Sprint 2 stabil — frappe v1.x recent major rewrite, hindari surprise upgrade.

Kalau Sprint 2 implementasi finds critical blocker (rendering bug, API gap untuk acceptance criteria), trigger ADR-003 revisit dengan dhtmlx-gantt sebagai fallback. Tidak default fallback — ADR baru wajib justify.

## Options yang dipertimbangkan

| Opsi | License | Bundle (minified raw) | TS support | Stars | Last release | Cost |
|---|---|---|---|---|---|---|
| **A: frappe-gantt v1.2.2** ✅ | MIT | ES 64KB / UMD 48KB JS + 7KB CSS | ❌ no built-in (community/manual decl) | 5,947 | 2026-02-25 | Free, no commercial restriction |
| B: dhtmlx-gantt v9.1.3 | GPL-2.0 (free) / commercial license berbayar | 608KB JS + 143KB CSS | ✅ built-in (`dhtmlxgantt.d.ts`) | 1,773 | 2026-03-16 | Free **only kalau product GPL**; commercial license kontak vendor untuk pricing |
| C: Custom build dari nol (D3/SVG) | Proprietary | Variable, depends scope | TS native | — | — | Dev time tinggi (~2 sprint), QA overhead |

### Bundle size impact (gzipped estimate)

Raw size ~3-4x lebih besar dari gzipped. Konservative estimate:
- frappe-gantt ES JS 64KB raw → ~20KB gzipped + 7KB CSS raw → ~2KB gzipped = **~22KB total gzipped**
- dhtmlx-gantt 608KB raw → ~150KB gzipped + 143KB CSS raw → ~28KB gzipped = **~178KB total gzipped**

Sprint 1 baseline 393KB gzipped:
- + frappe = **~415KB total** (83% dari 500KB N1 budget — aman)
- + dhtmlx = **~571KB total** (BLOWS PRD N1 500KB budget)

## Reasoning kenapa Option A dipilih

1. **License safety untuk Phase 2.** dhtmlx-gantt GPL-2.0 berarti integrasi di product **memaksa product GPL juga** (copyleft viral). Closed-source commercial scale-up Phase 2 (skenario di ADR-001 + CLAUDE.md "scale-up post-pilot") ter-block tanpa beli commercial license dhtmlx (pricing tidak public, kontak vendor). frappe-gantt MIT permissive — zero license friction.

2. **Bundle size fit budget.** Calculation di atas: frappe brings total ~415KB (well under 500KB), dhtmlx brings 571KB (blows budget by 14%). PRD N1 line 150 explicit "dashboard load < 2 detik untuk 1.000 task" — bigger bundle slower TTI, especially di pilot user yang banyak akses dari HP (PRD N2 line 151).

3. **Feature fit minimal scope.** PRD F3 line 205 spec read-only: bar muncul kalau punya deadline + estimated_hours, milestone titik kalau tanpa estimasi. Tidak butuh dependency lines, drag-resize, critical path, auto-schedule. dhtmlx 75% featurenya berlebihan untuk pilot. frappe minimal sudah cover acceptance criteria.

4. **Active maintenance.** Last push frappe `2026-04-06` (~3 minggu lalu), dhtmlx `2026-03-16`. Both active. frappe lebih banyak stars (5,947 vs 1,773) → lebih besar community untuk troubleshooting issue.

5. **Konsisten dengan PRD §13 default + ADR-001 free-tier philosophy.** PRD §13 line 423 explicit suggest frappe sebagai default. ADR-001 lock Supabase managed free-tier untuk zero recurring cost — pakai dhtmlx commercial license akan kontradiksi cost discipline.

## Consequences

### Positif
- **Zero license cost** — MIT permissive, kompatibel commercial Phase 2.
- **Bundle headroom** — sisa ~85KB budget untuk Sprint 3+ features (productivity dashboard, search, dst).
- **Smaller surface area** — fewer features = fewer bugs, easier debugging untuk pilot tim 1 dev.
- **Community established** — 5.9K stars, popular untuk side projects + small SaaS, banyak example.

### Negatif (mitigasi)
- **No built-in TS types** — frappe-gantt tidak ship `.d.ts`. Mitigasi: tulis declaration file manual minimal di `apps/web/src/types/frappe-gantt.d.ts` (cover yang dipakai saja: constructor, options, render method). Effort: ~30 menit one-time. Atau cek community DefinitelyTyped — kalau ada `@types/frappe-gantt`, install. Verify saat Sprint 2 Step 6.
- **Phase 2 upgrade path butuh re-eval kalau dependencies needed.** PRD §3.3 line 179 explicit "Phase 2 pakai library lebih kaya (dhtmlx-gantt) atau custom build" — pilot cukup frappe, Phase 2 kalau perlu dependencies pivot.
- **frappe v1.x recent rewrite (Feb 2026).** API potentially berbeda dari v0.x community examples online. Mitigasi: pin version `1.2.2`, pakai official docs (https://github.com/frappe/gantt) sebagai source of truth, bukan tutorial blog post outdated.
- **CSS specificity vs Tailwind.** frappe-gantt ship CSS bawaan untuk styling chart. Bisa conflict dengan Tailwind utilities. Mitigasi: scope frappe styles ke wrapper div, audit visual saat Sprint 2 Step 6 implementation.

## Trigger untuk revisit ADR ini

ADR-003 harus di-evaluate ulang (tulis ADR-007 atau update) kalau salah satu kondisi:

- **Sprint 2 implementasi finds API gap** untuk acceptance criteria F3 line 205 (mis. milestone rendering tidak supported native, butuh workaround besar > 1 hari).
- **Bundle size bloat regresi** — initial JS gzipped > 500KB (PRD N1 hit) setelah Sprint 2 ship.
- **Phase 2 scope expand** include task dependencies, drag-resize, critical path — frappe coverage tidak cukup, evaluate pivot ke dhtmlx commercial atau custom build (PRD §3.3 line 179 explicitly anticipate ini).
- **Critical security CVE** di frappe-gantt yang tidak di-patch dalam reasonable window.
- **frappe-gantt project archived / unmaintained** — last push > 6 bulan, no response on critical issue.

## Related

- PRD §3.1 F3 (line 113, 198-205) — Three Views acceptance criteria
- PRD §3.3 (line 179) — task dependencies out of scope pilot, Phase 2 anticipated
- PRD §3.2 N1 (line 150) — performance + bundle budget
- PRD §13 (line 423) — frappe-gantt sebagai default suggestion
- CLAUDE.md "Keputusan 1" — Gantt library evaluation deferred ke Claude Code
- ADR-001 (Supabase managed) — free-tier philosophy alignment
- frappe-gantt repo: https://github.com/frappe/gantt
- frappe-gantt npm: https://www.npmjs.com/package/frappe-gantt (v1.2.2 published 2026-02-25)
- frappe-gantt latest commit: 2026-04-06 (active maintenance, verified via GitHub API)
- dhtmlx-gantt repo: https://github.com/DHTMLX/gantt
- dhtmlx-gantt npm: https://www.npmjs.com/package/dhtmlx-gantt (v9.1.3, GPL-2.0)
