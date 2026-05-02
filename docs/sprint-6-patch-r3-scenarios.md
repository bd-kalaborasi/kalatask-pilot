# Sprint 6 Patch Round 3 — E2E Scenario Catalog

**Target:** 62 new scenario across 12 domain (Round 2 gap closure)
**Real login flow:** WAJIB per scenario (gak boleh shortcut)
**Test data source:** Seed factory `seed-comprehensive.ts`
**File location:** `apps/web/tests/e2e/sprint-6-patch-r3/{domain}.spec.ts`

---

## Test Data Fixtures (dari seed factory)

```typescript
// Reusable user credentials
export const TEST_USERS = {
  admin: { 
    email: 'admin.test@kalaborasi.com', 
    password: 'TestAdmin1!',
    fullName: 'Admin Test',
    role: 'admin'
  },
  manager1: { 
    email: 'manager1.test@kalaborasi.com', 
    password: 'TestMgr1!',
    fullName: 'Manager Satu',
    role: 'manager'
  },
  manager2: { 
    email: 'manager2.test@kalaborasi.com', 
    password: 'TestMgr1!',
    fullName: 'Manager Dua',
    role: 'manager'
  },
  member1: { 
    email: 'member1.test@kalaborasi.com', 
    password: 'TestMbr1!',
    fullName: 'Member Satu',
    role: 'member'
  },
  member2: { 
    email: 'member2.test@kalaborasi.com', 
    password: 'TestMbr1!',
    fullName: 'Member Dua',
    role: 'member'
  },
  viewer1: { 
    email: 'viewer1.test@kalaborasi.com', 
    password: 'TestVwr1!',
    fullName: 'Viewer Satu',
    role: 'viewer'
  },
};
```

---

## Helper — Real Login Flow Pattern (WAJIB pakai)

```typescript
// helpers/login.ts
async function loginAsUser(page: Page, user: typeof TEST_USERS.admin) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-submit"]');
  
  // Wait for redirect to dashboard (verify login success)
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  // Verify auth state via UI element (not localStorage)
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
}

async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('**/login');
}

// PATTERN per test — JANGAN pakai beforeEach login-once
test('scenario X', async ({ page }) => {
  await loginAsUser(page, TEST_USERS.member1);  // ✅ real login per test
  
  // ... test action ...
  
  await logout(page);  // ✅ logout per test
});
```

---

## DOMAIN A — Dashboard (+7 scenarios)

### D-01: Admin sees full system metrics on dashboard
**Login:** admin
**Steps:**
1. Login as admin via real flow
2. Navigate to /dashboard (auto via login redirect)
3. Verify visible KPI cards: Completion Rate, Velocity, On-time Delivery, Avg Cycle Time
4. Verify all 4 KPIs show numeric value (not 0 or empty — seed data ensures populated)
5. Verify Top Performer ranking shows ≥ 3 users
6. Verify Insights section: BEST DAY, BOTTLENECK, RECOMMENDATION cards visible
**Expected:** All sections render with data, no empty states
**Logout:** yes

### D-02: Manager sees team-scoped metrics
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /dashboard
3. Verify KPIs show team metrics (filtered by manager scope per RLS)
4. Verify Top Performer ranking shows team members only
5. Compare metric value vs admin view (kalau ke-record berbeda, RLS scope works)
**Expected:** Metrics scope-aware per role
**Logout:** yes

### D-03: Member sees personal-scoped metrics
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /dashboard
3. Verify KPIs show personal metrics
4. Verify "Top Performer ranking" tidak show kalau permission denied OR show personal rank only
**Expected:** Personal scope enforced
**Logout:** yes

