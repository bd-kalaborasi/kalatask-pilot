/**
 * E2E: Sprint 2 Checkpoint 3 — automated coverage of 9 scenarios dari
 * docs/sprint-2-checkpoint-3-instructions.md.
 *
 * Pattern: mirror Sprint 1 Checkpoint 2 (auth.spec.ts):
 * - Headless Chromium single worker
 * - 4 test users (admin/sari/andi/maya)
 * - Screenshot on major scenario for visual evidence
 * - Network capture untuk verify API call relevant
 *
 * Prereq:
 * - Dev server running di localhost:5174
 * - Auth seed applied (4 users di auth.users + public.users)
 * - Demo seed (sprint_2_demo_seed.sql) DI-RECOMMENDED untuk full coverage.
 *   Without seed, data-dependent tests skip dengan pesan jelas.
 */
import {
  test,
  expect,
  type Page,
  type BrowserContext,
} from '@playwright/test';

interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  fullName: string;
  badgeLabel: string;
}

const ADMIN: TestUser = {
  email: 'admin@kalatask.test',
  password: 'TestAdmin123!',
  role: 'admin',
  fullName: 'Admin Test',
  badgeLabel: 'Admin',
};
const SARI: TestUser = {
  email: 'sari@kalatask.test',
  password: 'TestSari123!',
  role: 'manager',
  fullName: 'Sari Wijaya',
  badgeLabel: 'Manager',
};
const ANDI: TestUser = {
  email: 'andi@kalatask.test',
  password: 'TestAndi123!',
  role: 'member',
  fullName: 'Andi Pratama',
  badgeLabel: 'Member',
};
const MAYA: TestUser = {
  email: 'maya@kalatask.test',
  password: 'TestMaya123!',
  role: 'viewer',
  fullName: 'Maya Anggraini',
  badgeLabel: 'Viewer',
};

const ALL_USERS = [ADMIN, SARI, ANDI, MAYA] as const;

// Demo project IDs (sprint_2_demo_seed.sql)
const DEMO_PROJECT_ONBOARDING = '00000000-0000-0000-0000-0000000d1100';
const DEMO_PROJECT_FEEDBACK = '00000000-0000-0000-0000-0000000d2200';
const DEMO_PROJECT_MIGRASI = '00000000-0000-0000-0000-0000000d3300';

/**
 * Idempotent login. Handle case kalau session sudah aktif (mis. setelah
 * test.beforeEach login admin untuk seed check, lalu test body login
 * sebagai user lain — /login redirect ke / dan Email field tidak ada).
 *
 * Strategy: cek Email field visibility short-timeout. Kalau gak ada,
 * berarti sudah authed → logout dulu via tombol Keluar, lalu login fresh.
 */
async function dismissWizardIfVisible(page: Page) {
  const dialog = page.locator('[role="dialog"]');
  if (await dialog.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip tutorial' }).click();
    await dialog.waitFor({ state: 'hidden', timeout: 3_000 });
  }
}

async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');

  const emailVisible = await page
    .getByLabel('Email')
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (!emailVisible) {
    // Already authenticated → /login redirected ke /. Logout dulu.
    await dismissWizardIfVisible(page);
    await page.getByRole('button', { name: 'Keluar' }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
  }

  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible({
    timeout: 10_000,
  });
  await dismissWizardIfVisible(page);
}

async function seedDataPresent(page: Page): Promise<boolean> {
  // Login as admin (sees all) untuk check data presence
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  // Cari demo project name di list
  const demoVisible = await page
    .getByText('Demo: Onboarding Tim Q2')
    .isVisible()
    .catch(() => false);
  return demoVisible;
}

