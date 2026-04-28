# Sprint 4 Plan — KalaTask Pilot

**Sprint window:** target 2-3 minggu kalender (autonomous mode estimate 4-6 jam wall-clock + wrap-up)
**Branch:** `sprint-4` (dari main, commit `534e898`)
**Scope locked:** PRD §3.1 F10 + F15 + N2, PRD §11 Sprint 4
**ADR baseline:** ADR-001/002/003/004/005/006

---

## A. Scope (locked)

### F10 — Onboarding Wizard + Sample Data + Empty States + Tooltip

PRD §3.1 line 127-131 + §3.2 Feature 6 line 243-262.

**4 sub-components:**
1. **Sample data pre-populated** saat user signup pertama kali:
   - 1 sample project "🌱 Project Contoh — Hapus saja" (`is_sample=true`)
   - 5 sample task variasi status (todo / in_progress / review / done / blocked)
   - 1 sample comment di salah satu task (defer kalau `comments` table belum ada — Sprint 5+ scope)
   - User bisa delete kapan saja tanpa konsekuensi
2. **Wizard tour 5 langkah** — overlay tutorial saat first login:
   - (a) Bikin task
   - (b) Switch view ke Kanban
   - (c) Tulis komen (defer kalau `comments` belum ada — fallback step ke fitur lain)
   - (d) Attach file (defer — Sprint 5+ Storage scope)
   - (e) Lihat workload (existing Sprint 3)
3. **Empty state setiap view** — instruksi singkat + CTA per view
4. **Tooltip first-time** — fitur kompleks (Gantt, drag-drop, @mention)

**Acceptance criteria (PRD line 256-261):**
1. **AC-1:** Given first login, sample project + tasks otomatis ada, tutorial overlay muncul.
2. **AC-2:** Given user click "Skip", tutorial closed tapi tombol "Tutorial" tetap accessible di profile menu.
3. **AC-3:** Given user delete sample project, project tidak muncul lagi (soft delete `status='archived'` — pakai schema existing).
4. **AC-4:** Given semua view ada empty state dengan instruksi.
5. **AC-5:** Tooltip tampil maksimal 1× per fitur per user (tracked di `users.onboarding_state` JSONB).

### F15 — CSV Import

PRD §3.1 line 145 + §3.2 Feature 8 line 282-296.

**Template kolom (mandatory header):**
```
title, description, assignee_email, project_name, status, priority, deadline, estimated_hours
```

**Acceptance criteria (PRD line 291-296):**
6. **AC-6:** Given admin upload CSV valid, klik "Preview", tampil 10 row pertama + validation result per row (✅/⚠️/❌).
7. **AC-7:** Given row punya `assignee_email` tidak match user → mark warning + opsi "Skip row" (auto-create user out of scope pilot).
8. **AC-8:** Given row punya `project_name` baru → auto-create project status='active' dalam transaction.
9. **AC-9:** Given import dijalankan, progress bar + summary akhir (X imported, Y skipped, Z error dengan detail).
10. **AC-10:** Import transactional — semua atau tidak (rollback on critical error).

### N2 — PWA Installable

PRD §3.2 line 151 + §3.3 line 166.

**Acceptance criteria (derived dari N2 spec):**
11. **AC-11:** App installable via browser "Install" prompt di Chrome/Edge desktop + Chrome/Safari mobile.
12. **AC-12:** Manifest file lengkap (name, icons, theme, display=standalone).
13. **AC-13:** Service worker register tanpa error, cache static assets (CSS, JS).
14. **AC-14:** Offline: tampil offline page atau cached app shell (no offline data write — out of scope pilot).
15. **AC-15:** PWA install prompt accessible via UI button (bukan hanya browser native menu).

---

## B. Step-by-step breakdown (13 steps)

### Step 1 — Schema migration (additive)

**Deliverable:**
- `supabase/migrations/<ts>_add_onboarding_support.sql`:
  - `ALTER TABLE projects ADD COLUMN is_sample BOOLEAN NOT NULL DEFAULT false;`
  - Helper function `public.create_onboarding_sample(p_user_id uuid)` — INSERT 1 sample project + 5 tasks dengan `is_sample=true`. SECURITY DEFINER untuk bypass RLS during signup auto-call.
  - DB trigger optional kalau auto-fire on signup, atau client-side call after login first time

**Acceptance criteria:**
- Migration applies via `npx supabase db push` (autonomous Sprint 4+)
- `users.onboarding_state` JSONB sudah exists Sprint 1, no schema change needed untuk tracking tutorial done / tooltips seen
- `is_sample` boolean additive — Sprint 1-3 projects tidak affected

