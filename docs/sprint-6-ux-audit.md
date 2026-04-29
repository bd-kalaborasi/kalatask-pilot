# Sprint 6 UX Audit — Existing Routes

**Date:** 2026-04-29
**Scope:** All 13 routes in `apps/web/src/App.tsx` post Sprint 5 merge.
**Goal:** Identify top 3 highest severity for Stitch redesign treatment.

---

## Audit method

Each route reviewed against principles:
- Visual hierarchy (primary action menonjol)
- Whitespace + density
- Loading / empty / error states
- Microcopy quality
- Navigation depth + breadcrumbs
- Mobile responsiveness
- Accessibility (color contrast + keyboard + ARIA)

Severity:
- **HIGH** = critical UX gap atau confusing flow
- **MEDIUM** = polish needed, functional OK
- **LOW** = minor refinement

---

## Per-route findings

### 1. `/` Dashboard (DashboardPage.tsx — 84 LOC)

**Severity:** **MEDIUM**

**Findings:**
- Sparse content: 1 card "Akses Kamu" + role description + 2 buttons (Buka Projects, Buka tutorial). Dashboard feels under-utilized untuk landing page.
- No quick stats (open task count, recent activity) — user harus klik Projects untuk dapat info.
- Loading state simple "Memuat profil..." text — bisa skeleton.
- Sample project mention saat onboarding bagus, tapi tidak surface task counts at-a-glance.