// ============================================================
// Scenario 1 — Login + Dashboard navigate (data-agnostic)
// ============================================================
test.describe('S1: Login + Dashboard navigate per role', () => {
  for (const user of ALL_USERS) {
    test(`${user.role} (${user.email}): login + role badge + nav bar visible`, async ({
      page,
    }) => {
      await login(page, user);

      // Role badge visible di header
      await expect(page.getByText(user.badgeLabel, { exact: true }).first()).toBeVisible();

      // Beranda + Projects nav link visible
      await expect(page.getByRole('link', { name: 'Beranda' })).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Projects', exact: true }),
      ).toBeVisible();

      // Buka Projects CTA berfungsi
      await page.getByRole('link', { name: 'Buka Projects' }).click();
      await expect(page).toHaveURL(/\/projects$/);
    });
  }
});

// ============================================================
// Scenario 2 — Project list per role visibility (semi-data-dependent)
// ============================================================
test.describe('S2: F14 project list page render per role', () => {
  test('admin: /projects render dengan filter bar + 5 status chips', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/projects');

    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    for (const status of ['Perencanaan', 'Aktif', 'Ditahan', 'Selesai', 'Diarsipkan']) {
      await expect(page.getByRole('button', { name: status })).toBeVisible();
    }
  });

  test('admin sees Team filter dropdown (cross-team)', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/projects');
    await expect(page.locator('#filter-team')).toBeVisible();
  });

  test('manager Sari: no Team filter (RLS team-scoped)', async ({ page }) => {
    await login(page, SARI);
    await page.goto('/projects');
    await expect(page.locator('#filter-team')).toBeHidden();
  });

  test('member Andi: no Team filter, status chips visible', async ({ page }) => {
    await login(page, ANDI);
    await page.goto('/projects');
    await expect(page.getByRole('button', { name: 'Aktif' })).toBeVisible();
    await expect(page.locator('#filter-team')).toBeHidden();
  });

  test('viewer Maya: Team filter visible (cross-team management overview)', async ({
    page,
  }) => {
    await login(page, MAYA);
    await page.goto('/projects');
    await expect(page.locator('#filter-team')).toBeVisible();
  });
});

// ============================================================
// Scenario 3 — F14 project status filter URL state
// ============================================================
test.describe('S3: Project status filter URL persistence', () => {
  test('click status chip update URL f.status', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/projects');
    await page.getByRole('button', { name: 'Aktif' }).click();
    await expect(page).toHaveURL(/f\.status=active/);
  });

  test('deep link f.status=active → chip pre-pressed', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/projects?f.status=active');
    await expect(
      page.getByRole('button', { name: 'Aktif' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('reset button clears filter URL', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/projects?f.status=active');
    await page.getByRole('button', { name: /Reset/ }).click();
    await expect(page).not.toHaveURL(/f\.status/);
  });

  test('combine f.status + f.team URL preserve admin', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto(
      `/projects?f.status=active&f.team=00000000-0000-0000-0000-00000000aaaa`,
    );
    await expect(
      page.getByRole('button', { name: 'Aktif' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#filter-team')).toHaveValue(
      '00000000-0000-0000-0000-00000000aaaa',
    );
  });
});

// ============================================================
// Scenario 4 — F14 project status update lifecycle (REQUIRES SEED)
// ============================================================
test.describe('S4: F14 project status update per role (requires seed)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(
      !present,
      'Demo seed data tidak ditemukan. Apply supabase/seed/sprint_2_demo_seed.sql via Dashboard untuk run scenario ini.',
    );
  });

  test('admin: navigate ke project detail + status select enabled', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}`);
    const select = page.locator('#project-status-select');
    await expect(select).toBeVisible({ timeout: 10_000 });
    await expect(select).toBeEnabled();
  });

  test('manager Sari: status select enabled untuk own project', async ({
    page,
  }) => {
    await login(page, SARI);
    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}`);
    const select = page.locator('#project-status-select');
    await expect(select).toBeVisible({ timeout: 10_000 });
    await expect(select).toBeEnabled();
  });

  test('member Andi: status select disabled (RLS UI guard)', async ({
    page,
  }) => {
    await login(page, ANDI);
    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}`);
    const select = page.locator('#project-status-select');
    if (await select.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await expect(select).toBeDisabled();
    }
    // Member SELECT projects via tasks transitive — may or may not see project
    // depending on assignment. Test passes either way (UI guard correct).
  });

  test('viewer Maya: status select disabled', async ({ page }) => {
    await login(page, MAYA);
    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}`);
    const select = page.locator('#project-status-select');
    await expect(select).toBeVisible({ timeout: 10_000 });
    await expect(select).toBeDisabled();
  });
});