**Test strategy:** pgTAP file `supabase/tests/onboarding_sample_rls.test.sql` (~6 assertions).

**Commit:** `feat(db): add is_sample flag + create_onboarding_sample fn`
**Estimate:** 0.5 hari (~15 menit autonomous)

---

### Step 2 — pgTAP coverage onboarding RLS

**Deliverable:**
- `supabase/tests/onboarding_sample_rls.test.sql` (~6 assertions):
  - Member dapat SELECT own sample project (transitif via tasks assigned)
  - Member tidak dapat DELETE other member sample project
  - Admin dapat INSERT sample project apa saja
  - `is_sample=true` field accessible via SELECT (not hidden)
  - `users.onboarding_state` UPDATE only own user_id (existing Sprint 1 RLS)
  - `create_onboarding_sample()` SECURITY DEFINER bypass works

**Acceptance criteria:**
- 6/6 assertions pass via `supabase test db` (kalau Docker setup) atau MCP execute_sql aggregation pattern (carry-over)

**Commit:** `test(db): pgTAP coverage onboarding sample RLS`
**Estimate:** 0.5 hari

---

### Step 3 — Sample data trigger / on-first-login hook

**Decision point:**
- (a) DB trigger on `auth.users` INSERT — auto-fire `create_onboarding_sample()` saat signup. Risk: triggers di `auth.*` butuh special privilege, mungkin block.
- (b) Client-side call dari `AuthContext` saat first login detected (`users.onboarding_state.tutorial_done == false`). RPC call dari client.

**Recommendation:** (b) client-side — simpler, no trigger privilege concern, controllable timing.

**Deliverable:**
- `apps/web/src/lib/onboarding.ts` — `triggerSampleData()` wrapper RPC
- `AuthContext` augment: detect first login → call sample data RPC, update onboarding_state.tutorial_done=false (initial)
- `useOnboarding` hook untuk track state

**Test strategy:** Vitest unit untuk hook state machine.

**Commit:** `feat(web): sample data trigger on first login (F10 sub-1)`
**Estimate:** 0.75 hari

---

### Step 4 — F10 Wizard Tour component (5-step overlay)

**Deliverable:**
- `apps/web/src/components/onboarding/WizardTour.tsx`:
  - Modal overlay dengan step indicator (1/5, 2/5, dst)
  - Per-step: highlight + instruksi + "Lanjut" / "Skip Tour" button
  - State tracked di local React + persist ke `users.onboarding_state.tutorial_done` saat selesai
- 5 step content:
  1. Bikin task (highlight tombol "+" di Kanban / "Buat task" CTA)
  2. Switch view ke Kanban (highlight ViewToggle)
  3. Tulis komen — DEFER Sprint 5 (comments table belum ada). Replace dengan: "Lihat detail task" (highlight task card click)
  4. Attach file — DEFER Sprint 5 (Storage). Replace dengan: "Filter task" (highlight TasksFilterBar)
  5. Lihat workload (highlight nav link "Workload" — Sprint 3 existing)
- Skip behavior: button "Skip" close modal, set state `tutorial_skipped=true`. Tutorial tetap accessible via Profile menu (TBD: profile menu UI defer Sprint 5+, fallback ke link di empty state Beranda).

**Acceptance criteria (F10 AC-1 + AC-2):**
- First login → modal muncul
- Skip closes + state tracked
- Reopen via menu link

**Test strategy:**
- Vitest unit: step state machine + persist logic
- Playwright E2E: first-login flow (mock first-time user → modal appears → skip → reload → modal tidak muncul lagi)

**Commit:** `feat(web): F10 wizard tour 5-step (modal overlay)`
**Estimate:** 1 hari

---

### Step 5 — F10 Empty States refactor

**Deliverable:**
- Audit semua view dengan empty state existing (Sprint 1-3):
  - ProjectsPage: "Belum ada project visible untuk kamu." → improve dengan CTA + Indonesian copy per microcopy skill
  - ProjectDetailPage tasks: "Belum ada task di project ini." → CTA "Buat task pertama"
  - Notifications dropdown: "Belum ada notifikasi. Kamu update 👍" (Sprint 3 sudah)
  - Bottleneck: "Tidak ada bottleneck 🎉" (Sprint 3 sudah)
- Add component `EmptyState` reusable dengan icon + headline + CTA prop

