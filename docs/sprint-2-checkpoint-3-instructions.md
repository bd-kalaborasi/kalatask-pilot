# Sprint 2 — Checkpoint 3 Manual Test Instructions

**Audience:** BD owner (non-engineer)
**Goal:** Verify F3 Three Views + F14 Project Lifecycle bekerja per role sebelum merge `sprint-2` → `main`.
**Format:** mirror Checkpoint 2 (Sprint 1) instruction style.

---

## Pre-test setup

### 1. Pull branch sprint-2

```bash
cd C:\Users\bdkal\Projects\kalatask-pilot
git fetch origin sprint-2
git checkout sprint-2
git pull origin sprint-2
```

### 2. Install dependencies (kalau belum, atau ada package baru)

```bash
cd apps/web
npm install
```

### 3. Pastikan dev server running

```bash
cd apps/web
npm run dev
```

Akses URL yang muncul (typically `http://localhost:5173` atau `5174`).

### 4. Apply pgTAP F14 lifecycle test (opsional)

File: `supabase/tests/projects_status_lifecycle.test.sql`. Tujuan: confirm RLS update permission per role tetap correct (no regression dari Sprint 1).

Jalankan via:
- **Dashboard SQL Editor:** paste isi file → Run. Wrap di BEGIN/ROLLBACK kalau test pollute data.
- **Atau MCP:** toggle `.mcp.json` `read_only=false` sementara → run via TEMP table aggregation pattern.

Expected: **6/6 assertions PASS.**

### 5. (Opsional) Seed sample project + task untuk demo

Sprint 2 ship view UI tanpa seed projects/tasks di remote. Kalau owner mau demo full flow (kanban drag, gantt render), bikin sample data manual via Supabase Dashboard:

Option A — via Dashboard SQL Editor:
```sql
-- Create 1 sample project
INSERT INTO public.projects (id, name, description, owner_id, status)
VALUES (
  '00000000-0000-0000-0000-0000000000a1',
  'Sample Q2 Initiatives',
  'Project untuk demo Sprint 2 — boleh di-delete kapan saja',
  '00000000-0000-0000-0000-000000000002', -- Sari (manager Team Alpha)
  'active'
);

-- Create 6 tasks (mix status untuk Kanban demo)
INSERT INTO public.tasks (project_id, title, description, assignee_id, created_by, status, priority, deadline, estimated_hours) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'Riset competitor', 'Analisa 5 competitor di Q2', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'todo', 'high', '2026-05-15', 8),
  ('00000000-0000-0000-0000-0000000000a1', 'Draft proposal', 'Draft initial proposal', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'in_progress', 'urgent', '2026-05-10', 16),
  ('00000000-0000-0000-0000-0000000000a1', 'Review draft sama lead', NULL, '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'review', 'medium', '2026-05-20', 4),
  ('00000000-0000-0000-0000-0000000000a1', 'Finalize budget', NULL, NULL, '00000000-0000-0000-0000-000000000002', 'done', 'high', '2026-04-25', 6),
  ('00000000-0000-0000-0000-0000000000a1', 'Block on vendor reply', 'Wait for vendor', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'blocked', 'urgent', '2026-05-05', NULL),
  ('00000000-0000-0000-0000-0000000000a1', 'Q2 retrospective prep', NULL, NULL, '00000000-0000-0000-0000-000000000002', 'todo', 'low', NULL, NULL);
```

Cleanup setelah demo:
```sql
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000a1';
-- Tasks cascade-deleted via FK ON DELETE CASCADE
```

---

## Manual test scenarios

### Scenario 1: Login + Dashboard navigate

| # | User | Action | Expected |
|---|---|---|---|
| 1 | admin@kalatask.test / TestAdmin123! | Login → klik "Buka Projects" di Dashboard | Navigate ke `/projects` |
| 2 | sari@kalatask.test / TestSari123! | Login → cek nav bar | "Beranda" + "Projects" link visible, badge biru "Manager" |
| 3 | andi@kalatask.test / TestAndi123! | Login → cek nav bar | Badge hijau "Member" |
| 4 | maya@kalatask.test / TestMaya123! | Login → cek nav bar | Badge abu "Viewer" |

### Scenario 2: F14 — Project list per role (visibility scope)

Kalau seed sample project sudah di-apply (langkah 5 pre-setup):

| # | User | Expected |
|---|---|---|
| 5 | admin | Lihat 1 project "Sample Q2 Initiatives" (cross-team) |
| 6 | sari (manager Team Alpha) | Lihat 1 project (own — dia owner) |
| 7 | andi (member Team Alpha) | Lihat 1 project (transitive: dia assigned ke task) |
| 8 | maya (viewer Team Beta) | Lihat 1 project (cross-team, ADR-002) |

Tanpa seed: semua role lihat empty state "Belum ada project visible untuk kamu."

### Scenario 3: F14 — Project status filter

| # | User | Action | Expected |
|---|---|---|---|
| 9 | admin | `/projects` → klik chip "Active" | URL update `?f.status=active`, list filtered |
| 10 | admin | `/projects?f.status=active` → reload | Filter persist (chip masih ditekan) |
| 11 | admin | Klik "Reset" | Filter clear, URL `/projects` |
| 12 | admin | Cek dropdown Team filter | Visible (admin = cross-team) |
| 13 | sari (manager) | Cek dropdown Team filter | TIDAK visible (manager team-scoped via RLS) |
| 14 | maya (viewer) | Cek dropdown Team filter | Visible (viewer = cross-team management) |

