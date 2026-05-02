/**
 * Visual evidence — Sprint 6 revision.
 *
 * Captures 5 screenshots showing the resolved owner findings.
 */
import { test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata Sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

test.describe('Sprint 6 revision visual evidence', () => {
  test('a. /dashboard — Create Project CTA visible', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-revision-screenshots/01-dashboard-cta.png',
      fullPage: true,
    });
  });

  test('b. /projects — Create Project CTA + filter', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-revision-screenshots/02-projects-cta.png',
      fullPage: true,
    });
  });

  test('c. /admin/usage — overall health banner', async ({ page }) => {
    await login(page);
    await page.goto('/admin/usage');
    await page.waitForSelector('[data-testid="usage-health-banner"]', {
      timeout: 15_000,
    });
    await page.screenshot({
      path: 'docs/sprint-6-revision-screenshots/03-usage-health-banner.png',
      fullPage: true,
    });
  });

  test('d. /admin/mom-import sidebar — Import Notulensi label', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/mom-import');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-revision-screenshots/04-mom-import-labeling.png',
      fullPage: true,
    });
  });

  test('e. /admin/csv-import — Import Tugas (CSV) label + cross-ref', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/admin/csv-import');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-revision-screenshots/05-csv-import-labeling.png',
      fullPage: true,
    });
  });
});
