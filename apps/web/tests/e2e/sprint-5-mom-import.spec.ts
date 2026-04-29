/**
 * E2E Sprint 5 — F9 MoM Import + F16 Usage dashboard.
 *
 * Coverage:
 *   1. Admin sees Import MoM nav link
 *   2. Member denied — redirect from /admin/mom-import
 *   3. /admin/mom-import renders upload UI
 *   4. /admin/usage renders dashboard with progress bars + refresh
 *   5. Member denied /admin/usage
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const ANDI = { email: 'andi@kalatask.test', password: 'TestAndi123!' };

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  const keluarButton = page.getByRole('button', { name: 'Keluar' });
  if (await keluarButton.isVisible().catch(() => false)) {
    await keluarButton.click();
    await page.waitForURL('**/login', { timeout: 5000 });
  }
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata Sandi').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 10000,
  });
}

test.describe('Sprint 5 — F9 MoM Import access', () => {
  test('Admin sees Import Notulensi nav link', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(
      page.getByRole('link', { name: /Import Notulensi/i }),
    ).toBeVisible();
  });

  test('Member doesnt see Import Notulensi nav link', async ({ page }) => {
    await login(page, ANDI.email, ANDI.password);
    await expect(
      page.getByRole('link', { name: /Import Notulensi/i }),
    ).toBeHidden();
  });

  test('Member /admin/mom-import redirects to /', async ({ page }) => {
    await login(page, ANDI.email, ANDI.password);
    await page.goto('/admin/mom-import');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/, {
      timeout: 10000,
    });
  });

  test('Admin /admin/mom-import renders upload UI', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/mom-import');
    await expect(page.getByText(/1\. Upload MoM file/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/2\. Riwayat Import/i)).toBeVisible();
  });
});

test.describe('Sprint 5 — F16 Usage dashboard access', () => {
  test('Admin sees Usage nav link', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await expect(page.getByRole('link', { name: 'Usage' })).toBeVisible();
  });

  test('Admin /admin/usage renders 3 progress bar cards', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/usage');
    await expect(page.getByRole('heading', { name: 'Usage Monitoring' })).toBeVisible({
      timeout: 10000,
    });
    // 3 progress bar cards: Database, Storage, MAU
    await expect(page.getByText('Database', { exact: true })).toBeVisible();
    await expect(page.getByText('Storage', { exact: true })).toBeVisible();
    await expect(page.getByText(/^MAU/i)).toBeVisible();
    // Refresh button
    await expect(page.getByRole('button', { name: /Refresh/ })).toBeVisible();
  });

  test('Member /admin/usage redirects to /', async ({ page }) => {
    await login(page, ANDI.email, ANDI.password);
    await page.goto('/admin/usage');
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:5174\/$/, {
      timeout: 10000,
    });
  });
});
