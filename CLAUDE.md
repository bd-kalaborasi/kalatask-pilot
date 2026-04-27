# CLAUDE.md — Trackr Pilot

_Last updated: 2026-04-27_

> File ini di-load otomatis oleh Claude Code di repo ini. Di sini ada konteks project, tech stack, sprint plan, coding conventions, dan **3 review checkpoint wajib** yang harus kamu ikuti sebelum lanjut sprint berikutnya.

---

## Project context

**Trackr** = internal task management pilot untuk 10-30 karyawan, alternatif gratis dari Asana/Monday selama validasi adopsi 6-12 bulan. Owner: Business Development (BD) team, bukan engineer. Pilot ini akan di-handoff ke tim IT untuk scale-up kalau adopsi terbukti.

**Source of truth:** `/docs/prd-task-management-internal.md` (versi v0.2, 16 functional + 8 non-functional requirements). **Selalu refer ke PRD untuk acceptance criteria.** Kalau ada konflik antara CLAUDE.md dan PRD, PRD menang — kecuali untuk hal yang eksplisit di-override di file ini.

**Goal pilot (bukan production):**
- Validasi adopsi user
- Collect data untuk justifikasi build vs buy di production
- Target development: 6-8 minggu (6 sprint)
- Target user: 10-30 orang, peak concurrent 30
- Zero recurring license cost (pakai Supabase free tier)

---

## Tech stack (locked, jangan diganti tanpa ADR)

- **Frontend:** React 18 + Vite + TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase managed free tier (Postgres 15 + Auth + Storage + Realtime)
- **Hosting frontend:** Vercel free tier
- **Otomasi:** Cowork desktop agent (untuk daily MoM-to-task sync)
- **Bahasa UI:** Bahasa Indonesia default, English toggle (lihat PRD N7)

---

## 3 keputusan yang di-defer ke kamu (Claude Code) — wajib tulis ADR

Owner project (BD) memberikan otonomi untuk 3 keputusan ini, tapi **wajib tulis ADR di `/docs/adr/`** sebelum mulai implementasi:

### Keputusan 1: Gantt library (frappe-gantt vs dhtmlx-gantt)

- **Default PRD:** frappe-gantt (lightweight, MIT)
- **Yang harus kamu evaluasi:**
  - Bundle size impact (target keep < 500KB initial JS)
  - License compatibility (dhtmlx-gantt GPL untuk free tier — bisa jadi masalah saat scale-up komersial)
  - Feature fit untuk pilot (read-only saja, dependency tidak perlu)
- **Rekomendasi default:** kalau ragu, pilih frappe-gantt. Pilot tidak butuh fitur kompleks.
- **Output:** ADR-003 sebelum mulai Sprint 2.

### Keputusan 2: Productivity dashboard query strategy (Edge Function vs DB view)

- **Default PRD:** Edge Function `/functions/v1/productivity-metrics`
- **Yang harus kamu evaluasi:**
  - Query complexity untuk 4 metrics (completion rate, velocity, on-time delivery, cycle time)
  - RLS enforcement: DB view + PostgREST otomatis enforce RLS, Edge Function harus manual implement
  - Performance target: < 3 detik untuk 10K task historical (PRD N1)
- **Rekomendasi default:** mulai dengan **DB view + PostgREST** (lebih simpel, RLS otomatis). Pindah ke Edge Function hanya kalau query terlalu kompleks atau butuh transformation yang tidak bisa di SQL.
- **Output:** ADR-004 sebelum mulai Sprint 3.

### Keputusan 3: Sprint sequencing dalam full repo

- Owner pilih "full repo, Claude Code yang plan" — kamu boleh adjust urutan sprint kalau ada dependency teknis yang tidak terlihat saat PRD ditulis.
- **Constraint yang TIDAK boleh diubah:**
  - Sprint 1 = foundation (auth + RLS + task CRUD). Tanpa ini, sprint lain tidak bisa.
  - Sprint 6 = soft launch (testing + hardening). Selalu di akhir.
  - F10 (onboarding) tidak boleh ditunda ke Phase 2 — critical untuk adopsi.
- **Output:** ADR-005 sebelum mulai Sprint 1 (wajib, bukan conditional). Dokumentasikan keputusan: ikut urutan PRD section 11 apa adanya, atau ada penyesuaian — disertai reasoning. Kalau "ikut PRD", ADR cukup pendek (1 paragraf konfirmasi).

---

## Review checkpoints — WAJIB stop dan tunggu approval owner

Owner project bukan engineer dan tidak akan code review per-PR. Sebagai gantinya, ada 3 checkpoint wajib di mana kamu **stop, kasih ringkasan, dan tunggu approval** sebelum lanjut. Jangan auto-merge atau auto-continue.

### Checkpoint 1: Sebelum mulai Sprint 1 (ADR-001/002/005 wajib selesai)

