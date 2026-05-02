/**
 * E2E: Sprint 1 Step 9 — Auth flow + role-aware dashboard.
 *
 * Coverage (5 categories):
 *   1. Login per role (4 users) — verify dashboard renders dengan role badge
 *   2. Logout per role — capture network call ke /auth/v1/logout
 *   3. Session persist — login + reload = tetap di dashboard
 *   4. Wrong credentials — error message muncul
 *   5. Protected route — akses / tanpa session = redirect ke /login
 *
 * Bug 1 investigation: capture ALL requests via page.on('request')
 * (not filtered by Fetch/XHR). Catat method, URL, status untuk semua
 * /auth/v1/* hits. Termasuk requests yang cancelled atau redirected.
 */
import { test, expect, type Page, type Request } from '@playwright/test';

interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  fullName: string;
  badgeLabel: string;
}

const USERS: TestUser[] = [
  {
    email: 'admin@kalatask.test',
    password: 'TestAdmin123!',
    role: 'admin',
    fullName: 'Admin Test',
    badgeLabel: 'Admin',
  },
  {
    email: 'sari@kalatask.test',
    password: 'TestSari123!',
    role: 'manager',
    fullName: 'Sari Wijaya',
    badgeLabel: 'Manager',
  },
  {
    email: 'andi@kalatask.test',
    password: 'TestAndi123!',
    role: 'member',
    fullName: 'Andi Pratama',
    badgeLabel: 'Member',
  },
  {
    email: 'maya@kalatask.test',
    password: 'TestMaya123!',
    role: 'viewer',
    fullName: 'Maya Anggraini',
    badgeLabel: 'Viewer',
  },
];

/**
 * Login helper — fill form, submit, wait sampai dashboard render.
 */
async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Kata Sandi').fill(password);
  await page.getByRole('button', { name: 'Masuk' }).click();
}

/**
 * Capture semua request ke Supabase auth endpoints (/auth/v1/*).
 * Return array yang akan ter-mutasi sebagai test berjalan.
 *
 * Kenapa tidak filter Fetch/XHR: signOut bisa pakai mekanisme lain
 * (sendBeacon, keepalive fetch). page.on('request') capture SEMUA.
 */
function captureAuthRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/auth/v1/')) {
      requests.push(req);
    }
  });
  return requests;
}

/**
 * Capture response status untuk auth endpoint requests.
 * Membantu Bug 1 investigation: confirm request COMPLETED, bukan cuma fired.
 */
interface AuthResponseLog {
  url: string;
  method: string;
  status: number | 'cancelled' | 'pending';
}

function captureAuthResponses(page: Page): AuthResponseLog[] {
  const logs: AuthResponseLog[] = [];
  page.on('response', (res) => {
    if (res.url().includes('/auth/v1/')) {
      logs.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status(),
      });
    }
  });
  page.on('requestfailed', (req) => {
    if (req.url().includes('/auth/v1/')) {
      logs.push({
        url: req.url(),
        method: req.method(),
        status: 'cancelled',
      });
    }
  });
  return logs;
}

// ============================================================
// 1. LOGIN per role (4 users)
// ============================================================
test.describe('1. Login per role', () => {
  for (const user of USERS) {
    test(`${user.role} (${user.email}) — login berhasil + role badge benar`, async ({
      page,
    }) => {
      await login(page, user.email, user.password);

      // Sprint 6 patch (Stitch v1 dashboard): hero greeting uses
      // firstName ("Selamat datang, {Admin}"). Full name still rendered
      // by AppHeader as plain span — assert via getByText, not heading.
      const firstName = user.fullName.split(' ')[0];
      await expect(
        page.getByRole('heading', { name: new RegExp(`Selamat datang, ${firstName}`) }),
      ).toBeVisible({ timeout: 10_000 });

      // AppHeader still shows full_name + role badge
      await expect(page.getByText(user.fullName).first()).toBeVisible();
      await expect(page.getByText(user.badgeLabel, { exact: true }).first()).toBeVisible();

      // URL = / (dashboard)
      await expect(page).toHaveURL(/\/$/);

      // "Keluar" button visible
      await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible();
    });
  }
});

