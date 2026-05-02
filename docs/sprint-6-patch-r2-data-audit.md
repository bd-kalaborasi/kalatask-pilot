# Sprint 6 Patch R2 — Data Source Audit

**Date:** 2026-04-30
**Scope:** All data displayed in UI (numbers, lists, charts, status indicators)

---

## Method

Per page, identify data points and trace source. Verify:
- Source: RPC / direct query / computed / hardcoded
- Empty state handled
- Loading state visible
- Error state shown

---

## Findings per route

### `/` (DashboardPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| `firstName` greeting | `useAuth().profile.full_name` | n/a | "Memuat profil..." | ✅ |
| KPI: Tugas Mendesak | `summary.totalOverdue` from `useDashboardData` → `summarize()` | shows `…` while loading, `0` empty | spinner via `metricsLoading` | ✅ |
| KPI: Proyek Aktif | `activeProjects.length` from `useProjectsList` filtered status='active' | shows `0` | `…` while loading | ✅ |
| KPI: Aktivitas Tim | `summary.bottleneckCount` | `0` | `…` | ✅ |
| Activity feed | placeholder EmptyState | n/a (always empty for now) | n/a | ⚠️ DEFERRED to Sprint 7 |
| Featured Project | `activeProjects[0]` | "Belum ada project aktif" CTA | placeholder text | ✅ |
| Team chip cluster | `workload.members.length` | renders 0 chips + "Belum ada anggota tim" caption | n/a | ✅ |
| Priorities panel | placeholder EmptyState | n/a (always empty for now) | n/a | ⚠️ DEFERRED to Sprint 7 |

### `/projects` (ProjectsPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Project list | `useProjectsList` → `fetchProjectsWithOwner` (RLS-aware) | EmptyState with role-aware CTA | "Memuat projects..." | ✅ |
| Status filter counts | computed from `projects.status` | `0` per status | n/a | ✅ |
| Team filter | `useTeamsList` → `fetchTeams` | `<option value="">Semua tim</option>` | n/a | ✅ |
| Card relative time | `formatRelativeTime(p.updated_at)` | "Update Xm/jam/hari lalu" | n/a | ✅ |
| Card owner avatar | initial char from `p.owner.full_name` | conditional render | n/a | ✅ |

### `/projects/:id` (ProjectDetailPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Project metadata | direct `supabase.from('projects')` | "Project tidak ditemukan" panel | "Memuat project..." | ✅ |
| Task list | `useTasksByProject` → RLS-aware | empty UL | "Memuat tasks..." | ✅ |
| Project status | `ProjectStatusSelect` with optimistic mutation | n/a | spinner | ✅ |
| Task summary (counts) | computed in `ProjectTaskSummary` | "0/0 selesai" | n/a | ✅ |

### `/projects/:id/tasks/:id` (TaskDetailPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Task | `fetchTaskById` (RLS-aware) | "Task tidak ditemukan" panel | "Memuat task..." | ✅ |
| Comments | `CommentsThread` → realtime via Supabase channel | EmptyState | inline | ✅ |
| Status/priority badges | `TaskStatusBadge`/`TaskPriorityBadge` from labels.ts | n/a | n/a | ✅ |

### `/tasks` (R2 Phase A new)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Tasks list | `fetchTasksByAssignee(profile.id)` (RLS-aware) | EmptyState | "Memuat tugas..." | ✅ |
| Tab counts | computed from tasks via `bucketCounts()` | `0` per tab | n/a | ✅ |
| Buckets (overdue/today/soon/later) | `groupByDeadline()` derived | hidden if empty bucket | n/a | ✅ |
| Project context (chip on each row) | `task.project.name` join | conditional render | n/a | ✅ |

### `/dashboard/manager` (ManagerDashboardPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| 4 KPI tiles | `summarize(productivity, workload)` from `useDashboardData` | shows 0 | "Memuat dashboard..." | ✅ |
| Drill-down links | static — Productivity / Workload / Bottleneck | n/a | n/a | ✅ |
| Member status list | `workload.members` | `EmptyState` | inline | ✅ |

