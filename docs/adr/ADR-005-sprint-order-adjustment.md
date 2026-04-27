# ADR-005: Sprint Order Adjustment — Ikut PRD Section 11 Apa Adanya

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Owner (BD), refer ke PRD section 11 + CLAUDE.md "Keputusan 3"
- **Context:** Pre-Sprint 1 gating per Checkpoint 1 (CLAUDE.md v2026-04-27)

---

## Context

CLAUDE.md "Keputusan 3" memberi otonomi ke Claude Code untuk adjust urutan sprint dari PRD section 11 kalau ada dependency teknis yang tidak terlihat saat PRD ditulis. Dengan revisi Checkpoint 1 (commit `4cc36d3`), ADR-005 dijadikan **wajib pre-Sprint 1** (bukan conditional) untuk memberi audit trail eksplisit: apakah urutan diikuti apa adanya, atau ada penyesuaian, plus reasoning.

Konteks pre-Sprint 1:
- PRD v0.2 sudah final dan ter-approve owner.
- Foundation (auth + RLS + task CRUD) belum dimulai — belum ada signal teknis baru.
- Constraint hard di CLAUDE.md: Sprint 1 = foundation, Sprint 6 = soft launch, F10 onboarding tidak boleh ditunda ke Phase 2.

ADR ini perlu dibuat **sekarang** (bukan di-defer) supaya Sprint 1 mulai dengan baseline urutan yang clear dan tertulis, bukan asumsi implicit.

## Decision

**Ikut urutan sprint PRD section 11 apa adanya, tanpa modifikasi.** Tidak ada sprint yang dipromote, di-defer, di-merge, atau di-split.

Urutan yang dikonfirmasi:

| Sprint | Minggu | Fokus | Features |
|---|---|---|---|
| 1 | 1-2 | Core foundation | F1, F2, F4, F11, F12 + N1, N3, N4, N7, N8 |
| 2 | 3 | Views | F3 (List/Kanban/Gantt), F14 |
| 3 | 4 | Productivity & visibility | F5, F6, F8, F13 |
| 4 | 5 | Onboarding & UX polish | F10, F15, N2 |
| 5 | 6 | Cowork & monitoring | F9, F16 |
| 6 | 7-8 | Testing, hardening, soft launch | — |

## Options yang dipertimbangkan

| Opsi | Pros | Cons | Cost |
|---|---|---|---|
| **A: Ikut PRD apa adanya** ✅ | Sudah ter-approve owner; Sprint 1 & 6 hard constraint di-respect; logis (foundation → views → analytics → polish → otomasi → hardening); zero re-planning effort | Tidak ada — kecuali muncul dependency teknis di Sprint 1 yang belum kelihatan | 0 |
| B: Promote Sprint 4 (onboarding/UX polish) ke Sprint 2 | Onboarding earlier = bisa user-test lebih cepat | Sprint 2 (Views) butuh task data untuk demo Kanban/Gantt — kalau onboarding dulu, belum ada konten task. Dependency reverse | Re-plan sprint 2-4, risiko Sprint 6 mundur |
| C: Defer Sprint 5 (Cowork) ke post-pilot / Phase 2 | Sprint 6 lebih ringan, soft launch bisa lebih cepat | Cowork = otomasi yang justify "pilot vs Asana" — tanpa Cowork, value prop pilot melemah. Juga Cowork daily run mencegah Supabase free-tier project pause (mitigasi di ADR-001) | Cowork mitigasi hilang, value prop pilot turun |

## Reasoning kenapa opsi A dipilih

1. **Hard constraints di CLAUDE.md sudah cocok dengan urutan PRD.** Sprint 1 = foundation, Sprint 6 = soft launch, F10 onboarding tidak boleh ditunda ke Phase 2 — ketiganya terpenuhi tanpa modifikasi.
2. **Tidak ada signal teknis baru.** PRD v0.2 final, ADR-001 (Supabase managed) dan ADR-002 (RLS strategy) sudah lock backend approach. Belum ada coding yang bisa expose dependency teknis tersembunyi yang justify reorder. Reorder tanpa data = guesswork.
3. **Cowork di Sprint 5 punya double role.** Selain otomasi MoM-to-task (PRD F9), Cowork daily run juga mitigasi auto-pause Supabase free tier setelah idle 7 hari (ADR-001 mention). Defer Cowork = lose dua benefit sekaligus.
4. **Owner sudah explicitly approve opsi ini** di session 2026-04-27 (context dari instruksi owner ke Claude Code).

## Consequences

### Positif
- Sprint 1 bisa langsung mulai begitu Checkpoint 1 di-approve owner — zero re-planning waktu.
- Semua acceptance criteria di PRD section 11 valid apa adanya.
- Tim pilot (owner + Claude Code) punya shared mental model yang sama dengan PRD.

### Negatif (yang harus di-mitigate)
- **Risk: dependency teknis tidak terlihat di Sprint 1 bisa muncul belakangan.** Mitigasi: ADR ini punya trigger eksplisit untuk revisit (di section bawah). Kalau muncul, tulis ADR-006 untuk dokumentasikan adjust.

## Trigger untuk revisit ADR ini

ADR ini harus di-revisit (tulis ADR-006 superseding) kalau salah satu kondisi terjadi:
- Sprint 1 menemukan dependency teknis yang force F3 (Views), F8 (Manager dashboard), atau F9 (Cowork) jadi blocker untuk feature lain.
- User feedback pertengahan pilot (Sprint 3-4) shift priority — misal Cowork urgensinya naik, atau onboarding harus diperketat earlier.
- Supabase free tier limit terlampaui lebih cepat dari estimasi → Cowork mitigasi (auto-pause prevention) jadi urgent earlier.

## Related

- PRD section 11 (Pilot Scope vs Production Roadmap)
- CLAUDE.md "Keputusan 3" + "Checkpoint 1" (commit `4cc36d3`)
- ADR-001 (Supabase managed — Cowork daily run mitigates auto-pause)
- ADR-002 (RLS strategy — locked di Sprint 1)
- ADR-003 (Gantt library — pre-Sprint 2, deferred sesuai Checkpoint 1)
- ADR-004 (Productivity dashboard query strategy — pre-Sprint 3, deferred sesuai Checkpoint 1)