### Scenario 4: F14 — Project status update (lifecycle)

(Butuh seed project — langkah 5 pre-setup)

| # | User | Action | Expected |
|---|---|---|---|
| 15 | admin | Buka project detail → Status Project → ubah ke "On Hold" | Badge update ke On Hold (kuning), DB update |
| 16 | sari (manager Sari own project) | Ubah status → "Completed" | Sukses |
| 17 | andi (member) | Buka project detail → Status select | Disabled (read-only — RLS + UI guard) |
| 18 | maya (viewer) | Sama scenario 17 | Disabled |

### Scenario 5: F3 — Three Views toggle

(Butuh seed project + tasks)

| # | User | Action | Expected |
|---|---|---|---|
| 19 | admin | Buka project detail → klik "List" | List view, tasks ter-group default "Tanpa group" |
| 20 | admin | Klik "Kanban" | 5 kolom: Todo / In Progress / Review / Done / Blocked (Blocked = red header) |
| 21 | admin | Klik "Gantt" | Gantt chart render bar untuk task dengan deadline + estimated_hours, milestone untuk task tanpa estimated_hours |
| 22 | admin | URL `/projects/<id>?view=kanban` → reload | Kanban view persist |

### Scenario 6: F3 — Filter persist across views

(Butuh seed)

| # | User | Action | Expected |
|---|---|---|---|
| 23 | admin | Kanban view → klik filter chip "Urgent" | Hanya task urgent visible di Kanban |
| 24 | admin | Klik "List" toggle | List view masih filter "Urgent" |
| 25 | admin | Klik "Gantt" toggle | Gantt masih filter "Urgent" (kalau ada urgent task dengan deadline) |
| 26 | admin | URL share copy + paste di tab baru | Filter + view sama (deep linking work) |

### Scenario 7: F3 AC-2 — Kanban drag-drop status update

(Butuh seed task dengan assignee = current user OR admin permission)

| # | User | Action | Expected |
|---|---|---|---|
| 27 | andi (member, assigned task) | Kanban view → drag own task dari "Todo" ke "In Progress" | Task pindah kolom, DB status update, visible di refresh |
| 28 | andi | Drag task assigned ke Dewi (other member) | Task tidak bisa di-drag (atau revert + error toast — RLS USING block) |
| 29 | maya (viewer) | Try drag task | Tidak bisa drag (no UPDATE policy untuk viewer) |
| 30 | admin | Drag any task | Sukses |

### Scenario 8: F3 AC-3 — Gantt rendering

(Butuh seed)

| # | Verify | Expected |
|---|---|---|
| 31 | Task dengan deadline + estimated_hours | Render bar di timeline |
| 32 | Task dengan deadline tanpa estimated_hours | Render milestone (titik / bar pendek custom_class `bar-milestone`) |
| 33 | Task tanpa deadline | TIDAK render di Gantt (skipped) |
| 34 | Status done | Bar progress = 100% |

### Scenario 9: Regression — Sprint 1 functionality intact

| # | Action | Expected |
|---|---|---|
| 35 | Login + Logout flow | Tetap berfungsi (Sprint 1 baseline) |
| 36 | Refresh saat login | Session persist (bug 2 fix tetap intact) |
| 37 | Wrong credentials | Error message Indonesian muncul |
| 38 | Akses `/` tanpa session | Redirect ke `/login` |

---

## Sign-off checklist

Owner check satu per satu. Approve sprint-2 close kalau:

- [ ] Scenario 1-4 (F14 + login) work per role
- [ ] Scenario 5-6 (F3 view toggle + filter persist) work
- [ ] Scenario 7 (Kanban drag-drop, kalau seed data ada)
- [ ] Scenario 8 (Gantt rendering, kalau seed data ada)
- [ ] Scenario 9 (Sprint 1 regression check) — semua pass
- [ ] pgTAP F14 lifecycle test 6/6 pass (Step 2)
- [ ] Bundle size 137KB gzipped (under 500KB N1 budget)
- [ ] No console error di browser DevTools
- [ ] CRLF noise di git acceptable (no actual content change)

Kalau semua check ✅ → owner reply approval, lalu PR `sprint-2 → main`.

Kalau ada issue → flag bug ke saya dengan:
- Screenshot error / unexpected behavior
- DevTools Console + Network tab snapshot kalau relevant
- User role + step yang fail

---

## Known limitations Sprint 2

Per Sprint 2 plan + Q1-Q4 owner answers, scope di-define eksplisit. Limitations berikut **bukan bug** — by design defer ke Sprint 3+:

- **Notif emission saat Kanban drag** — stub log only (Q3 defer). Sprint 3 implement.
- **task_watchers + notifications table** — belum ada. Block notif full impl.
- **Project create UI** — admin/manager butuh manual SQL atau Dashboard. Sprint 3+ add UI.
- **Task create UI** — sama. Sprint 3+ add.
- **F11.a global search bar** + **F11.c saved filter** — Q4 defer.
- **Gantt drag-resize + dependencies** — out of scope pilot per ADR-003 + PRD §3.3.
- **Real seed data projects/tasks** di remote — Sprint 1 hanya seed users + teams.

Tidak ada blocker untuk Sprint 2 sign-off. Limitations explicitly documented untuk Sprint 3 backlog.
