/**
 * Sprint 6 patch comparison screenshots — pair with Stitch refs in
 * docs/sprint-6-patch-comparison/.
 *
 * Captures localhost screenshots for routes refactored in patch round.
 * Each route has Stitch reference downloaded via curl from screenshot
 * URL during Phase 1, this captures the post-refactor actual.
 */
import { test, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };
const SUFFIX = process.env.PHASE_SUFFIX ?? 'after';

test.use({ viewport: { width: 1280, height: 800 } });

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN.email);
  await page.getByLabel('Kata Sandi').fill(ADMIN.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

test.describe('Sprint 6 patch — comparison screenshots', () => {
  const ROUTES: Array<{ slug: string; path: string }> = [
    { slug: '01-dashboard', path: '/' },
    { slug: '02-projects', path: '/projects' },
    { slug: '08-admin-usage', path: '/admin/usage' },
    { slug: '09-workload', path: '/workload' },
    { slug: '10-bottleneck', path: '/bottleneck' },
    { slug: '11-productivity', path: '/dashboard/productivity' },
    { slug: '14-manager-dashboard', path: '/dashboard/manager' },
  ];

  for (const route of ROUTES) {
    test(`${route.slug} ${route.path}`, async ({ page }) => {
      await login(page);
      if (route.path !== '/') await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.screenshot({
        path: `docs/sprint-6-patch-comparison/${route.slug}-${SUFFIX}.png`,
        fullPage: true,
      });
    });
  }
});