// ============================================================
// Scenario 5 — F3 Three Views toggle (REQUIRES SEED for visual)
// ============================================================
test.describe('S5: F3 view toggle + URL persist', () => {
  test('view toggle UI visible saat di project detail page', async ({
    page,
  }) => {
    await login(page, ADMIN);
    // Bahkan tanpa seed, view toggle muncul kalau project ada
    const present = await seedDataPresent(page);
    test.skip(
      !present,
      'Demo seed required untuk verify view toggle UI di project detail.',
    );

    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}`);

    await expect(
      page.getByRole('button', { name: 'List', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Kanban', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Gantt', exact: true }),
    ).toBeVisible();
  });

  test('?view=kanban deep link → kanban active on load', async ({ page }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(!present, 'Demo seed required.');

    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}?view=kanban`);
    const kanbanBtn = page.getByRole('button', { name: 'Kanban', exact: true });
    await expect(kanbanBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('switch view preserve filter (F3 AC-5)', async ({ page }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(!present, 'Demo seed required.');

    await page.goto(
      `/projects/${DEMO_PROJECT_ONBOARDING}?f.tstatus=todo&view=list`,
    );
    // Switch to Kanban
    await page.getByRole('button', { name: 'Kanban', exact: true }).click();
    await expect(page).toHaveURL(/view=kanban/);
    await expect(page).toHaveURL(/f\.tstatus=todo/);
  });
});

// ============================================================
// Scenario 6 — Kanban 5 columns + Blocked visual urgency (REQUIRES SEED)
// ============================================================
test.describe('S6: Kanban 5 kolom + Blocked red urgency (Q1)', () => {
  test('5 column header visible: refined Indonesian labels (Sprint 6)', async ({
    page,
  }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(!present, 'Demo seed required.');

    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}?view=kanban`);

    // Wait kanban render
    await page.waitForLoadState('networkidle');

    // Kanban column headers (uppercase di componentm but case-insensitive match)
    const labels = ['Belum mulai', 'Sedang dikerjakan', 'Cek ulang', 'Selesai', 'Tertahan'];
    for (const label of labels) {
      // Each column has a header dengan label
      await expect(
        page.locator('[data-status]').filter({ hasText: label }).first(),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  test('Blocked column has red header (Q1 visual urgency)', async ({
    page,
  }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(!present, 'Demo seed required.');

    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}?view=kanban`);

    // Find column dengan data-status="blocked"
    const blockedColumn = page.locator('[data-status="blocked"]');
    await expect(blockedColumn).toBeVisible({ timeout: 10_000 });

    // Header carries red urgency via brand-tinted token (post Sprint 6
    // overhaul: bg-red-100 → bg-status-blocked-bg, text-feedback-danger).
    const header = blockedColumn.locator('header').first();
    await expect(header).toHaveClass(/bg-status-blocked-bg/);
  });
});

