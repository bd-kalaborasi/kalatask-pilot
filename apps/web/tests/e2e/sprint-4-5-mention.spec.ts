/**
 * E2E: Sprint 4.5 Step 9 — @mention autocomplete + token injection.
 *
 * Coverage:
 *   1. Type @ in composer → autocomplete dropdown muncul
 *   2. Type query → results filtered
 *   3. Select user → token @[Name](uuid) ter-inject ke body
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };

async function login(page: Page, email: string, password: string) {
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

async function openFirstTaskInProject(page: Page) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  const firstProject = page.locator('a[href^="/projects/"]:not([href*="tasks"])').first();
  await firstProject.click({ timeout: 5000 });
  await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 5000 });
  const firstTask = page.locator('a[href*="/tasks/"]').first();
  await firstTask.click({ timeout: 5000 });
  await page.waitForURL(/\/tasks\//, { timeout: 5000 });
}

test.describe('Sprint 4.5 — @mention autocomplete', () => {
  test('Type @ → autocomplete dropdown muncul', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await openFirstTaskInProject(page);

    const composer = page.getByPlaceholder(/Tulis komen/i);
    await composer.click();
    await composer.fill('Hi @');

    // Listbox role muncul
    await expect(
      page.locator('[role="listbox"][aria-label*="Mention"]'),
    ).toBeVisible({ timeout: 5000 });
  });

  test('Type @nama → results filtered', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await openFirstTaskInProject(page);

    const composer = page.getByPlaceholder(/Tulis komen/i);
    await composer.click();
    await composer.fill('Hi @sari');

    // Wait debounce 200ms + RPC roundtrip
    await page.waitForTimeout(500);

    // Should see Sari Wijaya option
    await expect(page.getByRole('option', { name: /Sari/ })).toBeVisible({
      timeout: 5000,
    });
  });

  test('Click select user → token @[Name](uuid) injected', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await openFirstTaskInProject(page);

    const composer = page.getByPlaceholder(/Tulis komen/i);
    await composer.click();
    await composer.fill('Hi @sari');
    await page.waitForTimeout(500);

    const sariOption = page.getByRole('option', { name: /Sari/ }).first();
    await sariOption.click();

    // Verify body now contains @[Sari ...](uuid) token format
    const bodyValue = await composer.inputValue();
    expect(bodyValue).toMatch(/@\[Sari[^\]]+\]\([0-9a-f-]{36}\)/);
  });
});
