/**
 * Sprint 6 patch comparison screenshots — pair with Stitch refs in
 * docs/sprint-6-patch-comparison/.
 *
 * Captures localhost screenshots for routes refactored in patch round.
 * Each route has Stitch reference downloaded via curl from screenshot
 * URL during Phase 1, this captures the post-refactor actual.
 */
import { test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SUFFIX = process.env.PHASE_SUFFIX ?? 'after';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata Sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

test.describe('Sprint 6 patch — comparison screenshots', () => {
  test('01 /dashboard', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-patch-comparison/01-dashboard-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('11 /dashboard/productivity', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard/productivity');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-patch-comparison/11-productivity-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('08 /admin/usage', async ({ page }) => {
    await login(page);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-patch-comparison/08-admin-usage-${SUFFIX}.png`,
      fullPage: true,
    });
  });
});
