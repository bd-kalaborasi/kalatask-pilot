/**
 * E2E: Sprint 4 verification screenshots — visual evidence collection.
 *
 * Tujuan: capture 6 screen states untuk owner skim post-hoc tanpa
 * manual click. Bukan judge visual quality — sekedar collect evidence.
 *
 * Output: tests/screenshots/sprint-4-verification/{name}.png
 *
 * Resolution: 1280x800 viewport.
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SCREENSHOT_DIR = 'tests/screenshots/sprint-4-verification';

async function login(page: Page, email: string, password: string) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');
  const keluarButton = page.getByRole('button', { name: 'Keluar' });
  if (await keluarButton.isVisible().catch(() => false)) {
    await dismissWizardIfVisible(page);
    await keluarButton.click();
    await page.waitForURL('**/login', { timeout: 5000 });
  }
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata Sandi').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
    timeout: 10000,
  });
  await dismissWizardIfVisible(page);
}

async function dismissWizardIfVisible(page: Page) {
  const dialog = page.locator('[role="dialog"]');
  await dialog.waitFor({ state: 'visible', timeout: 1500 }).catch(() => {});
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  }
}

async function reopenWizard(page: Page) {
  await page.getByRole('button', { name: 'Buka tutorial' }).click();
  await page.locator('[role="dialog"]').waitFor({ state: 'visible' });
}

test.describe('Sprint 4 visual evidence', () => {
  test('a. wizard step 1 (auto-show first impression)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await reopenWizard(page);
    await expect(page.getByText(/langkah 1 dari 5/i)).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-wizard-step-1-first-impression.png`,
      fullPage: false,
    });
  });

  test('b. wizard step 3 (substituted: Tiga cara lihat task)', async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await reopenWizard(page);
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await expect(page.getByText(/langkah 3 dari 5/i)).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-wizard-step-3-substitute-tiga-view.png`,
      fullPage: false,
    });
  });

  test('c. wizard step 4 (substituted: Detail task)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await reopenWizard(page);
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Lanjut' }).click();
    }
    await expect(page.getByText(/langkah 4 dari 5/i)).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-wizard-step-4-substitute-detail-task.png`,
      fullPage: false,
    });
  });

  test('d. empty state ProjectsPage filter no-match', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    // Apply filter dengan status yang non-existent untuk trigger empty state
    await page.goto('/projects?f.status=archived&f.team=invalid-team-uuid');
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-empty-state-projects-filter-no-match.png`,
      fullPage: false,
    });
  });

  test('e. empty state ListView tasks kosong (project tanpa task)', async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/projects?f.status=on_hold');
    await page.waitForTimeout(1000);
    // Klik project pertama untuk masuk detail
    const firstProject = page.locator('a[href^="/projects/"]').first();
    if (await firstProject.isVisible().catch(() => false)) {
      await firstProject.click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-empty-state-or-projects-listing.png`,
      fullPage: false,
    });
  });

  test('f. CSV import preview', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/csv-import');
    await page.waitForTimeout(1000);
    // Generate sample CSV and upload
    const tempCsv = `tests/tmp/screenshot-sample.csv`;
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    await fs.mkdir(path.dirname(tempCsv), { recursive: true });
    const csv = [
      'title,project_name,status,priority,deadline,description,assignee_email',
      'Setup task baru,Demo Visual,todo,high,2026-12-01,Lengkapi setup,',
      'Bikin laporan akhir,Demo Visual,in_progress,medium,2026-11-15,,andi@kalatask.test',
      'Review hasil interview,Demo Visual,review,medium,,,',
      'Update dokumentasi,Demo Visual,todo,low,2026-10-20,,unknown@nowhere.test',
      'Bad row missing title,Demo Visual,todo,medium,,,',
    ].join('\n');
    await fs.writeFile(tempCsv, csv, 'utf-8');
    await page.locator('input[type="file"]').setInputFiles(tempCsv);
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-csv-import-preview.png`,
      fullPage: false,
    });
  });
});
