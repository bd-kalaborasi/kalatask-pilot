/**
 * E2E Sprint 6 visual evidence — UX polish + Stitch-inspired implementation.
 * Output: tests/screenshots/sprint-6-verification/{name}.png @ 1280×800
 *
 * Captures key routes post Phase 4 polish dengan refined Indonesian microcopy.
 */
import { test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SCREENSHOT_DIR = 'tests/screenshots/sprint-6-verification';

async function login(page: Page, email: string, password: string) {
  await page.setViewportSize({ width: 1280, height: 800 });
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

test.describe('Sprint 6 visual evidence — refined UI', () => {
  test('a. /login (a11y landmark fix + brand)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-login.png`,
      fullPage: false,
    });
  });

  test('b. /projects (refined status labels: Aktif/Perencanaan/dst)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/projects');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-projects.png`,
      fullPage: false,
    });
  });

  test('c. /admin/usage (Storage friendly placeholder)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/usage');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-usage-friendly-placeholder.png`,
      fullPage: false,
    });
  });

  test('d. /admin/mom-import (history + upload)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/mom-import');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-mom-import-list.png`,
      fullPage: false,
    });
  });

  test('e. /dashboard/manager (refined labels)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/dashboard/manager');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-manager-dashboard.png`,
      fullPage: false,
    });
  });
});
