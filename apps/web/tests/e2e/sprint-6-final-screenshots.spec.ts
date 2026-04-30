/**
 * Visual evidence — Sprint 6 FINAL overhaul (Stitch v1 + research).
 *
 * Captures screenshots after each phase of the design-system-final-spec
 * adoption. Output dir: docs/sprint-6-final-screenshots/.
 *
 * Phase B (foundation): only dashboard required for owner checkpoint.
 * Phase I (final): full 6-route capture for retro evidence.
 *
 * Capture phase via env:
 *   PHASE=B  → 01-dashboard only
 *   PHASE=I  → all 6 routes
 */
import { test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const PHASE = process.env.PHASE ?? 'B';
const SUFFIX = process.env.PHASE_SUFFIX ?? `phase-${PHASE.toLowerCase()}`;

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata Sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

const onlyFinalPhase = PHASE !== 'I';

test.describe('Sprint 6 FINAL — visual evidence', () => {
  test('01 /dashboard', async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-final-screenshots/01-dashboard-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('02 /projects', async ({ page }) => {
    test.skip(onlyFinalPhase, 'phase != I → only dashboard captured');
    await login(page);
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-final-screenshots/02-projects-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('03 /admin/usage', async ({ page }) => {
    test.skip(onlyFinalPhase, 'phase != I → only dashboard captured');
    await login(page);
    await page.goto('/admin/usage');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-final-screenshots/03-admin-usage-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('04 /admin/mom-import', async ({ page }) => {
    test.skip(onlyFinalPhase, 'phase != I → only dashboard captured');
    await login(page);
    await page.goto('/admin/mom-import');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-final-screenshots/04-mom-import-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('05 /tasks', async ({ page }) => {
    test.skip(onlyFinalPhase, 'phase != I → only dashboard captured');
    await login(page);
    await page.goto('/tasks');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-final-screenshots/05-tasks-${SUFFIX}.png`,
      fullPage: true,
    });
  });

  test('06 /productivity', async ({ page }) => {
    test.skip(onlyFinalPhase, 'phase != I → only dashboard captured');
    await login(page);
    await page.goto('/productivity');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: `docs/sprint-6-final-screenshots/06-productivity-${SUFFIX}.png`,
      fullPage: true,
    });
  });
});
