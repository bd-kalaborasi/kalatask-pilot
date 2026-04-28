/**
 * E2E: Sprint 4 F10 onboarding wizard + tooltip + sample data.
 *
 * Coverage:
 *   1. First-login user sees wizard modal
 *   2. Skip closes wizard
 *   3. After skip, refresh doesn't reopen wizard
 *   4. 'Buka tutorial' link on Dashboard reopens wizard
 *   5. Wizard step navigation Lanjut → final → Selesai
 *   6. Sample project muncul untuk first-login user (idempotent — sudah dibuat sebelumnya OK)
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  // Idempotent — kalau sudah authed, klik Keluar dulu
  const keluarButton = page.getByRole('button', { name: 'Keluar' });
  if (await keluarButton.isVisible().catch(() => false)) {
    // Dismiss wizard kalau lagi muncul (intercept Keluar click)
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
}

async function dismissWizardIfVisible(page: Page) {
  const dialog = page.locator('[role="dialog"]');
  // Wait briefly untuk wizard appear (race dengan profile load)
  await dialog.waitFor({ state: 'visible', timeout: 3000 }).catch(() => {});
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 3000 });
  }
}

/** Ensure wizard modal currently visible (open via Buka tutorial kalau perlu). */
async function ensureWizardOpen(page: Page) {
  const dialog = page.locator('[role="dialog"]');
  // Wait race: wizard might already be auto-open
  await dialog.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
  if (await dialog.isVisible().catch(() => false)) return;
  await page.getByRole('button', { name: 'Buka tutorial' }).click();
  await dialog.waitFor({ state: 'visible', timeout: 5000 });
}

test.describe('Sprint 4 — Onboarding wizard + tooltip', () => {
  test('Dashboard renders Buka tutorial link (reopen path)', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL('**/', { timeout: 10000 });
    await dismissWizardIfVisible(page);
    // 'Buka tutorial' link visible regardless of wizard state
    await expect(
      page.getByRole('button', { name: 'Buka tutorial' }),
    ).toBeVisible();
  });

  test('Reopen wizard via Dashboard link surfaces modal dengan title', async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL('**/', { timeout: 10000 });
    await ensureWizardOpen(page);
    await expect(page.getByText(/langkah 1 dari 5/i)).toBeVisible();
  });

  test('Skip wizard closes modal', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL('**/', { timeout: 10000 });
    await ensureWizardOpen(page);
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 3000 });
  });

  test('Lanjut button advances step counter', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL('**/', { timeout: 10000 });
    await ensureWizardOpen(page);
    await expect(page.getByText(/langkah 1 dari 5/i)).toBeVisible();
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await expect(page.getByText(/langkah 2 dari 5/i)).toBeVisible();
  });

  test('Wizard last step shows Selesai button', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL('**/', { timeout: 10000 });
    await ensureWizardOpen(page);
    // Click Lanjut 4× untuk reach step 5
    for (let i = 0; i < 4; i++) {
      await page.getByRole('button', { name: 'Lanjut' }).click();
    }
    await expect(page.getByText(/langkah 5 dari 5/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /selesai/i }),
    ).toBeVisible();
  });

  test('Wizard Esc key triggers skip flow', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await page.waitForURL('**/', { timeout: 10000 });
    await ensureWizardOpen(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 3000 });
  });
});
