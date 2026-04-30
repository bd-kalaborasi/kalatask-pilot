/**
 * Visual evidence — Sprint 6 holistic overhaul.
 *
 * Captures 6 screenshots showing v2.1 token-driven visual identity.
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

test.describe('Sprint 6 overhaul visual evidence', () => {
  test('a. /dashboard — display typography + brand CTAs', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-overhaul-screenshots/01-dashboard-display.png',
      fullPage: true,
    });
  });

  test('b. /projects — headline typography + brand tokens', async ({ page }) => {
    await login(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-overhaul-screenshots/02-projects-headline.png',
      fullPage: true,
    });
  });

  test('c. /admin/usage — feedback tokens + health banner', async ({ page }) => {
    await login(page);
    await page.goto('/admin/usage');
    await page.waitForSelector('[data-testid="usage-health-banner"]', {
      timeout: 15_000,
    });
    await page.screenshot({
      path: 'docs/sprint-6-overhaul-screenshots/03-usage-feedback.png',
      fullPage: true,
    });
  });

  test('d. /admin/mom-import — Indonesian labeling + tabs', async ({ page }) => {
    await login(page);
    await page.goto('/admin/mom-import');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-overhaul-screenshots/04-mom-headline.png',
      fullPage: true,
    });
  });

  test('e. /admin/csv-import — Indonesian labeling cross-ref', async ({ page }) => {
    await login(page);
    await page.goto('/admin/csv-import');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: 'docs/sprint-6-overhaul-screenshots/05-csv-headline.png',
      fullPage: true,
    });
  });

  test('f. CreateProjectModal — Dialog with kt-scale-in animation', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/projects');
    await page.getByTestId('create-project-button').click();
    await page.waitForSelector('dialog[open]', { timeout: 5_000 });
    await page.waitForTimeout(300);
    await page.screenshot({
      path: 'docs/sprint-6-overhaul-screenshots/06-create-modal.png',
      fullPage: true,
    });
  });
});