**Acceptance criteria (F10 AC-4):** Semua view major punya empty state Indonesian dengan CTA actionable.

**Test strategy:** Vitest snapshot untuk EmptyState variants. Playwright: visit page kosong, verify empty state visible.

**Commit:** `feat(web): F10 empty states unified component (audit + refactor)`
**Estimate:** 0.75 hari

---

### Step 6 — F10 Tooltip first-time

**Deliverable:**
- `apps/web/src/components/onboarding/Tooltip.tsx` — contextual tooltip dengan dismiss logic
- Tracked via `users.onboarding_state.tooltips_seen[]` (existing JSONB column)
- Apply ke 3 fitur kompleks:
  1. Gantt drag-drop (kalau aktif suatu hari — Sprint 2 read-only saja, defer tooltip kalau drag belum support)
  2. Kanban drag-drop (Sprint 2 Step 5)
  3. @mention (DEFER Sprint 5 — @mention parsing belum ada per Q3)
- Realistic Sprint 4 scope: 2 tooltip (Kanban drag, view toggle)

**Acceptance criteria (F10 AC-5):** Each tooltip tampil maks 1× per user, tracked di onboarding_state.

**Test strategy:** Vitest unit untuk dedupe logic. Playwright E2E: visit Kanban first time → tooltip → dismiss → reload → tooltip tidak muncul.

**Commit:** `feat(web): F10 tooltip first-time tracker (kanban + view toggle)`
**Estimate:** 0.5 hari

---

### Step 7 — F15 ADR-005 implementation: bulk_import_tasks RPC

**Deliverable:**
- `supabase/migrations/<ts>_add_bulk_import_tasks_rpc.sql`:
  - `public.bulk_import_tasks(p_rows jsonb, p_dry_run boolean) RETURNS jsonb`
  - SECURITY INVOKER, admin-only check via `public.is_admin()` di body (return 403-equivalent error kalau bukan admin)
  - Validate per row: format (status enum, priority enum, deadline date), FK (assignee_email lookup, project_name lookup atau auto-create)
  - Transactional: BEGIN/COMMIT, ROLLBACK on critical error
  - Return JSONB summary `{dry_run, summary: {total, valid, warning, error, imported}, rows: [...]}`
- pgTAP test `supabase/tests/bulk_import_rpc.test.sql` (~10 assertions covering RLS + validation + dry_run)

**Acceptance criteria (F15 AC-7, AC-8, AC-10):**
- Auto-create project pattern works
- Warning untuk assignee_email tidak match
- Transactional — partial success TIDAK leak data

**Test strategy:** pgTAP RPC validation test.

**Commit:** `feat(db): bulk_import_tasks RPC (ADR-005 implementation)`
**Estimate:** 1.5 hari

---

### Step 8 — F15 UI: upload form + preview + validation

**Deliverable:**
- Install `papaparse` (~13 KB gzipped core) — Q5 pre-approved category, JANGAN install other parser
- `apps/web/src/pages/AdminCsvImportPage.tsx` — route `/admin/csv-import` (lazy-loaded route per ADR-005 pattern)
- `apps/web/src/lib/csvImport.ts` — papaparse wrapper, validation rules client-side (mirror RPC rules)
- File input dengan size guard 5MB, MIME type check
- Preview table 10 row dengan validation icon per row (✅/⚠️/❌)
- "Commit Import" button (disabled jika ada error)
- Permission guard: admin only (Member/Manager/Viewer redirect)

**Acceptance criteria (F15 AC-6):** Preview dengan 10 row + validation result.

**Test strategy:**
- Vitest unit: csvImport.ts validation pure functions (UTF-8 BOM strip, quoted commas, status enum)
- Playwright E2E: admin login → upload sample CSV → preview render → click commit (mock success)

**Commit:** `feat(web): F15 CSV upload + preview UI (lazy-load papaparse)`
**Estimate:** 1.5 hari

---

### Step 9 — F15 commit flow + error reporting

**Deliverable:**
- Wire commit flow `useOptimisticMutation` (Sprint 3 Step 10 pattern reuse)
- Toast Indonesian per result (success/warning/error count)
- Error report download CSV (rows yang error + reason) — accessibility untuk re-upload after fix
- Progress bar simulation (papaparse parse + RPC commit indicator)

**Acceptance criteria (F15 AC-9, AC-10):** Progress + summary + error detail.

**Test strategy:** Playwright E2E end-to-end CSV upload → commit → summary toast.

