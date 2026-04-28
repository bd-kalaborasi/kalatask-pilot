# Sprint 4 Checkpoint 5 — Owner Manual Test Instructions

**Goal:** Validate F10 onboarding + F15 CSV import + N2 PWA shipped di
Sprint 4 sebelum approve merge ke main + lanjut Sprint 5.

**Setup prerequisite:**
- Local dev server running di `localhost:5174` (`npm run dev` di `apps/web/`)
- Akses 4 test user (admin/manager/member/viewer) — credentials di
  `apps/web/tests/e2e/auth.spec.ts` USERS array

---

## A. F10 Onboarding (Wizard + Sample data + Empty States + Tooltip)

### A1. First-login sample data + wizard auto-show
**Steps:**
1. Login sebagai user yang **belum pernah login sebelumnya** (atau
   reset onboarding_state via Dashboard SQL: `UPDATE public.users SET
   onboarding_state = '{}'::jsonb WHERE id = '<user-id>'`)
2. Tunggu redirect ke Dashboard

**Expected:**
- Wizard modal muncul otomatis (langkah 1 dari 5: "Yuk, kenalan dulu sama KalaTask")
- Buka `/projects` → ada 1 project baru "Project Contoh — Hapus saja"
  (ber-flag is_sample=true di DB)
- Project Contoh punya 5 task variasi status (todo, in_progress, review,
  done, blocked)

**Pass criteria:** AC-1 ✅ wizard + sample data muncul.

---

### A2. Skip wizard
**Steps:**
1. Di wizard modal, klik tombol **"Skip tutorial"** (kanan bawah, link kecil)

**Expected:**
- Modal close instantly (fade-out animation)
- Reload halaman → modal **TIDAK** muncul lagi
- Buka Dashboard → link **"Buka tutorial"** visible di card "Akses Kamu"

**Pass criteria:** AC-2 ✅ skip persist + reopen path tersedia.

---

### A3. Reopen wizard via Dashboard link
**Steps:**
1. Klik link "Buka tutorial" di Dashboard

**Expected:** Modal muncul lagi di langkah 1.

---

### A4. Wizard navigation
**Steps:**
1. Klik **"Lanjut"** sampai langkah 5 (counter 5 dari 5)
2. Tombol terakhir berubah jadi **"Selesai 🎉"**
3. Klik Selesai

**Expected:** Modal close. Reload halaman → modal tidak muncul lagi
(tutorial_done=true).

---

### A5. Wizard keyboard
**Steps:** Buka wizard → tekan **Esc**.
**Expected:** Modal close (skip flow).

---

### A6. Sample project archive (AC-3)
**Steps:**
1. Buka detail "Project Contoh"
2. Ubah status ke **archived** (project status select)

**Expected:** Project hilang dari `/projects` listing (default filter
exclude archived). Sample data not lost — hanya hidden.

---

### A7. Empty states (AC-4)
**Tujuan:** Verify each major view punya friendly Indonesian empty state.

| View | Empty trigger | Expected empty state |
|---|---|---|
| `/projects` (admin, fresh DB) | Belum ada project | Icon 📋 + "Belum ada project di sini" + Cowork hint |
| `/projects` filter status="archived" only (admin tanpa archived data) | Filter no match | Icon 🔍 + "Filter ini nggak nemu apa-apa" + "Reset filter" CTA |
| `/projects/{id}` ListView (project tanpa task) | No tasks | Icon ✅ + "Project ini masih kosong" + Cowork hint |
| `/projects/{id}` GanttView (no deadlines) | Tasks ada tapi tanpa deadline | Icon 🗓️ + "Belum ada task dengan deadline" |
| `/workload` (no member assigned) | No assigned tasks | Icon 👥 + "Belum ada member yang ter-track" |

**Pass criteria:** AC-4 ✅ all empty states friendly + actionable.

---

### A8. Tooltip first-time (AC-5)
**Steps:**
1. Login sebagai admin yang belum pernah lihat tooltip (reset
   `onboarding_state.tooltips_seen`)
