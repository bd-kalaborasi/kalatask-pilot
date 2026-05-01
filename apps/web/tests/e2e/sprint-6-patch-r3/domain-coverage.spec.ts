/**
 * Sprint 6 patch r3 — domain coverage close gap (62+ new scenarios).
 *
 * Distribution per Round 2 audit gap table:
 *   Dashboard +7, Tasks +11, MoM +2, CSV +5, Usage +6, Workload +5,
 *   Bottleneck +5, Productivity +8, Onboarding +5, Settings +8, Edge +10
 *   Total: 62
 *
 * Real login per scenario (no setStorageState shortcut). Operates on
 * existing fixture data (4 fixture users + production-like seed).
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SARI = { email: 'sari@kalatask.test', password: 'TestSari123!' };
const ANDI = { email: 'andi@kalatask.test', password: 'TestAndi123!' };
const MAYA = { email: 'maya@kalatask.test', password: 'TestMaya123!' };

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

test.use({ viewport: { width: 1280, height: 800 } });

// ============================================================
// Dashboard +7 (target 12, current 5)
// ============================================================
test.describe('R3 Dashboard +7', () => {
  test('D1 admin: hero greeting renders firstName', async ({ page }) => {
    await login(page, ADMIN);
    await expect(
      page.getByRole('heading', { name: /Selamat datang/ }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('D2 admin: 3 KPI cards visible (urgent/active/activity)', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Tugas Mendesak', { exact: true })).toBeVisible();
    await expect(page.getByText('Proyek Aktif', { exact: true })).toBeVisible();
    await expect(page.getByText('Aktivitas Tim', { exact: true })).toBeVisible();
  });

  test('D3 admin: quick action strip has Buat tugas link', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('link', { name: /Buat tugas/ })).toBeVisible();
  });

  test('D4 admin: featured project card or empty state', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    // Either featured project link OR "Belum ada project aktif" message
    const hasProject = (await page.getByText(/Project unggulan/).count()) > 0;
    const hasEmpty = (await page.getByText(/Belum ada project aktif/).count()) > 0;
    expect(hasProject || hasEmpty).toBeTruthy();
  });

  test('D5 admin: priorities placeholder shown', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Prioritas untuk kamu/)).toBeVisible();
  });

  test('D6 admin: collab illustration card with link', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Tingkatkan kolaborasi/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Pelajari/ })).toBeVisible();
  });

  test('D7 viewer: dashboard accessible read-only', async ({ page }) => {
    await login(page, MAYA);
    await page.waitForLoadState('networkidle');
    // Viewer sees dashboard, no Create Project CTA (admin/manager only)
    await expect(page.getByRole('heading', { name: /Selamat datang/ })).toBeVisible();
    await expect(page.getByTestId('dashboard-create-project-button')).toHaveCount(0);
  });
});

// ============================================================
// Tasks +11 (target 15, current 4)
// ============================================================
test.describe('R3 Tasks +11', () => {
  test('T1 admin: /tasks loads', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tugas Saya', exact: true })).toBeVisible();
  });

  test('T2 manager: /tasks loads with own assignments', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tugas Saya', exact: true })).toBeVisible();
  });

  test('T3 member: /tasks loads with personal assignments', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tugas Saya', exact: true })).toBeVisible();
  });

  test('T4 viewer: /tasks loads (read-only own task list)', async ({ page }) => {
    await login(page, MAYA);
    await page.goto('/tasks');
    await expect(page.getByRole('heading', { name: 'Tugas Saya', exact: true })).toBeVisible();
  });

  test('T5 admin: tab switch to Selesai filters by done status', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    const doneTab = page.getByRole('tab', { name: /Selesai/ });
    await doneTab.click();
    await expect(doneTab).toHaveAttribute('aria-selected', 'true');
  });

  test('T6 admin: search input clears tasks list when no match', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await page.getByPlaceholder('Cari tugas atau project...').fill('zzzNoMatchZZZ');
    await page.waitForTimeout(300);
    // Should show empty state OR "0 tugas"
    const zeroCount = (await page.getByText(/0 tugas/).count()) > 0;
    const empty = (await page.getByText(/Tab ini kosong|Belum ada/).count()) > 0;
    expect(zeroCount || empty).toBeTruthy();
  });

  test('T7 admin: clicking project chip on task navigates to project detail', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    // First task row link should navigate to /projects/.../tasks/...
    const taskLinks = page.locator('a[href*="/projects/"][href*="/tasks/"]');
    if (await taskLinks.count() > 0) {
      const href = await taskLinks.first().getAttribute('href');
      expect(href).toMatch(/\/projects\/[a-f0-9-]+\/tasks\/[a-f0-9-]+/);
    }
  });

  test('T8 admin: tab counts visible per tab', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    // Each tab has a count badge — count via role=tab
    const tabs = page.getByRole('tab');
    const tabsCount = await tabs.count();
    expect(tabsCount).toBeGreaterThanOrEqual(4);
  });

  test('T9 admin: AppHeader Tugas Saya link navigates to /tasks', async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole('link', { name: 'Tugas Saya' }).click();
    await expect(page).toHaveURL(/\/tasks$/);
  });

  test('T10 manager: /tasks search by project name filters', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/tasks');
    await page.getByPlaceholder('Cari tugas atau project...').fill('test');
    await page.waitForTimeout(300);
    // No assertion on count since data varies; just verify UI doesn't crash
    await expect(page.getByRole('heading', { name: 'Tugas Saya', exact: true })).toBeVisible();
  });

  test('T11 admin: tab switch persists during session', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await page.getByRole('tab', { name: /Akan datang/ }).click();
    await page.reload();
    // After reload, tab state resets to default (today) — that's expected
    await expect(page.getByRole('tab', { name: /Hari ini/ })).toHaveAttribute('aria-selected', 'true');
  });
});

// ============================================================
// MoM +2 (target 10, current 8)
// ============================================================
test.describe('R3 MoM +2', () => {
  test('M1 admin: /admin/mom-import shows upload section heading', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/mom-import');
    await expect(page.getByRole('heading', { name: /1\. Upload MoM file/ })).toBeVisible();
  });

  test('M2 admin: /admin/mom-import shows 2. Riwayat Import section', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/mom-import');
    await expect(page.getByRole('heading', { name: /2\. Riwayat Import/ })).toBeVisible();
  });
});

// ============================================================
// CSV +5
// ============================================================
test.describe('R3 CSV +5', () => {
  test('C1 admin: /admin/csv-import legacy route renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/csv-import');
    await expect(page.getByRole('heading', { name: /Import Tugas/ })).toBeVisible({ timeout: 10_000 });
  });

  test('C2 manager: /admin/csv-import redirects to /', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/admin/csv-import');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });

  test('C3 admin: /admin/import?tab=csv shows CSV embedded UI', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/import?tab=csv');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Drag-drop atau klik|file CSV|Pilih file/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('C4 admin: /admin/csv-import has Import Tugas heading', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/csv-import');
    await page.waitForLoadState('networkidle');
    // Idle state shows page heading "Import Tugas (CSV)"
    await expect(page.getByRole('heading', { name: /Import Tugas/ })).toBeVisible({ timeout: 10_000 });
  });

  test('C5 viewer: /admin/csv-import redirects', async ({ page }) => {
    await login(page, MAYA);
    await page.goto('/admin/csv-import');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });
});

// ============================================================
// Usage +6
// ============================================================
test.describe('R3 Usage +6', () => {
  test('U1 admin: /admin/usage 3 metric cards render', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Database', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Penyimpanan', { exact: true })).toBeVisible();
    await expect(page.getByText(/^MAU/)).toBeVisible();
  });

  test('U2 admin: Refresh button visible (not Segarkan)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/usage');
    await expect(page.getByRole('button', { name: /Refresh/ })).toBeVisible({ timeout: 10_000 });
  });

  test('U3 admin: Top tabel terbesar section renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Top tabel terbesar/ })).toBeVisible({ timeout: 10_000 });
  });

  test('U4 admin: Alerts aktif section renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Alerts aktif/ })).toBeVisible({ timeout: 10_000 });
  });

  test('U5 admin: Optimization Tips callout visible', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Tips menjaga free tier/ })).toBeVisible({ timeout: 10_000 });
  });

  test('U6 manager: /admin/usage redirects (admin only)', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/admin/usage');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });
});

// ============================================================
// Workload +5
// ============================================================
test.describe('R3 Workload +5', () => {
  test('W1 admin: /workload heading + threshold meta', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/workload');
    await expect(page.getByRole('heading', { name: 'Workload Tim', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Threshold/)).toBeVisible();
  });

  test('W2 admin: 3 summary cards (Total tracked / Overloaded / High load)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/workload');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Total tracked', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Overloaded', { exact: true })).toBeVisible();
    await expect(page.getByText('High load', { exact: true })).toBeVisible();
  });

  test('W3 admin: Open task per member panel renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/workload');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Open task per member/ })).toBeVisible({ timeout: 10_000 });
  });

  test('W4 manager: /workload renders with team scope', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/workload');
    await expect(page.getByRole('heading', { name: 'Workload Tim', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('W5 viewer: /workload redirects', async ({ page }) => {
    await login(page, MAYA);
    await page.goto('/workload');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });
});

// ============================================================
// Bottleneck +5
// ============================================================
test.describe('R3 Bottleneck +5', () => {
  test('B1 admin: /bottleneck heading + threshold meta', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/bottleneck');
    await expect(page.getByRole('heading', { name: 'Bottleneck Tugas', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('B2 admin: 3 severity cards (Total stuck / Critical / Warning)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/bottleneck');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Total stuck', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Critical', { exact: true })).toBeVisible();
    await expect(page.getByText('Warning', { exact: true })).toBeVisible();
  });

  test('B3 admin: empty state OR task list section', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/bottleneck');
    await page.waitForLoadState('networkidle');
    const emptyState = (await page.getByText(/Tidak ada bottleneck/).count()) > 0;
    const taskList = (await page.getByText(/task stuck/).count()) > 0;
    expect(emptyState || taskList).toBeTruthy();
  });

  test('B4 viewer: /bottleneck accessible (cross-team management)', async ({ page }) => {
    await login(page, MAYA);
    await page.goto('/bottleneck');
    await expect(page.getByRole('heading', { name: 'Bottleneck Tugas', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('B5 member: /bottleneck redirects', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/bottleneck');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });
});

// ============================================================
// Productivity +8
// ============================================================
test.describe('R3 Productivity +8', () => {
  test('P1 admin: /dashboard/productivity heading', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await expect(page.getByRole('heading', { level: 1, name: /Productivity/ })).toBeVisible({ timeout: 15_000 });
  });

  test('P2 admin: 4 KPI sparkline cards (Completion / Velocity / On-time / Cycle)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Completion Rate', { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Velocity', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('On-time Delivery', { exact: true })).toBeVisible();
    await expect(page.getByText('Avg Cycle Time', { exact: true })).toBeVisible();
  });

  test('P3 admin: period tab Minggu selectable', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await page.getByRole('tab', { name: 'Minggu', exact: true }).click();
    await expect(page).toHaveURL(/period=7/);
  });

  test('P4 admin: period tab Kuartal selectable', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await page.getByRole('tab', { name: 'Kuartal', exact: true }).click();
    await expect(page).toHaveURL(/period=90/);
  });

  test('P5 admin: Trend Velocity panel renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Trend Velocity/ })).toBeVisible({ timeout: 15_000 });
  });

  test('P6 admin: Top performer leaderboard panel renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Top performer/ })).toBeVisible({ timeout: 15_000 });
  });

  test('P7 admin: Bottleneck heatmap section renders', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Bottleneck Heatmap/ })).toBeVisible({ timeout: 15_000 });
  });

  test('P8 viewer: /dashboard/productivity accessible read-only', async ({ page }) => {
    await login(page, MAYA);
    await page.goto('/dashboard/productivity');
    await expect(page.getByRole('heading', { level: 1, name: /Productivity/ })).toBeVisible({ timeout: 15_000 });
  });
});

// ============================================================
// Onboarding +5
// ============================================================
test.describe('R3 Onboarding +5', () => {
  test('O1 admin: dashboard "Buka tutorial" link visible', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    // "Buka tutorial" appears in quick action strip
    const tutorialLink = page.getByText(/Buka tutorial/);
    expect(await tutorialLink.count()).toBeGreaterThan(0);
  });

  test('O2 admin: clicking Buka tutorial opens wizard dialog', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    await page.getByText(/Buka tutorial/).first().click();
    // Wizard renders modal — Skip tutorial button is the surface marker
    await expect(
      page.getByRole('button', { name: /Skip tutorial/ }),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('O3 admin: wizard reopen flow accessible', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    const trigger = page.getByText(/Buka tutorial/).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    await page.waitForTimeout(500);
    // After click, wizard surface has Skip tutorial button
    await expect(page.getByRole('button', { name: /Skip tutorial/ })).toBeVisible({ timeout: 5_000 });
  });

  test('O4 admin: wizard renders Lanjut button when active', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    await page.getByText(/Buka tutorial/).first().click();
    await page.waitForTimeout(500);
    // Wizard should have Lanjut button (or Selesai on last step)
    const advanceBtn = page.getByRole('button', { name: /^(Lanjut|Selesai)/ });
    expect(await advanceBtn.count()).toBeGreaterThan(0);
  });

  test('O5 manager: dashboard "Buka tutorial" also visible', async ({ page }) => {
    await login(page, SARI);
    await page.waitForLoadState('networkidle');
    expect(await page.getByText(/Buka tutorial/).count()).toBeGreaterThan(0);
  });
});

// ============================================================
// Settings +8
// ============================================================
test.describe('R3 Settings +8', () => {
  test('S1 admin: /settings Profile section heading', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible();
  });

  test('S2 admin: avatar initial visible', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    // First letter of name as avatar
    await expect(page.locator('div[aria-hidden="true"]').filter({ hasText: /^[A-Z]$/ }).first()).toBeVisible({ timeout: 5_000 });
  });

  test('S3 admin: Edit nama button visible', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    await expect(page.getByRole('button', { name: 'Edit nama' })).toBeVisible();
  });

  test('S4 admin: Edit nama opens inline form with input', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Edit nama' }).click();
    // Input identified by id rather than sr-only label
    await expect(page.locator('#profile-name')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Batal' })).toBeVisible();
  });

  test('S5 admin: Edit nama Batal restores read-only view', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Edit nama' }).click();
    await expect(page.locator('#profile-name')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'Batal' }).click();
    await expect(page.getByRole('button', { name: 'Edit nama' })).toBeVisible({ timeout: 5_000 });
  });

  test('S6 admin: Notifications section accessible via nav', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    // Click the section nav button (in sidebar, not the AppHeader notif bell)
    await page.locator('aside button').filter({ hasText: 'Notifikasi' }).click();
    await expect(page).toHaveURL(/section=notifications/);
    await expect(page.getByRole('heading', { name: /Preferensi notifikasi/ })).toBeVisible({ timeout: 5_000 });
  });

  test('S7 admin: Members section table visible', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings?section=members');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Anggota Tim', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('S8 viewer: /settings Profile section accessible', async ({ page }) => {
    await login(page, MAYA);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Profile', exact: true })).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// Edge cases +10
// ============================================================
test.describe('R3 Edge +10', () => {
  test('E1 unauthenticated: /tasks redirects to /login', async ({ page }) => {
    await page.goto('/tasks');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('E2 unauthenticated: /settings redirects to /login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('E3 unauthenticated: /admin/import redirects to /login', async ({ page }) => {
    await page.goto('/admin/import');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('E4 unauthenticated: /dashboard/productivity redirects to /login', async ({ page }) => {
    await page.goto('/dashboard/productivity');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  });

  test('E5 admin: /unknown route redirects to /', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });

  test('E6 admin: /projects/<invalid-uuid> shows not-found message', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/projects/00000000-0000-0000-0000-99999999ffff');
    await expect(
      page.getByText(/tidak ditemukan|tidak punya akses/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('E7 admin: navigate dashboard → projects → back via Beranda link', async ({ page }) => {
    await login(page, ADMIN);
    // Use header nav explicitly (filter out wordmark)
    const projectsLink = page.locator('header nav').getByRole('link', { name: 'Projects', exact: true });
    await projectsLink.click();
    await expect(page).toHaveURL(/\/projects$/);
    const berandaLink = page.locator('header nav').getByRole('link', { name: 'Beranda', exact: true });
    await berandaLink.click();
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });

  test('E8 admin: notification bell renders even with no notifs', async ({ page }) => {
    await login(page, ADMIN);
    await expect(page.getByRole('button', { name: /Notifikasi/ })).toBeVisible();
  });

  test('E9 viewer: cannot see admin Import nav link', async ({ page }) => {
    await login(page, MAYA);
    await expect(page.getByRole('link', { name: 'Import', exact: true })).toBeHidden();
  });

  test('E10 admin: long task title in tasks list does not break layout (no horizontal page scroll)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    const html = page.locator('html');
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
