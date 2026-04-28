# Sprint 3 — Checkpoint 4 Manual Test Instructions

**Audience:** BD owner (non-engineer)
**Goal:** Verify F5 Workload + F6 Bottleneck + F8 Manager Dashboard + F13 Productivity Dashboard + Q3 Notif Full + UX Rollback bekerja per role sebelum merge `sprint-3 → main`.
**Format:** mirror Checkpoint 3 (Sprint 2) instruction style.

---

## Pre-test setup

### 1. Pull branch sprint-3

```bash
cd C:\Users\bdkal\Projects\kalatask-pilot
git fetch origin sprint-3
git checkout sprint-3
git pull origin sprint-3
```

### 2. Install dependencies (kalau ada package baru)

```bash
cd apps/web
npm install
```

Sprint 3 add: `recharts ^3.x`.

### 3. Apply 6 Sprint 3 migrations via Supabase Dashboard SQL Editor

Apply berurutan (dependency chain):

| # | File | Tujuan |
|---|---|---|
| 1 | `supabase/migrations/20260428100000_create_task_watchers.sql` | M2M user×task |
| 2 | `supabase/migrations/20260428100100_create_notifications.sql` | In-app notif queue |
| 3 | `supabase/migrations/20260428100200_create_app_settings.sql` | Configurable threshold |
| 4 | `supabase/migrations/20260428100300_add_notif_emission_engine.sql` | DB triggers + scheduled fn |
| 5 | `supabase/migrations/20260428110000_add_productivity_rpc.sql` | F13 RPC |
| 6 | `supabase/migrations/20260428110100_add_workload_rpc.sql` | F5 RPC |

Verify post-apply (run di SQL Editor):
```sql
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('task_watchers', 'notifications', 'app_settings');
-- Expected: 3

SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_productivity_metrics', 'get_workload_summary',
                   'emit_deadline_notifications', 'tasks_auto_add_watchers',
                   'emit_task_assigned_notif', 'emit_task_status_done_notif');
-- Expected: 6
```