2. Buka project, switch ke Kanban view
3. Tooltip muncul: "Tip: drag kartu antar kolom..." dengan close 'x'
4. Klik close → tooltip hilang
5. Reload → tooltip tidak muncul lagi (persisted di tooltips_seen)
6. Switch view: tooltip muncul: "Switch antara List / Kanban / Gantt..."
7. Close tooltip → tidak muncul lagi setelah reload

**Pass criteria:** AC-5 ✅ each tooltip max 1× per user.

---

## B. F15 CSV Import

### B1. Permission gate
**Steps:**
1. Login sebagai **member** (andi@kalatask.test)
2. Coba navigate ke `/admin/csv-import` langsung via URL bar
3. Expected: redirect ke `/`
4. Header tidak menampilkan "Import CSV" link

**Pass criteria:** Member denied. ✅

5. Login sebagai admin → Header menampilkan "Import CSV" link →
   Klik = page render dengan upload UI.

---

### B2. Upload + preview valid CSV
**Sample CSV** (save sebagai `sample-tasks.csv`):
```csv
title,project_name,status,priority,deadline,estimated_hours,description,assignee_email
Task 1,Demo CSV,todo,medium,2026-12-01,3,Ini deskripsi,
Task 2,Demo CSV,in_progress,high,2026-12-15,5,Sub-progress,andi@kalatask.test
Task 3,Project Baru via CSV,todo,low,,2,Auto-create project,
Task 4 (warn),Demo CSV,todo,medium,,,,unknown@nowhere.test
```

**Steps:**
1. Admin buka `/admin/csv-import`
2. Upload CSV via file input
3. Preview muncul: 4 row, 4 total · 3 valid · 1 warning · 0 error

**Pass criteria:** AC-6 ✅ preview render + per-row validation icon.
Row 4 warning (assignee unknown — Q3 b skip).

---

### B3. Commit import
**Steps:**
1. Klik "Commit 4 task"
2. Toast muncul: "X task ter-import · Y warning · Z error"
3. Result page render: 5 stat tile (Total/Imported/Valid/Warning/Error)
4. Buka `/projects` → "Demo CSV" + "Project Baru via CSV" exist
5. Buka detail project → 4 task ter-import dengan source='csv-import'

