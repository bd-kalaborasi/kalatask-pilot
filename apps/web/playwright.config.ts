import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — KalaTask Sprint 1 Step 9 Checkpoint 2.
 *
 * Headless only (no headed popup untuk owner). Single browser (Chromium)
 * untuk speed. Dev server harus already running di localhost:5174 — test
 * tidak start dev server sendiri (avoid lock contention dengan owner's
 * existing terminal).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