### 4. (Opsional) Enable pg_cron untuk auto-schedule deadline notif

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'emit-deadline-notifs-daily',
  '0 23 * * *',  -- 06:00 WIB next day
  $$ SELECT public.emit_deadline_notifications(); $$
);
```

Tanpa pg_cron, function callable manual:
```sql
SELECT * FROM public.emit_deadline_notifications();
```

### 5. Pastikan dev server running

```bash
cd apps/web
npm run dev
```

### 6. (Opsional) Demo seed extension

Kalau mau lebih banyak task untuk demo dashboard yang visual:
- Apply existing `supabase/seed/sprint_2_demo_seed.sql` (kalau belum)
- Tasks Sprint 2 demo cukup untuk Sprint 3 dashboard demo

---

## Manual test scenarios

### Scenario 1: Notif badge + dropdown per role

| # | User | Action | Expected |
|---|---|---|---|
| 1 | admin | Login → cek header right side | Bell icon visible |
| 2 | admin | Klik bell | Dropdown panel open dengan "Notifikasi" header |
| 3 | admin | Empty state (kalau tidak ada notif) | "Belum ada notifikasi. Kamu update 👍" |
| 4 | admin | Click "Lihat semua aktivitas" | Navigate ke /projects |
| 5 | admin | Click outside panel | Panel close |

### Scenario 2: Notif emission via DB trigger

(Membutuhkan owner trigger task INSERT/UPDATE manual via Dashboard atau via app)

| # | Action | Expected |
|---|---|---|
| 6 | Admin via SQL Editor: INSERT task dengan assignee_id=Andi | Andi mendapat notif type='assigned' (cek via login Andi → bell badge count=1) |
| 7 | Admin UPDATE task status to 'done' | All watchers (creator + assignee) dapat notif type='status_done' |
| 8 | (Opsional) Run `SELECT public.emit_deadline_notifications();` | Function returns count for h3/h1/overdue tier |

### Scenario 3: F8 Manager Dashboard

| # | User | Action | Expected |
|---|---|---|---|
| 9 | manager Sari | Klik "Dashboard" di nav (atau /dashboard/manager) | Manager Dashboard render dengan 4 quick-view tile |
| 10 | Sari | Cek 4 tile | Open Tasks count, Completion Rate %, Overdue Tasks, Overloaded Members |
| 11 | Sari | Per-member status list | Visible dengan load_indicator badge |
| 12 | admin | /dashboard/manager | Same view (cross-team scope) |
| 13 | member Andi | /dashboard/manager | Redirect ke / (member denied) |
| 14 | viewer Maya | /dashboard/manager | Redirect ke / |

### Scenario 4: F13 Productivity Dashboard

| # | User | Action | Expected |
|---|---|---|---|
| 15 | admin | /dashboard/productivity | 5 chart visible: completion rate bar, velocity line, on-time gauge, cycle time tile, bottleneck heatmap |
| 16 | admin | Click "90 hari" period button | URL update `?period=90`, dashboard refetch dengan period 90 |
| 17 | admin | Reload page | Period filter persist (URL preserved) |
| 18 | viewer Maya | /dashboard/productivity | Render (Viewer access F13 AC-9) |
| 19 | manager Sari | /dashboard/productivity | Render dengan team scope (RLS auto-filter) |
| 20 | member Andi | /dashboard/productivity | Redirect ke / |

### Scenario 5: F5 Workload View

| # | User | Action | Expected |
|---|---|---|---|
| 21 | manager Sari | /workload | Bar chart open task per member visible |
| 22 | Sari | Hover bar | Tooltip dengan count + indicator |
| 23 | admin | /workload | Cross-team workload visible |
| 24 | viewer Maya | /workload | Redirect (workload = manager primary) |
| 25 | member Andi | /workload | Redirect |

### Scenario 6: F6 Bottleneck View

| # | User | Action | Expected |
|---|---|---|---|
| 26 | admin | /bottleneck | List task stuck > X hari (X dari app_settings, default 3) |
| 27 | admin | Empty state (kalau tidak ada bottleneck) | "Tidak ada bottleneck 🎉" |
| 28 | manager Sari | /bottleneck | Same view (team scope via RLS) |
| 29 | viewer Maya | /bottleneck | Render (cross-team management) |
| 30 | member Andi | /bottleneck | Redirect |
| 31 | (Opsional) Admin update app_settings: SET value='5' WHERE key='bottleneck_threshold_days' | Refresh /bottleneck → list stuck task with 5-day threshold |

### Scenario 7: UX Rollback Pattern

| # | User | Action | Expected |
|---|---|---|---|
| 32 | manager Sari | Buka project Sari → ProjectStatusSelect → ubah status | Toast green "Status project diupdate." |
| 33 | (Simulate RLS reject) admin disable Sari permission temporarily — Sari try update | Toast red "Gagal update status project. Coba lagi." + status revert |
| 34 | admin | Kanban drag task antar column | Status update + tidak ada toast (drag = visual feedback already) |
| 35 | (Simulate fail) admin drag task tapi Supabase down | Toast red + task revert ke kolom asal |

### Scenario 8: Sprint 1+2 Regression

| # | Action | Expected |
|---|---|---|
| 36 | Login + Logout | Tetap berfungsi |
| 37 | Refresh saat login | Session persist |
| 38 | Wrong credentials | Error message Indonesian |
| 39 | F3 Three Views (List/Kanban/Gantt) | Semua tab work |
| 40 | F14 project status update | Work dengan toast (Sprint 3 added) |
| 41 | URL filter persist saat switch view | Work |
| 42 | Notif badge persistent saat refresh | Work (data fetch on mount) |

---

## Sign-off checklist

Owner check satu per satu:

- [ ] Scenario 1-2 (notif badge + emission) work per role
- [ ] Scenario 3 (F8 Manager dashboard) work + permission correct
- [ ] Scenario 4 (F13 Productivity) work, period filter URL state
- [ ] Scenario 5 (F5 Workload) work, manager scope
- [ ] Scenario 6 (F6 Bottleneck) work, threshold from app_settings
- [ ] Scenario 7 (UX rollback) work, toast Indonesian per microcopy
- [ ] Scenario 8 (Sprint 1+2 regression) all pass
- [ ] No console error di browser DevTools
- [ ] Bundle 142KB gzipped initial (verified `npm run build`)

Kalau semua check ✅ → owner reply approval, lalu PR `sprint-3 → main`.

Kalau ada issue → flag bug ke saya dengan:
- Screenshot error
- DevTools Console + Network tab
- User role + scenario yang fail

---

## Known limitations Sprint 3

By design, defer Sprint 4+ (per Q answers + retro):

- **@mention parsing** untuk type='mentioned' notif — defer Q3
- **2-day overdue escalation** untuk type='escalation' notif — defer Q3
- **Notif deep link ke task detail** (currently /projects fallback)
- **Realtime broadcast** notif (currently 30s polling)
- **Per-project cycle time** F13 (currently global avg only)
- **Activity_log table** untuk F6 accurate stuck tracking (currently `updated_at` proxy)
- **Admin UI app_settings edit** (currently SQL Editor)
- **pg_cron auto-schedule** deadline notif (manual call atau owner setup)

Tidak ada blocker untuk Sprint 3 sign-off. Limitations explicit di retro doc.
