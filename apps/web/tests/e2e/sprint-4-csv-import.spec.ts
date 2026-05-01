/**
 * E2E: Sprint 4 F15 CSV import admin-only flow.
 *
 * Coverage:
 *   1. Admin sees Import CSV nav link
 *   2. Member doesn't see Import CSV nav link
 *   3. Member direct visit /admin/csv-import redirects ke /
 *   4. Admin /admin/csv-import renders upload UI
 *   5. Admin upload sample CSV → preview table renders dengan validation
 */
import { test, expect, type Page } from '@playwright/test';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const MEMBER = { email: 'andi@kalatask.test', password: 'TestAndi123!' };

async function login(page: Page, email: string, password: string) {
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
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  }
}

test.describe('Sprint 4 — CSV Import admin-only', () => {
  test('Admin sees Import nav link (unified MoM + CSV)', async ({ page }) => {
    // Sprint 6 patch r2 Phase B: "Import Tugas (CSV)" + "Import Notulensi"
    // unified into single "Import" entry → /admin/import with tab nav
    await login(page, ADMIN.email, ADMIN.password);
    await expect(
      page.getByRole('link', { name: 'Import', exact: true }),
    ).toBeVisible();
  });

  test('Member does not see Import nav link', async ({ page }) => {
    await login(page, MEMBER.email, MEMBER.password);
    await expect(
      page.getByRole('link', { name: 'Import', exact: true }),
    ).toBeHidden();
  });

  test('Member direct visit /admin/csv-import redirects to /', async ({
    page,
  }) => {
    await login(page, MEMBER.email, MEMBER.password);
    await page.goto('/admin/csv-import');
    // Should redirect to /
    await expect(page).toHaveURL('/');
  });

  test('Admin /admin/csv-import renders upload UI', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/csv-import');
    await expect(
      page.getByRole('heading', { name: /Import Tugas \(CSV\)/i }),
    ).toBeVisible();
    await expect(page.getByText(/1\. Pilih file CSV/i)).toBeVisible();
  });

  test('Admin upload CSV → preview table renders', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/csv-import');

    // Generate a small CSV file in temp
    const tempDir = path.join(process.cwd(), 'tests', 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    const csvPath = path.join(tempDir, 'sample.csv');
    const csv = [
      'title,project_name,status,priority,deadline,estimated_hours,description,assignee_email',
      'Sample task valid,Demo CSV E2E,todo,medium,2026-12-01,3,Desc valid,',
      'Bad status,Demo CSV E2E,invalidstatus,medium,,,,',
      'Missing project,,todo,medium,,,,',
    ].join('\n');
    await fs.writeFile(csvPath, csv, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Preview heading
    await expect(page.getByText(/2\. Preview validation/i)).toBeVisible({
      timeout: 5000,
    });
    // Total 3 baris
    await expect(page.getByText(/3 total/i)).toBeVisible();
  });

  test('Admin commit button disabled saat ada error row', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.goto('/admin/csv-import');

    const tempDir = path.join(process.cwd(), 'tests', 'tmp');
    await fs.mkdir(tempDir, { recursive: true });
    const csvPath = path.join(tempDir, 'with-error.csv');
    const csv = [
      'title,project_name,status,priority',
      ',No title row,todo,medium', // missing title = error
    ].join('\n');
    await fs.writeFile(csvPath, csv, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    await expect(
      page.getByRole('button', { name: /fix error dulu/i }),
    ).toBeDisabled();
  });
});