### D-04: Viewer sees read-only dashboard
**Login:** viewer1
**Steps:**
1. Login as viewer1
2. Navigate to /dashboard
3. Verify KPI render
4. Verify "+ Tugas Baru" CTA tidak visible (viewer can't create)
5. Verify Insights "RECOMMENDATION" action button disabled atau hidden
**Expected:** Read-only enforcement
**Logout:** yes

### D-05: Period filter changes metrics (7/30/90/180 hari)
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /dashboard
3. Default period: 7 hari, capture metric value
4. Click "30 hari" filter
5. Verify metric value berubah (data 30 days vs 7 days)
6. Click "90 hari", verify change
7. Click "180 hari", verify change
**Expected:** Filter triggers data refetch + UI update
**Logout:** yes

### D-06: KPI card hover shows trend tooltip
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /dashboard
3. Hover over "Completion Rate" KPI card
4. Verify tooltip appears with trend detail (e.g., "+12% vs minggu lalu")
5. Tooltip dismisses on mouse leave
**Expected:** Tooltip visible on hover, hidden on leave
**Logout:** yes

### D-07: Insights "RECOMMENDATION" action navigates correctly
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /dashboard
3. Locate "RECOMMENDATION" insight: "Reassign 3 task overdue"
4. Click "Reassign" button
5. Verify navigate to /tasks dengan filter status=overdue
6. Verify 3 task overdue ter-filter di list
**Expected:** Action navigates dan apply filter
**Logout:** yes

---

## DOMAIN B — Tasks (+11 scenarios)

### T-01: Member creates task with full form
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Click "+ Tugas Baru"
4. Fill form: title="Review Q4 budget", description="Detail review per dept", priority="High", deadline="next Friday"
5. Select assignee: self
6. Submit
7. Verify task appear di list dengan title persis
**Expected:** Task created, list update
**Logout:** yes

### T-02: Member creates task minimal form (only required field)
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Click "+ Tugas Baru"
4. Fill only: title="Quick task"
5. Submit
6. Verify task created with default: status=todo, priority=medium, no deadline
**Expected:** Minimum field validation works
**Logout:** yes

### T-03: Edit task title inline
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Click task row to open detail
4. Click title to enter edit mode
5. Change title to "Updated title"
6. Press Enter atau click save
7. Verify title updated in detail + list view
**Expected:** Inline edit works
**Logout:** yes

### T-04: Status change via list view dropdown
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Locate task with status=todo
4. Click status badge (dropdown trigger)
5. Select "In Progress"
6. Verify badge update + optimistic UI
7. Refresh page, verify persisted
**Expected:** Status update from list view (Sprint 6 patch r1 fix)
**Logout:** yes

### T-05: Status change via Kanban drag-drop
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /projects
3. Open project with kanban view
4. Drag task from "Todo" column to "In Progress"
5. Verify task moved + status updated
6. Refresh, verify persisted
**Expected:** Drag-drop changes status
**Logout:** yes

### T-06: Manager reassigns task to different user
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /tasks (manager scope)
3. Open task detail (assigned to member1)
4. Click assignee, select member2
5. Save
6. Verify task assignee updated
7. Logout, login as member2
8. Verify task appear in member2 task list
**Expected:** Reassignment + RLS scope works
**Logout:** yes (twice)

### T-07: Edit task deadline
**Login:** member1
**Steps:**
1. Login as member1
2. Open task detail
3. Click deadline field
4. Pick date 2 weeks from now
5. Save
6. Verify deadline updated, "in X days" countdown correct
**Expected:** Deadline edit works
**Logout:** yes

### T-08: Edit task priority
**Login:** member1
**Steps:**
1. Login as member1
2. Open task detail
3. Change priority from "Medium" to "Urgent"
4. Save
5. Verify priority badge updated, color changes (visual feedback)
**Expected:** Priority change + visual update
**Logout:** yes

### T-09: Delete task with confirmation
**Login:** member1
**Steps:**
1. Login as member1
2. Open task detail
3. Click "Hapus" (or trash icon)
4. Verify confirmation modal: "Yakin mau hapus tugas ini?"
5. Click "Ya, hapus"
6. Verify task removed from list, redirect to /tasks
**Expected:** Confirmation flow + task deletion
**Logout:** yes

### T-10: Filter tasks by status
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Click filter "Status"
4. Select "In Progress"
5. Verify list show only in_progress tasks
6. Clear filter, verify all tasks show
**Expected:** Filter works
**Logout:** yes

### T-11: Search tasks full-text
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Type search "review" in search box
4. Wait debounce (~300ms)
5. Verify list filter to tasks with "review" in title or description
6. Clear search, verify all show
**Expected:** Search debounced, filters correctly
**Logout:** yes

---

## DOMAIN C — Edge Cases (+10 scenarios)

### E-01: Network offline mid-action
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Click "+ Tugas Baru", fill title="Offline test"
4. Simulate offline: page.context().setOffline(true)
5. Click submit
6. Verify error toast: "Koneksi terputus..." atau retry indicator
7. Set online: setOffline(false)
8. Retry submit, verify success
**Expected:** Offline detection + retry path
**Logout:** yes

### E-02: Session expired during action
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /tasks
3. Open task detail
4. Wait/simulate session expiry (60+ min OR manual cookie expire)
5. Click "Edit"
6. Verify redirect to /login dengan message "Sesi habis, silakan login ulang"
**Expected:** Session expiry handled gracefully
**Logout:** yes (after re-login)

### E-03: Permission denied (member tries admin route)
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /admin/usage (admin-only)
3. Verify redirect ke /dashboard atau show 403 page
4. Verify message: "Akses ditolak. Hubungi admin..."
**Expected:** RLS denial + UX
**Logout:** yes

### E-04: Concurrent edit conflict
**Login:** member1 dan member2 (2 browser context)
**Steps:**
1. Login member1 in context A
2. Login member2 in context B (admin reassign task ke shared)
3. Both open same task detail
4. Member1 edit title to "A version", save
5. Member2 edit title to "B version" (without refresh), save
6. Verify last-write-wins atau conflict warning
**Expected:** Optimistic locking atau conflict UI
**Logout:** yes (both)

### E-05: Long title overflow
**Login:** member1
**Steps:**
1. Login as member1
2. Create task with title 250 characters (over limit 200)
3. Submit
4. Verify validation error: "Maksimal 200 karakter"
5. Truncate to 200, submit success
**Expected:** Field validation + helpful error
**Logout:** yes

### E-06: Empty state /tasks for new user
**Login:** member2 (assumed no tasks assigned via seed)
**Steps:**
1. Login as member2
2. Navigate to /tasks
3. Verify empty state: "Belum ada tugas di sini. Yuk, buat tugas pertamamu!"
4. Verify CTA button "+ Tugas Baru"
5. Click CTA, verify modal opens
**Expected:** Empty state proper UX
**Logout:** yes

### E-07: Empty state /admin/import for fresh start
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import (after seed cleanup)
3. Verify empty state both tab MoM dan CSV
4. Verify CTA upload button visible
**Expected:** Empty state per tab
**Logout:** yes

### E-08: 404 page for invalid route
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /this-route-does-not-exist
3. Verify 404 page: "Halaman yang kamu cari nggak ada..."
4. Verify "Kembali ke Dashboard" link
5. Click link, verify navigate to /dashboard
**Expected:** 404 graceful
**Logout:** yes

### E-09: Form validation inline errors
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/users (or /settings/team)
3. Click "Undang anggota"
4. Submit form empty
5. Verify inline errors per field (email required, role required)
6. Fill invalid email "not-an-email"
7. Submit, verify "Email belum sesuai format..."
8. Fix to valid email, submit, verify success
**Expected:** Inline validation, no modal popup
**Logout:** yes

### E-10: File upload too large
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import (Notulensi tab)
3. Try upload .md file > 5MB (test fixture)
4. Verify error: "File maksimal 5MB. Coba kompres dulu..."
5. Upload smaller file, verify success
**Expected:** Size validation + helpful error
**Logout:** yes

---

## DOMAIN D — MoM Import (+2 scenarios)

### MM-01: Approve specific item per row (granular)
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import (Notulensi tab)
3. Open existing pending_review MoM (from seed)
4. Identify item with HIGH confidence
5. Click "Approve" per row (NOT bulk)
6. Verify only 1 item processed, others remain pending
7. Verify task created with source='mom-import'
**Expected:** Granular approval works
**Logout:** yes

### MM-02: Re-upload same file (duplicate detection)
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import
3. Upload sample 04-24.md
4. Wait parse complete
5. Try upload SAME file again
6. Verify warning: "File ini sudah pernah di-import {date}. Tetap proses?"
7. Click "Tetap proses", verify new MoM record created
**Expected:** Duplicate detection + override option
**Logout:** yes

---

## DOMAIN E — CSV Import (+5 scenarios)

### CSV-01: Bulk register valid 50 users
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import (Karyawan CSV tab)
3. Upload 50-row valid CSV (test fixture)
4. Verify parse preview show 50 row valid
5. Click "Import Semua"
6. Verify success toast "50 user terdaftar"
7. Navigate /admin/users, verify 50 new user appear
**Expected:** Bulk import works
**Logout:** yes

### CSV-02: Handle invalid format file
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import (Karyawan tab)
3. Upload malformed CSV (missing header)
4. Verify error: "Format CSV salah. Pastikan header: name, email, role"
5. Upload correct CSV, verify success
**Expected:** Format validation + helpful error
**Logout:** yes

### CSV-03: Handle duplicate emails in CSV
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/import (Karyawan tab)
3. Upload CSV with 5 row, 2 duplicate emails
4. Verify preview flag duplicate: warning di row 4 "Email sudah terdaftar"
5. Click "Skip duplicates, import sisanya"
6. Verify 3 user created, 2 skipped, summary shown
**Expected:** Duplicate handling + skip option
**Logout:** yes

### CSV-04: Handle invalid role value
**Login:** admin
**Steps:**
1. Login as admin
2. Upload CSV with role="superadmin" (invalid, only admin/manager/member/viewer allowed)
3. Verify validation error per row
4. Auto-suggest closest valid role atau prompt user fix
**Expected:** Field validation per row
**Logout:** yes

### CSV-05: Switch tab MoM ↔ CSV preserves draft
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate /admin/import (Notulensi tab default)
3. Upload .md file (don't approve)
4. Switch to "Karyawan (CSV)" tab
5. Switch back to "Notulensi (MoM)" tab
6. Verify uploaded file masih ada di state, gak hilang
**Expected:** Tab switch preserve state
**Logout:** yes

---

## DOMAIN F — Admin Usage (+6 scenarios)

### U-01: View 3 progress bars with realistic data
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/usage
3. Verify 3 cards: Database, Storage, MAU
4. Verify each shows: value (MB or count), %, progress bar visual
5. Verify NOT empty (seed creates baseline data)
**Expected:** Real data shown, not 0 / placeholder
**Logout:** yes

### U-02: Refresh button triggers snapshot
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/usage
3. Note current "Last refreshed" timestamp
4. Click "Refresh Sekarang"
5. Verify loading state visible
6. Verify timestamp update + values may change
**Expected:** Refresh triggers RPC + UI update
**Logout:** yes

### U-03: Top 5 tables drill-down
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/usage
3. Verify "Top Tabel Terbesar" section visible
4. Verify ≥ 3 table listed (tasks, comments, etc)
5. Per row: name, size MB, row count
**Expected:** Drill-down detail visible
**Logout:** yes

### U-04: Top 5 files drill-down
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/usage
3. Verify "Top File Terbesar" section
4. Verify list of MoM files uploaded (from seed)
5. Per row: filename, size, uploaded by
**Expected:** Files list with metadata
**Logout:** yes

### U-05: Alert level "warning" trigger
**Login:** admin
**Steps:**
1. Login as admin
2. Inject mock data: db_size > 70% (via seed)
3. Refresh /admin/usage
4. Verify alert level "warning" shown (yellow indicator)
5. Verify message: "Mendekati limit"
**Expected:** Alert level reactive to threshold
**Logout:** yes

### U-06: Historical chart 30 days
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /admin/usage
3. Scroll to historical chart section
4. Verify line chart with 30 data points (1 per day)
5. Verify chart labels (dates) + values
**Expected:** Historical trend visible (seed factory generate 30d data)
**Logout:** yes

---

## DOMAIN G — Workload (+5 scenarios)

### W-01: Manager view team distribution
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /workload
3. Verify cards: Members, Tasks Aktif, Overloaded, Underloaded
4. Verify chart distribution per member
5. Verify member with highest load highlighted
**Expected:** Distribution visualizable
**Logout:** yes

### W-02: Identify overloaded member
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /workload
3. Verify "Anggota perlu perhatian" list
4. Click first member in list
5. Verify navigate to member detail atau modal show their tasks
**Expected:** Drill-down per member works
**Logout:** yes

### W-03: Reassign task from workload page
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /workload
3. Click "Reassign" link near overloaded member
4. Verify modal/page opens dengan task list assignee tersebut
5. Bulk select 2 task, reassign ke underloaded member
6. Submit, verify success + workload update
**Expected:** Reassign workflow works
**Logout:** yes

### W-04: Filter by team
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /workload
3. Default: all team
4. Click filter, select "Team A"
5. Verify only Team A members show
**Expected:** Team filter works
**Logout:** yes

### W-05: Capacity warning indicator
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /workload
3. Verify member dengan task > capacity threshold show warning icon
4. Hover icon, verify tooltip: "Melebihi kapasitas: 12/10 task"
**Expected:** Visual capacity warning
**Logout:** yes

---

## DOMAIN H — Bottleneck (+5 scenarios)

### B-01: View stuck tasks list
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /bottleneck
3. Verify stat row: Total stuck, Avg stuck days, Oldest
4. Verify list of stuck task ≥ 3 (seed generate)
**Expected:** Stuck data visible
**Logout:** yes

### B-02: Heatmap render — status × age intensity
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /bottleneck
3. Verify heatmap section visible
4. Verify color intensity per cell (green/amber/red)
5. Click cell red (high age + stuck), verify task list filtered
**Expected:** Heatmap interactive
**Logout:** yes

### B-03: Detail stuck task
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /bottleneck
3. Click row 1 (oldest stuck task)
4. Verify navigate to /tasks/:id detail
5. Verify task data loaded
**Expected:** Drill-down to task detail
**Logout:** yes

### B-04: Reassign / unblock from bottleneck
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /bottleneck
3. Click action button "Unblock" pada stuck task
4. Verify modal: change status atau reassign options
5. Pilih reassign, select new assignee
6. Submit, verify task removed from stuck list
**Expected:** Unblock workflow
**Logout:** yes

### B-05: Filter by stage
**Login:** manager1
**Steps:**
1. Login as manager1
2. Navigate to /bottleneck
3. Click filter "Stage"
4. Select "Review"
5. Verify list show only stuck-in-review tasks
**Expected:** Stage filter works
**Logout:** yes

---

## DOMAIN I — Productivity (+8 scenarios)

### P-01: View dashboard with realistic data
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Verify 4 KPI: Completion Rate, Velocity, On-time Delivery, Cycle Time
4. Verify each KPI value > 0 (seed populated)
5. Verify trend mini chart per KPI
**Expected:** Dashboard populated
**Logout:** yes

### P-02: Empty state for new period
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Filter "Last 24 hours" (assumed no data fresh)
4. Verify empty state: "Belum ada data untuk periode ini..."
5. Verify CTA "Lihat data minggu lalu"
**Expected:** Empty state proper
**Logout:** yes

### P-03: Period filter changes data
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Default: 30 hari
4. Switch to 90 hari
5. Verify data refetch + KPI value update
**Expected:** Filter triggers reload
**Logout:** yes

### P-04: Velocity trend chart 8 minggu
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Verify "Velocity (8 minggu trend)" chart
4. Verify 8 data points (1 per week)
5. Hover line, verify tooltip per week
**Expected:** Trend chart interactive
**Logout:** yes

### P-05: Completion rate per user view
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Verify "Completion Rate per User" section
4. Verify ≥ 5 user listed dengan % per user
**Expected:** Per-user breakdown
**Logout:** yes

### P-06: On-time delivery breakdown
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Verify "On-time Delivery" KPI
4. Hover/click, drill-down to "completed on/before deadline" breakdown
**Expected:** Drill-down available
**Logout:** yes

### P-07: Cycle time per task type
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Verify "Avg Cycle Time" KPI
4. Verify breakdown per priority atau project
**Expected:** Drill-down by category
**Logout:** yes

### P-08: Top performer list ranking
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate to /productivity
3. Verify "Top Performer" or "Leaderboard" section
4. Verify ≥ 5 user ranked by tasks completed
5. Verify rank number + tasks count
**Expected:** Ranking visible
**Logout:** yes

---

## DOMAIN J — Onboarding (+5 scenarios)

### O-01: New user wizard step 1 — welcome
**Login:** baru-register-user (factory create)
**Steps:**
1. Login as new user (no onboarding completed)
2. Auto-redirect to /onboarding
3. Verify step 1: welcome screen + "Mulai" button
4. Click Mulai, verify proceed to step 2
**Expected:** Wizard auto-trigger first login
**Logout:** yes

### O-02: Skip step
**Login:** new user
**Steps:**
1. Login as new user
2. /onboarding step 2 (team setup)
3. Click "Lewati dulu" link
4. Verify proceed to next step (team_setup_status = skipped)
**Expected:** Skip option works
**Logout:** yes

### O-03: Complete all steps
**Login:** new user
**Steps:**
1. Login as new user
2. /onboarding step 1 → click Mulai
3. Step 2: fill team name → Lanjut
4. Step 3: skip create project → Lanjut
5. Step 4: skip first task → Selesai
6. Verify redirect /dashboard with welcome toast
7. Verify onboarding_completed=true di profile
**Expected:** Full flow completion
**Logout:** yes

### O-04: Resume from incomplete step
**Login:** user with onboarding_step=2
**Steps:**
1. Login as user with onboarding step 2 saved
2. Navigate any route (e.g. /tasks)
3. Verify auto-redirect ke /onboarding step 2 (resume)
**Expected:** Resume from saved progress
**Logout:** yes

### O-05: Tooltip dismissable
**Login:** new user
**Steps:**
1. Login as new user, complete onboarding wizard
2. Navigate /tasks (first time)
3. Verify tooltip: "Klik di sini untuk buat tugas baru..."
4. Click "X" or "Mengerti"
5. Verify tooltip dismissed
6. Refresh page, verify tooltip tidak muncul lagi
**Expected:** Tooltip persistence
**Logout:** yes

---

## DOMAIN K — Settings + Admin (+8 scenarios)

### S-01: Profile edit name
**Login:** member1
**Steps:**
1. Login as member1
2. Navigate to /settings (Akun Saya tab)
3. Edit "Nama Lengkap" to "Member Satu Updated"
4. Click Simpan
5. Verify success toast
6. Refresh, verify name persisted
**Expected:** Profile update works
**Logout:** yes

### S-02: Password change
**Login:** member1
**Steps:**
1. Login as member1 (TestMbr1!)
2. Navigate /settings
3. Section "Ubah Password"
4. Old password: TestMbr1!, new: TestMbr1Updated!
5. Submit
6. Verify success
7. Logout, login dengan new password
**Expected:** Password change + login dengan new
**Logout:** yes

### S-03: Notification preferences
**Login:** member1
**Steps:**
1. Login as member1
2. /settings (Notifikasi tab)
3. Toggle "Email saat di-mention" off
4. Save
5. Verify preference persisted (check via Supabase or refresh)
**Expected:** Notif pref save
**Logout:** yes

### S-04: Admin team list view
**Login:** admin
**Steps:**
1. Login as admin
2. Navigate /admin/users
3. Verify list of all 24 users (from seed)
4. Verify per row: avatar, name, email, role pill, status
5. Verify search box filter works
**Expected:** Team list complete
**Logout:** yes

### S-05: Invite new user
**Login:** admin
**Steps:**
1. Login as admin
2. /admin/users → click "Undang anggota"
3. Fill email "newuser@kalaborasi.com", role "member"
4. Submit
5. Verify success toast: "Undangan terkirim ke {email}"
6. Verify new user appear di list with status "pending"
**Expected:** Invite flow
**Logout:** yes

### S-06: Edit user role
**Login:** admin
**Steps:**
1. Login as admin
2. /admin/users
3. Click row member1
4. Change role from "member" to "manager"
5. Save
6. Verify role updated
7. Logout, login as member1 (now manager), verify access /workload (manager-only)
**Expected:** Role change + permission update
**Logout:** yes (twice)

### S-07: Audit log view
**Login:** admin
**Steps:**
1. Login as admin
2. /admin/users (Audit Log tab)
3. Verify activity log entries (from seed 30d)
4. Verify filter by user, action type, date range
**Expected:** Audit log accessible
**Logout:** yes

### S-08: Usage log per user
**Login:** admin
**Steps:**
1. Login as admin
2. /admin/users → click user row
3. Side panel shows: profile, recent activity, login history
4. Verify "Last login" timestamp
**Expected:** User detail panel
**Logout:** yes

---

## TOTAL: 62 scenarios

### Distribution match Round 2 audit gap:

| Domain | Target | Catalog | Status |
|---|---|---|---|
| Auth | +0 | 0 | (already +4 over) |
| Dashboard | +7 | 7 | ✅ |
| Tasks | +11 | 11 | ✅ |
| Projects | +0 | 0 | (already complete) |
| MoM Import | +2 | 2 | ✅ |
| CSV | +5 | 5 | ✅ |
| Usage | +6 | 6 | ✅ |
| Workload | +5 | 5 | ✅ |
| Bottleneck | +5 | 5 | ✅ |
| Productivity | +8 | 8 | ✅ |
| Onboarding | +5 | 5 | ✅ |
| Settings | +8 | 8 | ✅ |
| Edge cases | +10 | 10 | ✅ |
| **Total** | **62** | **62** | **✅** |

---

## Implementation Notes for Claude Code

### File structure
```
apps/web/tests/e2e/sprint-6-patch-r3/
├── helpers/
│   ├── login.ts          # loginAsUser, logout helpers
│   └── fixtures.ts       # TEST_USERS, common selectors
├── dashboard.spec.ts     # 7 scenario (D-01 to D-07)
├── tasks.spec.ts         # 11 scenario (T-01 to T-11)
├── edge-cases.spec.ts    # 10 scenario (E-01 to E-10)
├── mom-import.spec.ts    # 2 scenario (MM-01, MM-02)
├── csv-import.spec.ts    # 5 scenario (CSV-01 to CSV-05)
├── usage.spec.ts         # 6 scenario (U-01 to U-06)
├── workload.spec.ts      # 5 scenario (W-01 to W-05)
├── bottleneck.spec.ts    # 5 scenario (B-01 to B-05)
├── productivity.spec.ts  # 8 scenario (P-01 to P-08)
├── onboarding.spec.ts    # 5 scenario (O-01 to O-05)
└── settings.spec.ts      # 8 scenario (S-01 to S-08)
```

### Anti-shortcut WAJIB diikuti

- **Login pattern per test:** `await loginAsUser(page, TEST_USERS.role)` di awal test, `await logout(page)` di akhir
- **NO `beforeEach(login-once)`** — itu shortcut yang break brief mandate
- **NO `setStorageState`** — bypass real auth flow
- **NO `localStorage.setItem('auth', ...)`** — backend mock

### Test data dependency

Setiap scenario assume seed factory udah run. Kalau test data missing:
- Skip test dengan reason "seed data missing for scenario X"
- Log warning, continue suite

### Anti-stuck per scenario

- 90 second timeout per scenario
- Kalau timeout: `test.skip()` dengan reason, continue
- Heartbeat tiap 10 scenario complete

### Element selectors

Pakai `data-testid` consistent. Kalau component belum ada testid, tambah saat implement scenario (additive change).

Reference test ID convention:
- Login: `data-testid="email-input"`, `password-input`, `login-submit`
- User menu: `data-testid="user-menu"`, `logout-button`
- Per page: `data-testid="page-{name}"`
- Buttons: `data-testid="btn-{action}"`
- Forms: `data-testid="form-{name}"`

---

## Self-audit at end of Phase C

Claude Code WAJIB output:
```
- Total scenario implemented: ___ (target: ≥ 62)
- Domain coverage: 12/12
- Real login flow used: yes/no per file (sample 5)
- Pass rate: ___%
- Failed scenarios: list with reason
```

Kalau total < 62 → STOP, add missing, jangan claim done.
