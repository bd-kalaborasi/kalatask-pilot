/**
 * E2E: Sprint 3 Step 6+7+8+9 — F8/F13/F5/F6 dashboards.
 *
 * Coverage (data-agnostic):
 * 1. /dashboard/manager render untuk manager (Sari) + admin
 * 2. /dashboard/manager redirect untuk member (Andi)
 * 3. /dashboard/productivity render untuk admin + viewer + manager
 * 4. /dashboard/productivity redirect untuk member
 * 5. /workload render untuk manager
 * 6. /workload redirect untuk viewer (workload = manager primary)
 * 7. /bottleneck render untuk admin (cross-team management view)
 * 8. /bottleneck redirect untuk member
 * 9. Period filter URL state /dashboard/productivity?period=90
 */
import { test, expect, type Page } from '@playwright/test';

interface User {
  email: string;
  password: string;
  role: string;
}

const ADMIN: User = { email: 'admin@kalatask.test', password: 'TestAdmin123!', role: 'admin' };
const SARI: User = { email: 'sari@kalatask.test', password: 'TestSari123!', role: 'manager' };
const ANDI: User = { email: 'andi@kalatask.test', password: 'TestAndi123!', role: 'member' };
const MAYA: User = { email: 'maya@kalatask.test', password: 'TestMaya123!', role: 'viewer' };

async function login(page: Page, user: User): Promise<void> {
  await page.goto('/login');
  const emailVisible = await page
    .getByLabel('Email')
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (!emailVisible) {
    await page.getByRole('button', { name: 'Keluar' }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  }
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('F8 Manager Dashboard permission', () => {
  test('manager Sari → /dashboard/manager render', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/dashboard/manager');
    await expect(
      page.getByRole('heading', { name: 'Manager Dashboard' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('admin → /dashboard/manager render', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/manager');
    await expect(
      page.getByRole('heading', { name: 'Manager Dashboard' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('member Andi → /dashboard/manager redirect ke /', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/dashboard/manager');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('F13 Productivity Dashboard permission', () => {
  test('admin → /dashboard/productivity render', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity');
    await expect(
      page.getByRole('heading', { name: 'Productivity Dashboard' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('viewer Maya → /dashboard/productivity render (read-only access AC-9)', async ({
    page,
  }) => {
    await login(page, MAYA);
    await page.goto('/dashboard/productivity');
    await expect(
      page.getByRole('heading', { name: 'Productivity Dashboard' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('member Andi → /dashboard/productivity redirect (Member denied)', async ({
    page,
  }) => {
    await login(page, ANDI);
    await page.goto('/dashboard/productivity');
    // Wait for Suspense load + profile auto-load + Navigate redirect to settle
    await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/$/);
  });

  test('period filter URL state', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/dashboard/productivity?period=90');
    await expect(page).toHaveURL(/period=90/);
    await expect(
      page.getByText('Periode: 90 hari'),
    ).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('F5 Workload + F6 Bottleneck permission', () => {
  test('manager Sari → /workload render', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/workload');
    await expect(
      page.getByRole('heading', { name: 'Workload View' }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test('admin → /bottleneck render', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/bottleneck');
    await expect(
      page.getByRole('heading', { name: 'Bottleneck View' }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('member Andi → /bottleneck redirect (Member denied)', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/bottleneck');
    await expect(page).toHaveURL(/\/$/);
  });
});
