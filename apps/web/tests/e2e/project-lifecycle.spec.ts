/**
 * E2E: Sprint 2 Step 1 + 2 — F14 project lifecycle UI + role gating.
 *
 * Coverage (data-agnostic — tidak depend on specific project rows):
 * 1. Admin login → /projects render dengan filter bar
 * 2. Manager login → /projects render dengan filter, no team filter dropdown
 * 3. Member login → /projects render dengan filter, no team filter dropdown
 * 4. Viewer login → /projects render dengan filter + team filter
 * 5. Status filter chip click → URL update dengan f.status param
 * 6. Filter URL deep link → reload preserves filter state
 *
 * Note: project detail page tests (F14 status select per role) butuh
 * data project seed. Defer ke Sprint 3 saat seed data eksplisit.
 */
import { test, expect, type Page } from '@playwright/test';

interface TestUser {
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
}

const ADMIN: TestUser = {
  email: 'admin@kalatask.test',
  password: 'TestAdmin123!',
  role: 'admin',
};
const MANAGER: TestUser = {
  email: 'sari@kalatask.test',
  password: 'TestSari123!',
  role: 'manager',
};
const MEMBER: TestUser = {
  email: 'andi@kalatask.test',
  password: 'TestAndi123!',
  role: 'member',
};
const VIEWER: TestUser = {
  email: 'maya@kalatask.test',
  password: 'TestMaya123!',
  role: 'viewer',
};

async function login(page: Page, user: TestUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByRole('button', { name: 'Keluar' })).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('F14 Project lifecycle — projects page render per role', () => {
  test('admin: /projects render dengan filter bar + team filter visible', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/projects');

    await expect(
      page.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible();

    // Status filter chips visible (5 enum)
    await expect(page.getByRole('button', { name: 'Planning' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'On Hold' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Completed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archived' })).toBeVisible();

    // Team filter visible untuk admin (cross-team scope)
    await expect(page.locator('#filter-team')).toBeVisible();
  });

  test('manager: /projects render — no team filter (RLS team-scoped)', async ({
    page,
  }) => {
    await login(page, MANAGER);
    await page.goto('/projects');

    await expect(
      page.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible();

    // Team filter HIDDEN untuk manager (RLS sudah team-scope, no need UI filter)
    await expect(page.locator('#filter-team')).toBeHidden();
  });

  test('member: /projects render — no team filter, status filter ada', async ({
    page,
  }) => {
    await login(page, MEMBER);
    await page.goto('/projects');

    await expect(
      page.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Active' })).toBeVisible();
    await expect(page.locator('#filter-team')).toBeHidden();
  });

  test('viewer: /projects render dengan team filter (cross-team management)', async ({
    page,
  }) => {
    await login(page, VIEWER);
    await page.goto('/projects');

    await expect(
      page.getByRole('heading', { name: 'Projects' }),
    ).toBeVisible();

    // Viewer = cross-team per ADR-002 → team filter visible
    await expect(page.locator('#filter-team')).toBeVisible();
  });
});

test.describe('Filter URL state', () => {
  test('click status chip update URL dengan f.status param', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/projects');

    await page.getByRole('button', { name: 'Active' }).click();
    await expect(page).toHaveURL(/f\.status=active/);
  });

  test('multiple chip click — comma-separated multi status', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/projects');

    await page.getByRole('button', { name: 'Active' }).click();
    await page.getByRole('button', { name: 'Planning' }).click();
    // Order may vary; assert both present
    await expect(page).toHaveURL(/f\.status=.*active.*/);
    await expect(page).toHaveURL(/f\.status=.*planning.*/);
  });

  test('deep link f.status=active → chip pre-selected on load', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/projects?f.status=active');

    const activeChip = page.getByRole('button', { name: 'Active' });
    await expect(activeChip).toHaveAttribute('aria-pressed', 'true');
  });

  test('reset button clears filter dari URL', async ({ page }) => {
    await login(page, ADMIN);
    await page.goto('/projects?f.status=active');

    await page.getByRole('button', { name: /Reset/ }).click();
    await expect(page).not.toHaveURL(/f\.status/);
  });
});

test.describe('Project detail empty state', () => {
  test('navigate ke project ID yang tidak exist → empty state Indonesian', async ({
    page,
  }) => {
    await login(page, ADMIN);
    // Random UUID yang tidak match any project
    await page.goto('/projects/00000000-0000-0000-0000-99999999ffff');

    // RLS atau missing row → empty state
    await expect(
      page.getByText(/tidak ditemukan|tidak punya akses/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
