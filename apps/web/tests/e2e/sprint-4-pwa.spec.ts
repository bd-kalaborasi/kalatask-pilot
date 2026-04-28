/**
 * E2E: Sprint 4 N2 PWA installable.
 *
 * Coverage:
 *   1. /manifest.webmanifest accessible + JSON shape valid
 *   2. index.html links manifest + theme-color meta
 *   3. SVG icon /kalatask-icon.svg accessible
 *
 * Note: dev server tidak generate service worker (devOptions.enabled=false).
 * SW + Lighthouse audit via build artifact, dilakukan manual di Checkpoint 5.
 */
import { test, expect } from '@playwright/test';

test.describe('Sprint 4 — PWA manifest + icons', () => {
  test('manifest.webmanifest accessible + valid shape', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.name).toBe('KalaTask');
    expect(json.theme_color).toBe('#0060A0');
    expect(json.background_color).toBe('#FAFAFA');
    expect(json.display).toBe('standalone');
    expect(json.icons).toBeInstanceOf(Array);
    expect(json.icons.length).toBeGreaterThan(0);
  });

  test('index.html links manifest + theme-color meta', async ({ page }) => {
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBe('/manifest.webmanifest');
    const themeColor = await page
      .locator('meta[name="theme-color"]')
      .getAttribute('content');
    expect(themeColor).toBe('#0060A0');
  });

  test('SVG icon /kalatask-icon.svg accessible', async ({ request }) => {
    const res = await request.get('/kalatask-icon.svg');
    expect(res.ok()).toBeTruthy();
    expect(res.headers()['content-type']).toContain('svg');
  });
});