// ============================================================
// Scenario 7 — F3 AC-2 Kanban drag-drop status update (REQUIRES SEED)
// ============================================================
test.describe('S7: Kanban drag-drop F3 AC-2', () => {
  /**
   * Drag-drop interaction itself NOT automated — dnd-kit PointerSensor
   * (activationConstraint distance 6px) tidak kompatible dengan Playwright
   * mouse simulation maupun dispatchEvent pointer pattern. 2 attempt fix:
   *   1. page.mouse.down/move/up dengan multi-step intermediate
   *   2. dispatchEvent pointerdown/pointermove/pointerup di window
   * Both gagal trigger dnd-kit onDragEnd handler.
   *
   * Drag-drop verified MANUAL oleh owner (Sprint 2 retro R5 + Checkpoint 3
   * scenario 27 manual confirm: drag updates DB + persists after refresh).
   *
   * Automated coverage di sini: validate prerequisites yang make drag-drop
   * functional at runtime — Kanban render dengan tasks in expected columns,
   * cards punya draggable role, columns punya droppable data-status.
   *
   * Future work (Sprint 3+): explore alternative test pattern:
   *   - Component test via Vitest dengan @testing-library/user-event
   *     (better dnd-kit support than Playwright)
   *   - Atau direct API test untuk RLS verification (admin PATCH task status
   *     succeeds, member PATCH other-assignee task → 0 rowcount)
   */
  test('Kanban data structure ready untuk drag-drop interaction', async ({
    page,
  }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(!present, 'Demo seed required.');

    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}?view=kanban`);
    await page.waitForLoadState('networkidle');

    // Verify drop targets: 5 columns dengan data-status (droppable surface)
    for (const status of ['todo', 'in_progress', 'review', 'done', 'blocked']) {
      await expect(page.locator(`[data-status="${status}"]`)).toBeVisible({
        timeout: 10_000,
      });
    }

    // Verify draggable: at least 1 card di todo column dengan role="button"
    // (KanbanCard ARIA contract — dnd-kit useDraggable attaches there)
    const todoColumn = page.locator('[data-status="todo"]');
    const todoCards = todoColumn.locator('[role="button"]');
    const todoCardCount = await todoCards.count();
    expect(todoCardCount).toBeGreaterThan(0);

    // Verify card has aria-label dragdrop hint (UI contract)
    const firstCard = todoCards.first();
    const ariaLabel = await firstCard.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/drag/i);

    // Note: actual drag-drop interaction → manual Checkpoint 3 scenario 27.
    // Sprint 2 retro R5 acknowledges dnd-kit + Playwright limitation as
    // known-issue carry-over.
  });
});

// ============================================================
// Scenario 8 — F3 AC-3 Gantt rendering (REQUIRES SEED)
// ============================================================
test.describe('S8: Gantt view rendering F3 AC-3', () => {
  test('Gantt render SVG chart untuk task dengan deadline', async ({
    page,
  }) => {
    await login(page, ADMIN);
    const present = await seedDataPresent(page);
    test.skip(!present, 'Demo seed required.');

    await page.goto(`/projects/${DEMO_PROJECT_ONBOARDING}?view=gantt`);

    // Wait Gantt lazy-load chunk
    await page.waitForLoadState('networkidle', { timeout: 10_000 });

    // frappe-gantt render SVG dengan class "gantt"
    const ganttSvg = page.locator('svg.gantt');
    await expect(ganttSvg).toBeVisible({ timeout: 15_000 });

    // Bar(s) rendered
    const bars = page.locator('svg.gantt .bar-wrapper');
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThan(0);
  });
});

// ============================================================
// Scenario 9 — Sprint 1 regression check (data-agnostic)
// ============================================================
test.describe('S9: Sprint 1 regression', () => {
  test('Login → Logout flow tetap berfungsi', async ({ page }) => {
    await login(page, ADMIN);
    await page.getByRole('button', { name: 'Keluar' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('Refresh saat login → session persist (Bug 2 fix tetap intact)', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: new RegExp(ADMIN.fullName) }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Wrong credentials → error message Indonesian', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@kalatask.test');
    await page.getByLabel('Kata Sandi').fill('SalahPassword999!');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(
      page.getByText(/Email atau password salah/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Akses / tanpa session → redirect /login', async ({
    page,
    context,
  }: {
    page: Page;
    context: BrowserContext;
  }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto('/');
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