**Commit:** `feat(web): F15 CSV commit flow + error report download`
**Estimate:** 1 hari

---

### Step 10 — N2 PWA manifest + icons

**Deliverable:**
- Install `vite-plugin-pwa` (Q5 pre-approved category — vite plugin)
- `apps/web/public/manifest.webmanifest`:
  - name: "KalaTask"
  - short_name: "KalaTask"
  - theme_color: brand `--kt-deep` (#0060A0)
  - background_color: brand `--kt-bg`
  - display: "standalone"
  - icons: 192x192 + 512x512 (sourced dari `apps/web/public/` — kalau belum ada, generate via online tool atau placeholder + flag owner)
- `apps/web/index.html` `<link rel="manifest">` + theme-color meta tag

**Acceptance criteria (AC-12):** Manifest valid via Chrome DevTools Application tab.

**Test strategy:** Manual + Lighthouse PWA audit.

**Commit:** `feat(web): N2 PWA manifest + icons`
**Estimate:** 0.5 hari

---

### Step 11 — N2 service worker + install prompt

**Deliverable:**
- `vite-plugin-pwa` config di `vite.config.ts`:
  - registerType: 'autoUpdate'
  - workbox cache strategy: cache JS/CSS/static assets, NetworkFirst untuk API
  - exclude `/auth/v1/*` dari cache (auth never cached)
- `apps/web/src/components/pwa/InstallPrompt.tsx` — button trigger `beforeinstallprompt` event
- AppHeader integrate install button (visible kalau prompt available + belum installed)

**Acceptance criteria (AC-11, AC-13, AC-14, AC-15):** Service worker register tanpa error, install button visible, offline fallback.

**Security:** auth tokens / user PII NEVER cached. Workbox runtimeCaching skip `/rest/v1/*` + `/auth/v1/*`.

**Test strategy:**
- Manual: Lighthouse PWA score >= 90
- Playwright: install button visible after page load (mock beforeinstallprompt)

**Commit:** `feat(web): N2 service worker + PWA install prompt`
**Estimate:** 1 hari

---

### Step 12 — Cumulative test + regression

**Deliverable:**
- New E2E specs:
  - `apps/web/tests/e2e/onboarding.spec.ts` (~6 tests)
  - `apps/web/tests/e2e/csv-import.spec.ts` (~6 tests)
  - `apps/web/tests/e2e/pwa.spec.ts` (~3 tests)
- Run full E2E + verify Sprint 1-3 regression check (cumulative ~85 E2E)
- Bundle check: initial < 500KB gzipped (PRD N1)

**Acceptance criteria:**
- All cumulative E2E pass
- No Sprint 1-3 regression
- Bundle within budget

**Commit:** `test(e2e): Sprint 4 F10+F15+PWA verification + regression`
**Estimate:** 1 hari

---

### Step 13 — Sprint 4 retro + Checkpoint 5 prep

**Deliverable:**
- `docs/sprint-4-retro.md` (mirror Sprint 1-3 format)
- `docs/sprint-4-checkpoint-5-instructions.md`
- `docs/sprint-4-final-signoff.md` (kalau ada limitations)

**Commit:** `docs(retro): Sprint 4 retrospective + checkpoint 5 prep`
**Estimate:** 0.5 hari

---

## C. Dependencies & ordering

### Sequential blocking chain

```
Step 1 (schema)
  → Step 2 (pgTAP RLS)
  → Step 3 (sample data trigger — depends on schema)
    → Step 4 (wizard tour — depends on first-login detection from Step 3)
      → Step 5 (empty states — independent, dapat paralel Step 4)
        → Step 6 (tooltip — independent)
          → Step 7 (CSV RPC — independent dari F10)
            → Step 8 (CSV UI)
              → Step 9 (CSV commit flow)
                → Step 10 (PWA manifest — independent)
                  → Step 11 (PWA service worker — depends on Step 10)
                    → Step 12 (cumulative test)
                      → Step 13 (retro)
```

### Parallelizable

- F10 sub-features (Step 4 + 5 + 6) dapat paralel kalau 2 dev. Sprint 4 single-dev: sequential, prioritize wizard (Step 4 critical path).
- F15 RPC (Step 7) + F10 UI (Step 4-6) — independent tracks.
- N2 PWA (Step 10-11) — independent dari F10 + F15.

---

## D. Test strategy

### pgTAP

- Step 2: onboarding sample RLS (~6 assertions)
- Step 7: bulk_import_tasks RPC (~10 assertions)
- Cumulative target: 108 (Sprint 1-3) + 16 (Sprint 4) = 124

### Vitest unit

- Wizard step state machine
- CSV validation rules (papaparse wrapper, status enum, deadline format)
- Empty state component variants
- Tooltip dedupe logic
- Cumulative target: 102 (Sprint 1-3) + ~25 (Sprint 4) = 127

### Playwright E2E

- Onboarding: 6 tests (first login, skip, sample data delete, empty state, tooltip, reopen tutorial)
- CSV import: 6 tests (upload, preview, dry-run, commit, error report, admin-only redirect)
- PWA: 3 tests (manifest visible, install button, service worker register)
- Cumulative target: 69 (Sprint 1-3) + ~15 (Sprint 4) = 84

### Manual checkpoint (Checkpoint 5)

- BD owner verify first-login flow per role
- Manual CSV upload dengan sample file
- Mobile install test (Chrome Android, Safari iOS)
- Lighthouse PWA score capture

---

## E. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| **R1** | Bundle size > 500KB gzipped (PWA + papaparse + onboarding wizard) | Medium | High | Lazy-load /admin/csv-import route (papaparse), service worker terpisah dari main bundle. Verify Step 12 build. |
| **R2** | Service worker cache invalidation (stale assets after deploy) | High (common bug) | Medium | `vite-plugin-pwa` registerType=autoUpdate, hash-based filenames, skip /auth/v1/* + /rest/v1/* dari cache. |
| **R3** | CSV edge cases (UTF-8 BOM, Excel quoted commas, embedded newlines, empty rows) | High | Medium | papaparse handle natively dengan config `header: true, skipEmptyLines: true, dynamicTyping: false`. Vitest test edge cases. |
| **R4** | Sample data trigger conflict dengan existing demo seed (Sprint 2) | Medium | Low | `is_sample=true` flag distinct dari demo seed UUIDs. Demo seed manually applied; sample data auto-fire on first login. Owner action: cleanup demo seed sebelum production usage. |
| **R5** | DB trigger `auth.users` INSERT might require special privilege | High (kalau pilih Step 3 option (a)) | High | Pivot ke Step 3 option (b) client-side trigger. Recommended di plan. |
| **R6** | PWA manifest icons missing | Medium | Medium | Generate placeholder via online tool atau Pillow-based script. Owner provide branded icons defer Sprint 5+. |
| **R7** | Sprint 1-3 regression dari schema migration Step 1 | Low | High | `is_sample` additive only, no ALTER existing column. Step 12 full regression check. |
| **R8** | First login detection race (AuthContext load + onboarding_state read) | Medium | Low | Sequential: AuthContext fetches profile, then triggers onboarding check. Loading state until both resolve. |
| **R9** | Sample data RLS leak — Member sees other Member's sample project | Low | Medium | RLS Sprint 1 (`projects_select_member_via_tasks`) auto-scope. Sample tasks assignee = current user → only that user sees. |
| **R10** | papaparse browser memory pressure untuk 5MB CSV | Low | Low | papaparse benchmark 100K rows < 1 detik. UI guard reject > 5MB. |
| **R11** | PWA install prompt browser compatibility (Safari iOS limited) | Medium | Low | Document browser matrix di Checkpoint 5 doc. Safari iOS = "Add to Home Screen" manual flow, no install button. |
| **R12** | Onboarding wizard skippable detection — user accidentally close before save | Low | Medium | Persist intent to skip vs accidentally close — use modal close handler that prompts confirm. |

---

## F. Estimated effort total

| Step | Estimate (hari) |
|---|---|
| 1 — Schema migration | 0.5 |
| 2 — pgTAP RLS | 0.5 |
| 3 — Sample data trigger | 0.75 |
| 4 — Wizard tour | 1.0 |
| 5 — Empty states refactor | 0.75 |
| 6 — Tooltip first-time | 0.5 |
| 7 — CSV RPC (ADR-005) | 1.5 |
| 8 — CSV UI upload + preview | 1.5 |
| 9 — CSV commit flow | 1.0 |
| 10 — PWA manifest + icons | 0.5 |
| 11 — PWA service worker | 1.0 |
| 12 — Cumulative test + regression | 1.0 |
| 13 — Sprint 4 retro | 0.5 |
| **Total** | **11.0 hari** (single dev) |

Sprint 4 target window: 2-3 minggu kalender (buffer 30% untuk PWA + CSV edge case discovery). Per Sprint 1-3 velocity: actual ~3.5-4 jam wall-clock optimistic. Sprint 4 expect 4-6 jam (PWA + CSV parser tambah complexity).

---

## G. Pertanyaan untuk Owner (PRD ambiguity)

Sebelum eksekusi Phase 2, owner perlu klarifikasi 5 hal.

### Q1: Wizard tour skippable behavior

PRD AC-2: Skip → tutorial closed tapi "tombol Tutorial tetap accessible di profile menu". Profile menu belum ada di Sprint 1-3 (defer Sprint 5+).

**Decision needed:**
- (a) Sprint 4 cover Profile menu (scope creep)
- (b) Sprint 4 fallback: link "Buka tutorial" di empty state Beranda DashboardPage; defer Profile menu Sprint 5+
- (c) Skip = permanent dismiss (tidak reopenable Sprint 4); Profile menu Sprint 5+ unlocks reopen

**Rekomendasi saya:** (b) — minimal effort, AC partial-match dengan justified deviation di retro doc.

### Q2: F10 wizard step (c) tulis komen + step (d) attach file

`comments` table belum exist (defer Sprint 5+ per Sprint 1-3 retro). `attachments` Storage belum integrate (Sprint 5+).

**Decision needed:**
- (a) Sprint 4 add `comments` + `attachments` table + Storage (scope creep besar)
- (b) Sprint 4 wizard step (c) + (d) replace dengan fitur lain yang sudah ada (e.g., "Lihat detail task", "Filter task")
- (c) Sprint 4 wizard hanya 3 step (a, b, e); add (c) + (d) Sprint 5+

**Rekomendasi saya:** (b) — full 5 step coverage tapi conten substitute sesuai fitur Sprint 1-4. Documented deviation.

### Q3: F15 auto-create user (assignee_email tidak match)

PRD AC-7 mention "opsi Create user atau Skip row". Auto-create user requires Supabase Auth admin API (bukan public.users INSERT).

**Decision needed:**
- (a) Sprint 4 implement auto-create user via service role admin API (security risk — service role key di Edge Function or RPC)
- (b) Sprint 4 hanya support "Skip row" — defer auto-create user Sprint 5+
- (c) Sprint 4 row warning + UI offer manual link "Create user" yang opens Supabase Dashboard (passive UX)

**Rekomendasi saya:** (b) — pilot scale ~30 user, owner manage user creation via Dashboard. Auto-create butuh service role security review yang out of pilot scope.

### Q4: PWA offline behavior

PRD AC-14: "Offline tampil offline page atau cached app shell". No offline data write per pilot.

**Decision needed:**
- (a) Full offline read-only — cache fetched task data via IndexedDB (complex, sync issues)
- (b) Cached app shell only — offline shows stale UI dengan "Refresh saat online" prompt (no offline data)
- (c) Custom offline fallback page dengan "Sambungan terputus" message + retry button

**Rekomendasi saya:** (b) — minimum viable, no IndexedDB complexity. Document N2 partial-implementation di retro.

### Q5: Sample data trigger lifecycle

PRD AC-1: "first login, sample project + tasks otomatis ada". Trigger options:

**Decision needed:**
- (a) DB trigger on `auth.users` INSERT (complex, may require special privilege)
- (b) Client-side call dari AuthContext detect first login (simpler, but client-controllable so user could bypass)
- (c) Edge Function webhook on auth signup (not free tier friendly per ADR-001)

**Rekomendasi saya:** (b) — simplest, controllable, matches Sprint 3 client-side pattern. Risk Member bypass harmless (sample data delete-able anyway).

---

## H. Definition of Done untuk Sprint 4

- [ ] All 13 step shipped + commit + push ke `sprint-4`
- [ ] All pgTAP tests pass (Sprint 1-3 108 + Sprint 4 ~16 = ~124 cumulative)
- [ ] All E2E tests pass (Sprint 1-3 69 + Sprint 4 ~15 = ~84)
- [ ] All Vitest unit pass (Sprint 1-3 102 + Sprint 4 ~25 = ~127)
- [ ] Bundle size < 500KB gzipped initial (PRD N1)
- [ ] Lighthouse PWA audit score >= 90
- [ ] No regression Sprint 1-3
- [ ] Checkpoint 5 manual test approved oleh owner
- [ ] Sprint 4 retro doc + Checkpoint 5 instructions ready
- [ ] PR `sprint-4 → main` created via gh CLI
- [ ] Sprint 4 closed, merge ke main via PR
