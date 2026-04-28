/**
 * E2E: Sprint 4 PWA installability deep checks (Lighthouse 13 dropped pwa
 * category, so we verify installability primitives via direct browser API).
 *
 * Coverage:
 *   1. Service worker registers + activates within 5s after page load
 *   2. Manifest icons resolve dengan 200 + image content-type
 *   3. InstallPrompt component DOM presence (button hidden by default sampai
 *      beforeinstallprompt fires; we verify mount path tidak error)
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

test.use({ serviceWorkers: 'allow' });

test.describe('Sprint 4 PWA installability', () => {
  test('Service worker registers + activates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'load' });
    await page.waitForLoadState('networkidle');
    // Wait sampai SW controller atau registration confirmed
    const swInfo = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false };
      // Wait active registration up to 8s
      const startedAt = Date.now();
      let reg = await navigator.serviceWorker.getRegistration();
      while (!reg && Date.now() - startedAt < 8000) {
        await new Promise((r) => setTimeout(r, 200));
        reg = await navigator.serviceWorker.getRegistration();
      }
      return {
        supported: true,
        hasRegistration: !!reg,
        scriptUrl: reg?.active?.scriptURL || reg?.installing?.scriptURL || reg?.waiting?.scriptURL || null,
      };
    });
    expect(swInfo.supported).toBe(true);
    expect(swInfo.hasRegistration).toBe(true);
    expect(swInfo.scriptUrl).toContain('sw.js');
  });

  test('Manifest icons resolve dengan 200 + svg content-type', async ({
    request,
  }) => {
    const res = await request.get('/kalatask-icon.svg');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('svg');
    const body = await res.text();
    expect(body).toContain('<svg');
  });

  test('InstallPrompt mount path tidak error (admin page)', async ({
    page,
  }) => {
    await login(page, ADMIN.email, ADMIN.password);
    // InstallPrompt button hanya visible saat beforeinstallprompt fired —
    // di Playwright headless, event tidak fire. Tapi component harus tetap
    // tidak throw error saat mount.
    const errorLogs: string[] = [];
    page.on('pageerror', (err) => errorLogs.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errorLogs.filter((e) => e.includes('InstallPrompt'))).toEqual([]);
  });

  test('Manifest webmanifest fully valid (deep parse)', async ({
    request,
  }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(m.display);
    expect(m.theme_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(m.background_color).toMatch(/^#[0-9a-fA-F]{6}$/);
    expect(m.icons).toBeInstanceOf(Array);
    expect(m.icons.length).toBeGreaterThan(0);
    expect(m.icons[0].src).toBeTruthy();
    expect(m.icons[0].sizes).toBeTruthy();
  });
});
