# ADR-001: Pakai Supabase Managed (free tier) untuk Backend Pilot

- **Status:** Accepted
- **Date:** 2026-04-27
- **Deciders:** Owner (BD), refer ke PRD section 6 + 10
- **Context:** PRD v0.2

---

## Context

Pilot Trackr butuh backend yang menyediakan: Postgres (relational DB), Auth (multi-role), Storage (file attachment), Realtime (live update Kanban + komen). Skala awal: 10-30 user, target 6-12 bulan validasi.

Constraints:
- Zero recurring license cost selama pilot
- BD bukan engineer — backend yang minim ops
- Schema harus portable (bisa migrate kalau scale-up)
- Pilot harus bisa di-handoff ke IT untuk production

## Decision

Pakai **Supabase managed (free tier)** sebagai backend pilot, dengan migration path ke Supabase Pro ($25/bulan flat) atau self-hosted Postgres saat scale-up.

## Options yang dipertimbangkan

| Opsi | Cost (Year 1) | Pros | Cons |
|---|---|---|---|
| **Supabase managed free** ✅ | $0 | All-in-one (DB + Auth + Storage + Realtime), zero ops, free tier cukup untuk 30 user | Region Singapore (data residency), no SLA, no auto backup, project pause kalau idle 7 hari |
| Supabase self-hosted (Docker di VM kantor) | ~$50-100/bulan VM cost | Data di Indonesia, full control | Butuh DevOps effort, BD tidak bisa manage sendiri |
| Firebase | $0 (Spark plan) | Google ecosystem, generous free tier | NoSQL (Firestore) tidak fit untuk relational task model, vendor lock-in tinggi |
| Custom stack (Postgres VM + Auth0 + S3) | $30-50/bulan | Full flexibility | 3x ops effort, tidak feasible untuk BD tanpa IT support |
| Asana/Monday/ClickUp | $2,600+/tahun untuk 20 user | Production-ready | Bertentangan dengan goal "validate before commit" |

## Reasoning kenapa Supabase managed dipilih

1. **Free tier limit cukup untuk pilot:** 500MB DB, 1GB storage, 50K MAU. Untuk 30 user dengan 50 task average per user dan 10MB attachment limit per file, ini lebih dari cukup (estimasi konsumsi Year 1: ~150MB DB, ~200MB storage).
2. **Schema portable:** Postgres standard. `pg_dump` dari pilot → `pg_restore` ke production. Tidak ada lock-in di level data.
3. **Migration path jelas:** scale-up → Supabase Pro ($25/bulan flat, bukan per user) atau self-host Supabase di infra perusahaan via Docker Compose.
4. **All-in-one:** Auth + Storage + Realtime di-include. Tidak perlu integrate 3 service terpisah.
5. **RLS native di Postgres:** security boundary di DB level, bukan UI. Best practice untuk multi-role app.

## Consequences

### Positif
- Setup time minimal (< 1 jam untuk create project)
- Zero recurring cost selama pilot
- Standard Postgres = mudah handoff ke IT

### Negatif (yang harus di-mitigate)
- **Data residency:** region Singapore. **Pending konfirmasi IT** apakah comply dengan policy perusahaan. Jika tidak comply, ADR ini harus di-revisit dan switch ke self-hosted. _Ini hard blocker — tidak boleh mulai coding sebelum konfirmasi._
- **No auto backup di free tier:** mitigasi dengan weekly `pg_dump` via GitHub Action ke private repo (script di PRD Lampiran A).
- **No SLA:** acceptable untuk pilot. Saat scale-up, evaluasi Supabase Pro yang punya SLA.
- **Project pause kalau idle 7 hari:** untuk pilot dengan user aktif harian + Cowork daily run, ini tidak akan terjadi. Monitor di Supabase dashboard.
- **Limit free tier bisa terlampaui:** mitigasi dengan F16 (admin usage monitoring), alert di > 70% threshold.

## Trigger untuk revisit ADR ini

ADR ini harus di-revisit jika salah satu kondisi terjadi:
- IT confirm data residency policy melarang data di Singapore
- Pilot user melebihi 50 orang (free tier limit MAU masih jauh, tapi performance shared CPU bisa jadi bottleneck)
- DB size > 80% dari 500MB limit selama 2 bulan berturut-turut
- Manajemen approve scale-up ke production

## Related

- PRD section 6 (Architecture)
- PRD section 10 (Risiko: data residency, free tier limit, no backup)
- ADR-002: RLS Strategy (built on top of decision ini)