ADR di-stage per kebutuhan sprint, bukan semua di muka — supaya tiap keputusan ditulis dengan data nyata (bundle size aktual, schema final), bukan rubber stamp default. Spirit checkpoint tetap sama: untuk setiap ADR baru, stop → kasih ringkasan → tunggu approval.

Jadwal ADR:
- **Pre-Sprint 1 (sekarang):** ADR-001 (Supabase managed) dan ADR-002 (RLS strategy) sudah ada. ADR-005 (sprint sequencing) wajib selesai — dokumentasikan apakah urutan sprint mengikuti PRD section 11 atau ada perubahan, plus reasoning.
- **Pre-Sprint 2:** ADR-003 (Gantt library) — ditulis setelah scaffolding sudah ada, sehingga bundle-size impact-nya berbasis baseline aktual.
- **Pre-Sprint 3:** ADR-004 (productivity dashboard query strategy) — ditulis setelah schema final, sehingga query complexity-nya konkret.

Untuk setiap ADR baru, stop dan kasih ringkasan ke owner:
- Decision yang diambil
- Reasoning singkat (max 3 bullet)
- Risiko yang kamu lihat
- Tunggu approval sebelum lanjut ke implementasi sprint terkait.

### Checkpoint 2: Setelah Sprint 1 selesai (sebelum mulai Sprint 2)

Stop dan minta owner manual test:
- Login dengan 4 role berbeda (admin/manager/member/viewer)
- Test RLS: member coba akses task user lain → harus 403
- Test RLS: viewer coba edit task → harus 403
- Test create/edit/delete task per role
- Tunggu approval. Kalau ada bug RLS, fix dulu sebelum Sprint 2.

**Kenapa checkpoint ini critical:** RLS adalah security boundary. Kalau salah di Sprint 1, semua sprint setelahnya akan inherit bug. Owner bukan engineer, jadi dia perlu manual test, bukan baca kode.

### Checkpoint 3: Setelah Sprint 5 selesai (sebelum Sprint 6 / soft launch)

Stop dan minta owner:
- Review hasil Cowork agent dengan 5-10 sample MoM real (file ada di `/docs/sample-mom/`)
- Validasi false positive rate fuzzy match < 10%
- Validasi prompt template tidak invent action item yang tidak ada di MoM
- Tunggu approval sebelum soft launch ke tim early adopter.

---

## Coding conventions

- **TypeScript strict mode**, `noImplicitAny: true`. Tidak ada `any` kecuali sangat justified (tulis comment kenapa).
- **File naming:** kebab-case untuk file (`task-detail.tsx`), PascalCase untuk komponen React (`<TaskDetail />`).
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`).
- **DB access:** semua via Supabase client, tidak ada raw `fetch()` ke REST endpoint.
- **RLS testing:** setiap policy harus ada test di `/supabase/tests/`. Pakai `pgtap` atau Supabase CLI native.
- **Comments di kode:** Bahasa Indonesia OK kalau lebih jelas, English untuk istilah teknis. Jangan mix di 1 file.
- **Error messages ke user:** Bahasa Indonesia (lihat PRD N7).
- **Tidak boleh:**
  - Commit `.env*` (kecuali `.env.example`)
  - Commit secret (Supabase service role, OAuth credentials, DB URL)
  - Pakai `localStorage` untuk session — pakai Supabase Auth session
  - Hard-code role check di UI tanpa RLS backup di DB

---

## Domain knowledge yang harus kamu paham

- **4 role:** admin, manager, member, **viewer (manajemen, read-only)**. RLS enforced di DB level, BUKAN UI.
- **Hierarchy task:** project → task → subtask (max depth 2). Tidak ada subtask of subtask.
- **Status task:** todo / in_progress / review / done / blocked. `done` set `completed_at` via DB trigger.
- **Status project:** planning / active / on_hold / completed / archived. Hanya `active` yang dihitung di productivity dashboard.
- **Cowork agent** adalah service account terpisah, bukan user. Akses pakai service role key (server-only). Tidak punya UI login.
- **Free tier limits:**
  - Database: 500MB
  - Storage: 1GB
  - MAU: 50K
  - Project pause kalau idle > 7 hari (mitigasi: Cowork daily run prevents this)
- **"Bottleneck"** = task di status non-final > 3 hari tanpa update (default, configurable di project settings).
- **Fuzzy match threshold Cowork:** > 0.85 untuk update existing task, < 0.85 = create baru, score 0.5-0.7 = flag `needs_review`.

---

## How to run (lokal dev)

```bash
# 1. Setup
cp .env.example .env.local
# Fill .env.local dengan credential dari owner

# 2. Install dependencies
cd apps/web && npm install

# 3. Start Supabase lokal (butuh Docker)
supabase start

# 4. Apply migrations + seed
supabase db push
supabase db seed

