/**
 * E2E: Sprint 4.5 visual evidence — task detail + comments + autocomplete.
 *
 * Output: tests/screenshots/sprint-4-5-verification/{name}.png @ 1280×800
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SCREENSHOT_DIR = 'tests/screenshots/sprint-4-5-verification';

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

async function openFirstTaskInProject(page: Page) {
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  const firstProject = page.locator('a[href^="/projects/"]:not([href*="tasks"])').first();
  await firstProject.click();
  await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 5000 });
  const firstTask = page.locator('a[href*="/tasks/"]').first();
  await firstTask.click();
  await page.waitForURL(/\/tasks\//, { timeout: 5000 });
}

test.describe('Sprint 4.5 visual evidence', () => {
  test('a. task detail page (header + detail card + empty comments)', async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await openFirstTaskInProject(page);
    await expect(page.getByText(/^Komen \(\d+\)$/)).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-task-detail-empty-comments.png`,
      fullPage: false,
    });
  });

  test('b. composer with @ trigger autocomplete dropdown', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await openFirstTaskInProject(page);
    const composer = page.getByPlaceholder(/Tulis komen/i);
    await composer.click();
    await composer.fill('Hi @s');
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-mention-autocomplete-open.png`,
      fullPage: false,
    });
  });

  test('c. posted comment with mention badge', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    await openFirstTaskInProject(page);
    const composer = page.getByPlaceholder(/Tulis komen/i);
    await composer.click();
    await composer.fill('Hi @sari');
    await page.waitForTimeout(500);
    const sariOption = page.getByRole('option', { name: /Sari/ }).first();
    if (await sariOption.isVisible().catch(() => false)) {
      await sariOption.click();
      await composer.pressSequentially(' please review the **bold** + `code` markdown.');
      await page.getByRole('button', { name: 'Post komen' }).click();
      await page.waitForTimeout(1500);
    }
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-comment-with-mention-rendered.png`,
      fullPage: false,
    });
  });

  test('d. notif badge realtime updated dropdown', async ({ page }) => {
    await login(page, ADMIN.email, ADMIN.password);
    // Open dropdown notif
    const notifBtn = page.getByRole('button', { name: /Notifikasi/i });
    if (await notifBtn.isVisible().catch(() => false)) {
      await notifBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-notification-dropdown.png`,
      fullPage: false,
    });
  });
});
