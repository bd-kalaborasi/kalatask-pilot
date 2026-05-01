/**
 * Sprint 6 patch r3 — capture 3 deferred-from-R2 side-by-side screenshots.
 * /tasks, /admin/import, /onboarding wizard surface.
 */
import { test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata Sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('R3 comparison screenshots', () => {
  test('01 /tasks', async ({ page }) => {
    await login(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-patch-r3-comparison/01-tasks-after.png',
      fullPage: true,
    });
  });

  test('02 /admin/import', async ({ page }) => {
    await login(page);
    await page.goto('/admin/import');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-patch-r3-comparison/02-admin-import-after.png',
      fullPage: true,
    });
  });

  test('03 /settings', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-patch-r3-comparison/03-settings-after.png',
      fullPage: true,
    });
  });
});
