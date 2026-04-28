import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  retries: 1,
  workers: 1,
  globalSetup: path.resolve(__dirname, './tests/e2e/globalSetup.ts'),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    // SW disabled by default — intercepts fetches secara unpredictable di
    // Playwright runs (cause Sprint 1-3 redirect tests stuck di Suspense
    // fallback). Override per-test via test.use({ serviceWorkers: 'allow' })
    // di sprint-4-pwa-installability spec.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