**Improvement targets:**
- Add quick stat tiles (open tasks assigned to me, overdue, this week's deadline)
- Recent activity feed (last 5 task updates)
- Cleaner CTA hierarchy

---

### 2. `/projects` ProjectsPage.tsx — 139 LOC

**Severity:** **LOW**

**Findings:**
- Filter bar + grid card layout works.
- Empty state already friendly (Sprint 4 polish).
- Cards have minimal info — just name + status badge.

**Improvement targets:**
- Add task count + assignee avatar pile per card
- Sort options (recent, alphabet, status)

---

### 3. `/projects/:projectId` ProjectDetailPage.tsx — 345 LOC

**Severity:** **HIGH** ⭐

**Findings:**
- **Largest page, densest information.** Tabs (List/Kanban/Gantt) + filters + tasks list = visual overload risk.
- Tasks filter bar di top, view toggle di kanan — admin user perlu scan ke 2 area sebelum action.
- Member dengan banyak task: kanban scroll horizontal di mobile (5 columns) cramped.
- Task card density tinggi (title + assignee + priority + deadline + drag handle = 4-5 elements per card).
- No quick filter shortcut "Tasks assigned to me" — selalu manual filter.

**Top concerns:**
- Visual hierarchy diluted — primary action ambiguous
- Mobile kanban horizontal scroll painful

**Improvement targets:**
- Stitch redesign mobile-friendly kanban (vertical swipe between columns?)
- Toolbar consolidation (filters + view + create button = 1 sticky row)
- Task card density rendah (title + 1-2 secondary fields, hover for more)

---

### 4. `/projects/:projectId/tasks/:taskId` TaskDetailPage.tsx — 164 LOC

**Severity:** **MEDIUM**

**Findings:**
- Title + status badges di header OK.
- Detail Card has 3-4 rows (deadline, estimasi, source, description) — clean.
- Comments thread di bottom — good.
- Lacking: assign-to-someone-else, change deadline inline, attach file (defer).

**Improvement targets:**
- Inline edit untuk deadline + assignee (admin/manager)
- Activity timeline (created, status changes, comments) — single feed
- Quick actions: Mark done, Reassign

---

### 5. `/dashboard/manager` ManagerDashboardPage.tsx — 190 LOC

**Severity:** **MEDIUM**

**Findings:**
- 2 charts (workload bar, completion rate) + member list table.
- Color usage di chart inconsistent dengan brand sky/deep.
- Empty state per Sprint 4 audit OK.

**Improvement targets:**
- Stat tiles di top (total team task, open, overdue) before charts
- Chart colors ke brand sky-300/sky-600 instead of arbitrary

---

### 6. `/dashboard/productivity` ProductivityDashboardPage.tsx — 185 LOC

**Severity:** **MEDIUM**

**Findings:**
- Period filter (7/30/90/180 hari) di top OK.
- 4 metric tiles + 2 charts.
- Recharts color sometimes default blue, not brand.

**Improvement targets:**
- Period filter as pill-group (already implemented but visual polish)
- Chart styling brand-aligned

---

### 7. `/workload` WorkloadPage.tsx — 187 LOC

**Severity:** **LOW**

**Findings:**
- Member list dengan workload indicator (normal/high/overloaded). Functional.
- Bar chart sederhana.

**Improvement targets:**
- Sortable columns (default by overloaded → normal)

---

### 8. `/bottleneck` BottleneckPage.tsx — 189 LOC

**Severity:** **LOW**

**Findings:**
- Threshold display + bottleneck task list. Functional.
- Empty state "Tidak ada bottleneck 🎉" sudah baik (Sprint 3).

---

### 9. `/onboarding` (modal Wizard di setiap page, no route)

**Severity:** **LOW**

**Findings:**
- 5-step wizard (Sprint 4) sudah polished.
- Reopen via Dashboard link works.

---

### 10. `/admin/csv-import` AdminCsvImportPage.tsx — 418 LOC

**Severity:** **MEDIUM**

**Findings:**
- Upload UI + preview table + commit flow. Functional.
- 418 LOC = page besar, dapat di-decompose ke component.
- Preview table dense untuk error visualization.

**Improvement targets:**
- Decompose ke 4 component (UploadZone, PreviewTable, SummaryStats, CommitFlow)
- Error reporting cleaner (group by error type)

---

### 11. `/admin/mom-import` AdminMoMImportPage.tsx — 255 LOC

**Severity:** **MEDIUM**

**Findings:**
- Drag-drop upload + history table. Functional.
- History table dense (5 columns: Tanggal, File, Total/HIGH/MEDIUM/LOW/UNRESOLVED, Status, Aksi).

**Improvement targets:**
- Stat tiles for at-a-glance counts (total imports, pending review)
- Card-style history (alternative to table)

---

### 12. `/admin/mom-import/:id` AdminMoMReviewPage.tsx — 322 LOC

**Severity:** **HIGH** ⭐

**Findings:**
- **Confidence-grouped review queue (HIGH/MEDIUM/LOW/UNRESOLVED).** Each item has: title, raw PIC, deadline, priority, project, candidate dropdown, decision radio (create/skip/reject). 4 radio buttons + 1 dropdown per item × ≤47 items = 200+ interactive elements possible.
- **Decision UX overload.** Admin yang baru lihat tidak tahu prioritas action.
- **Approve button di bottom sticky** — bagus, tapi bulk-action untuk HIGH (auto-default create) tidak prominent.
- Konteks (description) sometimes truncated/missing visually.

**Top concerns:**
- Cognitive load extreme untuk MoM dengan 40+ actions
- No batch-action UX ("Approve all HIGH" button)
- Mobile usability terlimit (table cramped)

**Improvement targets:**
- Stitch redesign: grouped accordion dengan summary stats per group + bulk action
- "Approve HIGH only (X items)" sebagai shortcut prominent
- Per-item compact view + expandable detail
- Mobile: vertical list dengan large touch targets

---

### 13. `/admin/usage` AdminUsagePage.tsx — 213 LOC

**Severity:** **HIGH** ⭐

**Findings:**
- 3 progress bar tile (DB, Storage, MAU) + alerts banner + top tables list + refresh button.
- **Storage shown as "—" / "n/a"** karena Sprint 5 defer — broken UX feel (looks like bug).
- Alerts useful tapi hidden below progress bars; should be prominent.
- Top tables list small text, hard to scan.
- No historical chart (PRD line chart 30 days — Sprint 5 deferred).

**Top concerns:**
- "n/a" Storage feels broken (visual signal of incompleteness)
- No trends — admin can't tell direction (growing? stable?)
- Density rendah but layout uses kartu-kartu kecil yang scattered

**Improvement targets:**
- Stitch redesign: hero alert banner di top, KPI tiles dengan trend arrow, historical sparkline mini per metric
- Replace "n/a" Storage dengan "Coming soon" friendly message (atau remove dari layout entirely)
- Top tables sebagai sortable table dengan size bar visual

---

### 14. `/login` LoginPage.tsx — 108 LOC

**Severity:** **LOW**

**Findings:**
- Simple email + password form. Brand wordmark di top. Empty state OK.

---

## Top 3 routes for Stitch redesign treatment

Per severity + impact:

1. **⭐ `/admin/mom-import/:id` MoM Review Queue** — HIGH cognitive load, mobile usability gap, no batch action. **Highest user pain post Sprint 5 launch.**
2. **⭐ `/admin/usage` Usage Dashboard** — broken-feel "n/a", no trends, layout scattered. **Owner-facing, first impression matters.**
3. **⭐ `/projects/:projectId` Project Detail** — densest page, mobile kanban issue, toolbar fragmentation. **Most-frequented page after login.**

These 3 = Phase 3 Stitch generation candidates.

---

## Lower-priority routes (Phase 4 polish via principles, no Stitch redesign)

- Dashboard (add quick stats)
- Manager + Productivity Dashboards (chart brand colors)
- ProjectsPage (sortable + avatar pile)
- TaskDetailPage (inline edit + activity timeline)
- AdminMoMImportPage (stat tiles + card history)
- AdminCsvImportPage (decompose components)
- WorkloadPage, BottleneckPage, LoginPage, Wizard (minor)

---

## Carry-over from Sprint 5

- a11y 88 → 90 (color-contrast text-zinc-500 + landmark-one-main LoginPage)
- comment RPC pgTAP coverage (Sprint 4.5 carry-over)
- pg_cron daily usage_snapshot