# 5. Run frontend
npm run dev
```

---

## Data yang ada di repo (penting untuk kamu)

| File | Isi | Pakai untuk |
|---|---|---|
| `/docs/prd-task-management-internal.md` | PRD lengkap v0.2 | Acceptance criteria per feature |
| `/docs/adr/ADR-001-supabase-managed.md` | Kenapa Supabase managed | Konteks tech stack |
| `/docs/adr/ADR-002-rls-strategy.md` | RLS policy plan per tabel | Implementasi Sprint 1 |
| `/docs/adr/ADR-template.md` | Template untuk ADR baru | Tulis ADR-003, 004, 005 |
| `/docs/sample-mom/` | Sample MoM real (10 file) | Testing prompt Cowork Sprint 5 |
| `/supabase/seed/users.csv` | Fixture 8 dummy user (4 role, 2 team) | RLS pgTAP testing — BUKAN data real karyawan |
| `/.env.example` | Template env var | Setup |

**Kalau ada file yang missing di list di atas, STOP dan tanya owner.** Jangan invent data (especially `/docs/sample-mom/` dan `/supabase/seed/users.csv`).

---

## Anti-patterns yang harus dihindari

1. **Jangan rely on UI-only access control.** Setiap akses data harus ada RLS policy di DB, UI cuma reflect itu.
2. **Jangan commit secret.** Apapun. Cek `.gitignore` setiap kali ada file `.env*` baru.
3. **Jangan invent fitur di luar PRD.** Kalau lihat gap, tulis di `/docs/gaps.md` dan tanya owner — jangan langsung implement.
4. **Jangan over-engineer.** Pilot ini untuk 30 user, bukan 30K. Tidak butuh microservices, tidak butuh Redis cache, tidak butuh queue system. Postgres + Edge Function cukup.
5. **Jangan skip RLS test.** Setiap migration yang ubah RLS harus punya test. Critical untuk security.
6. **Jangan skip checkpoint.** Owner bukan engineer, dia perlu moment untuk catch up dan validasi. Auto-continue tanpa approval = trust break.
7. **Jangan hardcode threshold.** Bottleneck day count, workload "overloaded" threshold (default 10), fuzzy match threshold — semua harus configurable, simpan di tabel `app_settings`.

---

## Komunikasi dengan owner

Owner adalah BD, bukan engineer. Saat kamu kasih update atau minta input:

- **Ringkas dulu, detail belakangan.** Mulai dengan kesimpulan, baru elaborate.
- **Hindari jargon teknis** kecuali perlu (RLS, Edge Function, dll OK karena sudah di PRD; "race condition", "memoization", "tree-shaking" — jelaskan dulu).
- **Visual lebih baik dari kode.** Untuk demo Sprint, pakai screenshot/video, bukan code snippet.
- **Untuk decision:** kasih max 3 opsi dengan trade-off jelas, jangan open-ended.
- **Bahasa Indonesia santai-profesional**, mix istilah teknis Inggris OK.

---

## Quick reference: PRD section mapping

| Sprint | Features | PRD section |
|---|---|---|
| Sprint 1 | F1, F2, F4, F11, F12 + N1, N3, N4, N7, N8 | Foundation |
| Sprint 2 | F3 (List/Kanban/Gantt), F14 (project lifecycle) | Views |
| Sprint 3 | F5, F6, F8, F13 | Productivity |
| Sprint 4 | F10 (onboarding), F15 (CSV import), N2 (PWA) | UX polish |
| Sprint 5 | F9 (Cowork integration), F16 (admin usage) | Otomasi |
| Sprint 6 | Testing, hardening, soft launch | Hardening |

Untuk detail per feature, **selalu refer ke `/docs/prd-task-management-internal.md`**.

---

## Changelog

- **2026-04-27:** Clarify Checkpoint 1 gating — ADR-001/002/005 wajib pre-Sprint 1; ADR-003 pre-Sprint 2 (butuh data bundle size); ADR-004 pre-Sprint 3 (butuh schema final). ADR-005 dijadikan wajib (bukan conditional). Owner approval untuk Sprint 1 mulai.
- **2026-04-27 (later):** Fix F6/F10 mislabel — F6 = Bottleneck view (PRD line 116), F10 = Onboarding wizard. CLAUDE.md line 65 dan PRD line 801 sebelumnya keliru pakai F6 untuk onboarding. Affected: CLAUDE.md (1 line), PRD section 11 Sprint 4 (1 line fix + 1 line redundant deleted).
- **2026-04-27 (later):** Owner approval explicit untuk Sprint 1 mulai. Checkpoint 1 cleared (ADR-001/002/005 Accepted; ADR-003/004 deferred sesuai gating). Baseline foundation: theme.css + globals.css + tailwind.config.ts di apps/web/. Belum ada Vite scaffolding.
- **2026-04-27 (later):** Fix path references di CLAUDE.md — /docs/decisions/ → /docs/adr/, /docs/PRD.md → /docs/prd-task-management-internal.md. Sebelumnya inconsistent dengan actual filesystem.