**Pass criteria:** AC-7 (skip warning row OK, AC-8 (auto-create project),
AC-9 (summary), AC-10 (transactional). ✅

---

### B4. Error report download
**Sample CSV with errors** (save as `sample-errors.csv`):
```csv
title,project_name,status,priority
,Missing title,todo,medium
Bad status,X,invalidstatus,medium
```

**Steps:**
1. Upload → preview 2 row, both error
2. Commit button **disabled** ("Fix error dulu untuk commit")
3. Untuk test error report path: minimal 1 row valid + 1 error,
   lalu commit; result page tampilkan tombol "Download error report (CSV)"

**Pass criteria:** Error CSV downloads dengan rows + reasons.

---

### B5. File size guard
**Steps:** Upload file > 5MB → expected error "File terlalu besar. Maksimal 5 MB."

---

## C. N2 PWA Installable

### C1. Manifest accessible
**Steps:**
1. Buka DevTools (F12) → Application tab → Manifest section
2. Verify:
   - Name: "KalaTask"
   - Short name: "KalaTask"
   - Theme color: `#0060A0`
   - Background: `#FAFAFA`
   - Display: standalone
   - Icons: 1 SVG entry, sizes 192x192/512x512/any

**Pass criteria:** AC-12 ✅

---

### C2. Service worker registered
**Steps:**
1. Run **production build:** `cd apps/web && npm run build && npx vite preview --port 5174`
2. Buka `localhost:5174`
3. DevTools → Application → Service Workers
4. Verify: `sw.js` "activated and is running"
5. Reload page → assets served dari Service Worker (Network tab "from ServiceWorker")

**Pass criteria:** AC-13 ✅

---

### C3. Install prompt
**Steps:**
1. Saat browsing /projects (production build, Chrome desktop), klik
   tombol **"Install app"** di header (kanan, ⤓ icon)
2. Browser native install dialog muncul
3. Klik Install → app open di standalone window (no browser chrome)
4. Saat di standalone mode, reload — header tidak menampilkan tombol
   Install lagi (already installed)

**Pass criteria:** AC-11 + AC-15 ✅

**Catatan Safari iOS:** beforeinstallprompt tidak fire di Safari iOS.
User pakai "Add to Home Screen" manual (Share menu). Tombol
"Install app" tidak muncul di Safari iOS — expected behavior.

---

### C4. Offline fallback (Q4 b cached app shell only)
**Steps:**
1. Production build + serve, buka di Chrome
2. Login + navigate ke beberapa page
3. DevTools → Network → Offline checkbox
4. Reload page → cached shell render (CSS/JS via SW), tapi:
   - API call `/rest/v1/*` fail dengan network error (correct — kita
     tidak cache API per Q4 + security policy)
   - UI tampilkan loading state atau error banner (depending on page)
5. Toggle online lagi → re-fetch resume normal

**Pass criteria:** AC-14 ✅ — app shell cached, no offline data write.

---

### C5. Lighthouse PWA audit
**Steps:**
1. Production build + serve di port 5174
2. DevTools → Lighthouse → Generate report
3. Mode: Mobile + Performance + PWA + Best Practices + Accessibility
4. Capture score

**Target:** PWA score **>= 90** (DoD requirement).

**If score < 90:**
- Note issues di report
- Flag ke retro untuk Sprint 5+ fix
- TIDAK block merge sprint-4 (PWA optimization iterative)

---

## D. Sprint 1-3 Regression

Quick smoke test pastikan Sprint 4 tidak break Sprint 1-3 features:

1. Login 4 role (admin/manager/member/viewer) → masing-masing role
   bisa login, role badge correct di header
2. Member buka /projects → lihat project transitif via tasks (Sprint 1)
3. Admin buka Project detail → switch view List/Kanban/Gantt — semua
   render data correct (Sprint 2)
4. Admin/Manager buka /dashboard/manager → metrics + workload bar render
   (Sprint 3)
5. Drag task antar kolom Kanban → status update + notification (Sprint 3)

**Pass criteria:** Tidak ada error baru, semua Sprint 1-3 feature jalan
seperti sebelumnya.

---

## E. Checkpoint 5 sign-off

Untuk approve Sprint 4 merge ke main, owner harus konfirmasi:

- [ ] **A1-A8:** F10 Onboarding flow lengkap pass (atau note exception)
- [ ] **B1-B5:** F15 CSV import flow lengkap pass
- [ ] **C1-C5:** N2 PWA installable + cached + Lighthouse score
- [ ] **D:** No Sprint 1-3 regression
- [ ] (Optional) Lighthouse PWA score documented (kalau < 90, decide
  block atau ship)

**Setelah sign-off:**
- Merge PR sprint-4 → main via `gh pr merge` atau GitHub web
- Update CLAUDE.md changelog
- Sprint 5 Phase 1 kickoff

---

## F. Known limitations Sprint 4 (di-disclose ke owner)

1. **pgTAP execution defer ke Dashboard SQL editor** — MCP read-only
   blocks DDL. 14 Sprint 4 + 108 Sprint 1-3 = 122 assertion files
   committed; full run via Dashboard atau Docker `supabase test db`.
2. **PWA PNG icons defer Sprint 5+** — brand asset bundle
   (`/kalatask-brand/logo/`) belum di repo. Branded SVG icon
   (programmatic, dari brand tokens) sebagai bridge — Lighthouse
   should accept SVG-only.
3. **Wizard step (c) + (d) substitution** — comments/Storage defer
   Sprint 5+; Sprint 4 menggunakan "Lihat detail" + "Workload" sebagai
   substitute. Restore literal copy saat fitur ready.
4. **Profile menu defer Sprint 5+** — Q1 (b) link "Buka tutorial" di
   DashboardPage cukup untuk pilot.
5. **CSV auto-create user defer Sprint 5+** — Q3 (b) skip warning.

---

**Selesai.** Owner verify A-E, kasih sign-off di komen PR atau kirim
"approved Sprint 4" ke session ini.
