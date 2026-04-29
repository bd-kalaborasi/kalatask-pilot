/**
 * E2E Sprint 5 visual evidence — MoM Import + Usage dashboard.
 * Output: tests/screenshots/sprint-5-verification/{name}.png @ 1280×800
 */
import { test, type Page } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SCREENSHOT_DIR = 'tests/screenshots/sprint-5-verification';

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
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 10000 });
}

test.describe('Sprint 5 visual evidence', () => {
  test('a. /admin/mom-import upload UI', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/mom-import');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-mom-import-upload.png`,
      fullPage: false,
    });
  });

  test('b. /admin/mom-import after upload — review queue', async ({ page }) => {
    test.setTimeout(120000); // 2 min — RPC + 47 resolver calls
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/mom-import');
    await page.waitForTimeout(500);

    // Upload sample 04-23 MoM file
    const tempDir = path.join(process.cwd(), 'tests', 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    const sampleSrc = path.resolve(
      process.cwd(),
      '../../docs/sample-mom/04-23_Rapat_Mingguan_v2.md',
    );
    const sampleDst = path.join(tempDir, 'sample-04-23.md');
    await fs.copyFile(sampleSrc, sampleDst);

    await page.locator('input[type="file"]').setInputFiles(sampleDst);
    // Wait until navigation ke review page (process_mom_upload + 47 resolver calls)
    await page.waitForURL(/\/admin\/mom-import\/[a-f0-9-]+$/, { timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-mom-review-queue.png`,
      fullPage: false,
    });
  });

  test('c. /admin/usage dashboard with progress bars', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/usage');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-usage-dashboard.png`,
      fullPage: false,
    });
  });

  test('d. Mom import history list (post-upload)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/mom-import');
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-mom-import-history.png`,
      fullPage: false,
    });
  });
});