// ============================================================
// 2. LOGOUT per role + network capture
// ============================================================
test.describe('2. Logout — Bug 1 network capture', () => {
  for (const user of USERS) {
    test(`${user.role} — Keluar trigger /auth/v1/logout call`, async ({ page }) => {
      const authRequests = captureAuthRequests(page);
      const authResponses = captureAuthResponses(page);

      // Login first
      await login(page, user.email, user.password);
      await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible({
        timeout: 10_000,
      });

      // Snapshot count sebelum logout supaya hanya inspect logout-related
      const reqBefore = authRequests.length;
      const resBefore = authResponses.length;

      // Click Keluar
      await page.getByRole('button', { name: 'Keluar' }).click();

      // Wait redirect ke /login (proxy untuk "logout completed")
      await page.waitForURL(/\/login/, { timeout: 10_000 });

      // Wait untuk flush in-flight requests post-redirect
      await page.waitForTimeout(1000);

      const logoutRequests = authRequests.slice(reqBefore);
      const logoutResponses = authResponses.slice(resBefore);
      const logoutEndpointHits = logoutRequests.filter((r) =>
        r.url().includes('/auth/v1/logout'),
      );
      const logoutEndpointResponses = logoutResponses.filter((r) =>
        r.url.includes('/auth/v1/logout'),
      );

      // Log untuk investigation Bug 1
      console.log(`\n[${user.role}] === Bug 1 investigation ===`);
      console.log(`[${user.role}] Requests fired post-Keluar: ${logoutRequests.length}`);
      logoutRequests.forEach((r) => {
        console.log(`  REQ → ${r.method()} ${r.url()}`);
      });
      console.log(`[${user.role}] Responses received post-Keluar: ${logoutResponses.length}`);
      logoutResponses.forEach((r) => {
        console.log(`  RES ← ${r.method} ${r.url} [${r.status}]`);
      });

      // ASSERTION 1: request fired
      expect(logoutEndpointHits.length).toBeGreaterThanOrEqual(1);
      expect(logoutEndpointHits[0]?.method()).toBe('POST');

      // ASSERTION 2: response received (not cancelled by navigation)
      expect(logoutEndpointResponses.length).toBeGreaterThanOrEqual(1);
      const status = logoutEndpointResponses[0]?.status;
      // Supabase logout typically returns 204 (no content) atau 200
      expect(typeof status === 'number' && status >= 200 && status < 300).toBe(true);
    });
  }
});

// ============================================================
// 3. SESSION PERSIST — login + reload = stay logged in
// ============================================================
test.describe('3. Session persist', () => {
  test('login → reload → tetap di dashboard (not redirect to login)', async ({
    page,
  }) => {
    const user = USERS[0]!; // admin
    await login(page, user.email, user.password);

    const firstName = user.fullName.split(' ')[0];
    await expect(
      page.getByRole('heading', { name: new RegExp(`Selamat datang, ${firstName}`) }),
    ).toBeVisible({ timeout: 10_000 });

    // Hard reload
    await page.reload();

    // After reload, expect dashboard re-render — bukan stuck "Memuat..." atau redirect ke /login
    await expect(
      page.getByRole('heading', { name: new RegExp(`Selamat datang, ${firstName}`) }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/$/);
  });
});

// ============================================================
// 4. WRONG CREDENTIALS — error message muncul
// ============================================================
test.describe('4. Wrong credentials', () => {
  test('email valid + password salah → error message muncul', async ({ page }) => {
    await login(page, 'admin@kalatask.test', 'PasswordSalah999!');

    // Error message visible (microcopy: "Email atau password salah. Coba lagi atau reset password.")
    await expect(
      page.getByText(/Email atau password salah/i),
    ).toBeVisible({ timeout: 10_000 });

    // Tetap di /login — tidak redirect
    await expect(page).toHaveURL(/\/login/);

    // Tidak ada button Keluar (gak masuk dashboard)
    await expect(page.getByRole('button', { name: 'Keluar' })).not.toBeVisible();
  });

  test('email tidak terdaftar → error message muncul', async ({ page }) => {
    await login(page, 'tidak-ada@kalatask.test', 'AnyPassword123!');

    await expect(
      page.getByText(/Email atau password salah/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

// ============================================================
// 5. PROTECTED ROUTE — / tanpa session = redirect /login
// ============================================================
test.describe('5. Protected route', () => {
  test('akses / tanpa session → auto redirect ke /login', async ({ page, context }) => {
    // Clear semua cookies + localStorage untuk simulasi fresh visitor
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Re-navigate setelah clear
    await page.goto('/');

    // Expect redirect ke /login
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    // LoginPage UI muncul (CardTitle = div, bukan <h2>, jadi pakai getByText)
    await expect(page.getByText('Masuk ke KalaTask')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Kata Sandi')).toBeVisible();
  });
});