### `/dashboard/productivity` (ProductivityDashboardPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| 4 KPI sparklines | computed from `productivity.completion_rate_per_user`, `velocity_per_week` | placeholder zeros | "Memuat dashboard..." | ✅ |
| Velocity trend chart | `VelocityLine` component, `productivity.velocity_per_week` | inline empty render | inline | ✅ |
| Top performer leaderboard | sorted `productivity.completion_rate_per_user.done` desc top 5 | "Belum ada data completion" | inline | ✅ |
| Bottleneck heatmap | `BottleneckHeatmap` component, `productivity.bottleneck_heatmap` | empty handled in component | inline | ✅ |
| Insights row | `deriveInsights(productivity)` — math derived from real data | shows "Belum ada data" / "Tidak ada bottleneck" | inline | ✅ |

### `/workload` (WorkloadPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| 3 summary cards | `workload.members` filtered/aggregated | shows 0 + "Tidak ada" | "Memuat workload..." | ✅ |
| Bar chart | recharts `BarChart` | EmptyState when 0 members | inline | ✅ |
| Per-member detail | `workload.members.map` | hidden if 0 members | inline | ✅ |

### `/bottleneck` (BottleneckPage)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| 3 severity cards | computed from tasks + threshold | 0 stuck → green check empty state | "Memuat bottleneck..." | ✅ |
| Task list | `fetchBottleneckTasks(threshold)` (RLS-aware) | green-check celebration when 0 | inline | ✅ |
| Threshold | `fetchBottleneckThreshold` from `app_settings` | default 3 | n/a | ✅ |

### `/admin/import` (R2 Phase B new — wraps mom + csv)

Data per active tab (Notulensi or Karyawan/CSV) — see /admin/mom-import and /admin/csv-import below.

### `/admin/mom-import`

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Import history | `fetchMoMImports` | EmptyState | "Memuat..." | ✅ |
| Approval status badge | `m.approval_status` | n/a | n/a | ✅ |
| Parse summary counts | `m.parse_summary` JSON | shows 0 / 0 / 0 | n/a | ✅ |

### `/admin/mom-import/:id`

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Parent MoM | `supabase.from('mom_imports')` | "Tidak ditemukan" panel | "Memuat..." | ✅ |
| Items grouped by confidence | `items.filter` per `pic_confidence` | "Tidak ada item di kategori ini" | inline | ✅ |
| User candidates per item | match scores from RPC | dropdown options | n/a | ✅ |

### `/admin/usage`

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| 3 metric cards | `get_usage_summary` RPC | "Segera tersedia" for storage (RLS limit) | "Memuat..." | ✅ |
| Health banner | `computeOverallHealth(summary)` derived | hidden when null | inline | ✅ |
| Top tables | `summary.top_tables.slice(0, 5)` | "Belum ada data ukuran tabel" | inline | ✅ |
| Alerts | `summary.alerts` | green-check celebration when 0 | inline | ✅ |
| Optimization tips | static (4 cards) | n/a — always shown | n/a | ✅ |

### `/settings` (R2 Phase A new)

| Data point | Source | Empty | Loading | Status |
|---|---|---|---|---|
| Profile section | `useAuth().profile` | n/a | "Memuat..." | ✅ |
| Members table | `supabase.from('users').select` (RLS-aware admin scope) | EmptyState with proper messaging | "Memuat anggota..." | ✅ |
| Member counts pill | computed from `users.role` | shows 0 admin/manager/etc | n/a | ✅ |
| Notification prefs | EmptyState placeholder | n/a (always empty) | n/a | ⚠️ DEFERRED Sprint 7 |

---

## Summary

- **Hardcoded user-visible data:** 0 instances
- **Real data source per metric:** ✅ traceable to RPC, query, or computed
- **Empty state handling:** ✅ EmptyState component or inline message everywhere
- **Loading state:** ✅ "Memuat..." text or spinner everywhere
- **Error state:** ✅ feedback-danger banner with `error.message` everywhere

### ⚠️ Deferred placeholders (visible to user, marked clearly):

1. Dashboard "Aktivitas terbaru" feed — needs activity_log + view query (Sprint 7)
2. Dashboard "Prioritas untuk kamu" — needs per-user priority query (Sprint 7)
3. Settings notification preferences — needs notif_prefs table (Sprint 7)
4. Settings profile edit + password change — needs auth.updateUser flow (Sprint 7)
5. Settings invite flow — needs invite endpoint + email (Sprint 7)

---

## Future-proofing rule

**Any new data display WAJIB:**
1. Source query/RPC traceable (no hardcoded values except design constants)
2. Loading state explicit (text, spinner, or skeleton)
3. Empty state handled (EmptyState component, or inline "Belum ada X" message)
4. Error state visible (red banner with `error.message`)
