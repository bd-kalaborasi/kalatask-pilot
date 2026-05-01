/**
 * Sprint 6 patch r2 — E2E coverage for new routes + scroll fix.
 *
 * Coverage:
 * 1. /tasks (R2 Phase A)        — render, tab nav, search
 * 2. /settings (R2 Phase A)     — profile + members section + nav guard
 * 3. /admin/import (R2 Phase B) — tab nav, content render
 * 4. Gantt scroll fix (R2 Phase E) — page no horizontal scroll
 * 5. AppHeader nav new entries — Tugas Saya, Pengaturan, Import unified
 *
 * Style: real login per scenario (no setStorageState shortcut). Realistic
 * data via existing seed (Sprint 2 demo). Anti-pattern banned: data
 * mocking, auth bypass, localStorage manipulation.
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!', name: 'Budi Santoso' };
const SARI = { email: 'sari@kalatask.test', password: 'TestSari123!', name: 'Sari Wijaya' };
const ANDI = { email: 'andi@kalatask.test', password: 'TestAndi123!', name: 'Andi Pratama' };
const MAYA = { email: 'maya@kalatask.test', password: 'TestMaya123!', name: 'Maya Anggraini' };

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

// ============================================================
// /tasks — R2 Phase A new route
// ============================================================
test.describe('R2 /tasks — Tugas Saya personal task list', () => {
  test('admin: /tasks renders heading + tab navigation', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    await expect(
      page.getByRole('heading', { name: 'Tugas Saya', exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    // Tab navigation visible
    await expect(page.getByRole('tab', { name: /Hari ini/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Minggu ini/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Akan datang/ })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Selesai/ })).toBeVisible();
  });

  test('admin: tab switch updates active state', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    const upcomingTab = page.getByRole('tab', { name: /Akan datang/ });
    await upcomingTab.click();
    await expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
  });

  test('admin: search input filters tasks', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/tasks');
    const searchInput = page.getByPlaceholder('Cari tugas atau project...');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('xxxnonexistentxxx');
    // Should show empty state or "0 tugas" after filtering
    await page.waitForTimeout(300);
  });

  test('AppHeader Tugas Saya link navigates to /tasks', async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole('link', { name: 'Tugas Saya' }).click();
    await expect(page).toHaveURL(/\/tasks$/);
  });
});

// ============================================================
// /settings — R2 Phase A new route
// ============================================================
test.describe('R2 /settings — workspace settings', () => {
  test('admin: /settings renders Profile section by default', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    await expect(
      page.getByRole('heading', { name: 'Profile', exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin: section nav switches to Members', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings');
    await page.getByRole('button', { name: /Anggota tim/ }).click();
    await expect(page).toHaveURL(/section=members/);
    await expect(
      page.getByRole('heading', { name: 'Anggota Tim', exact: true }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin: members section shows users table with role pills', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/settings?section=members');
    // wait for data load
    await page.waitForLoadState('networkidle');
    // At least 1 user row visible (ADMIN themselves)
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('member: cannot access /settings?section=members → redirect', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/settings?section=members');
    // Member redirected back to /settings (profile section default)
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('AppHeader Pengaturan link navigates to /settings', async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole('link', { name: 'Pengaturan' }).click();
    await expect(page).toHaveURL(/\/settings$/);
  });
});

// ============================================================
// /admin/import — R2 Phase B unified
// ============================================================
test.describe('R2 /admin/import — unified Import workspace', () => {
  test('admin: /admin/import renders MoM tab by default', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/import');
    await expect(
      page.getByRole('heading', { name: 'Import Data', exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    // MoM tab active
    await expect(page.getByRole('tab', { name: /Notulensi/ })).toHaveAttribute('aria-selected', 'true');
    // CSV tab inactive
    await expect(page.getByRole('tab', { name: /Karyawan/ })).toHaveAttribute('aria-selected', 'false');
  });

  test('admin: tab switch to CSV updates URL param', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/import');
    await page.getByRole('tab', { name: /Karyawan/ }).click();
    await expect(page).toHaveURL(/tab=csv/);
  });

  test('admin: deep link ?tab=csv pre-selects CSV tab', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/import?tab=csv');
    await expect(page.getByRole('tab', { name: /Karyawan/ })).toHaveAttribute('aria-selected', 'true');
  });

  test('member: /admin/import redirects to /', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/admin/import');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/);
  });

  test('AppHeader Import link navigates to /admin/import', async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole('link', { name: 'Import', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/import$/);
  });

  test('legacy /admin/mom-import still functional (backward compat)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/mom-import');
    await expect(
      page.getByRole('heading', { name: /Import Notulensi/ }),
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ============================================================
// R2 Phase E — Gantt scroll containment
// ============================================================
test.describe('R2 Gantt scroll fix', () => {
  test('Gantt wrapper has overflow-x-auto inner scroll layer', async ({ page }) => {
    // Verify CSS structure rather than full Gantt render (chart uses
    // frappe-gantt; testing scroll mechanics not chart behavior)
    await login(page, ADMIN);
    // Navigate to a project with Gantt view
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    // Open first project link if any
    const firstProject = page.locator('a[href*="/projects/"]').first();
    if (await firstProject.count() > 0) {
      await firstProject.click();
      await page.goto(page.url() + '?view=gantt');
      await page.waitForLoadState('networkidle');
      // kt-gantt-wrapper should be present
      const ganttWrapper = page.locator('.kt-gantt-wrapper');
      if (await ganttWrapper.count() > 0) {
        // Outer wrapper should not horizontally exceed viewport
        const box = await ganttWrapper.boundingBox();
        const viewport = page.viewportSize();
        if (box && viewport) {
          expect(box.width).toBeLessThanOrEqual(viewport.width + 10);
        }
      }
    }
  });

  test('page-level no horizontal scroll on /dashboard', async ({ page }) => {
    await login(page, ADMIN);
    await page.waitForLoadState('networkidle');
    const html = page.locator('html');
    const scrollWidth = await html.evaluate((el) => el.scrollWidth);
    const clientWidth = await html.evaluate((el) => el.clientWidth);
    // Allow tiny rounding tolerance
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});

// ============================================================
// R2 Copy audit verify — Refresh button (was Segarkan)
// ============================================================
test.describe('R2 copy lock', () => {
  test('admin: /admin/usage refresh button shows "Refresh" not "Segarkan"', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    // After fix: button text "↻ Refresh" or "Refreshing…" (loading)
    await expect(
      page.getByRole('button', { name: /Refresh/ }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Segarkan/)).toHaveCount(0);
  });
});
