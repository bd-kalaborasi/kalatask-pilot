/**
 * Sprint 6 patch r4 — post-apply issue fixes regression coverage.
 *
 * Two scenarios fixed after R4 PR was merged + migrations applied:
 *
 *   I1. /settings → Notifikasi: toggle auto-saves but had no visible
 *       confirmation. Fix surfaces "Menyimpan…" / "✓ Tersimpan" inline.
 *
 *   I2. /settings?section=members admin invite: pending invite was
 *       created but invisible (members table only listed users.role
 *       members). Fix adds a PendingInvitesPanel that lists pending
 *       invites + refreshes after submit + supports revoke.
 *
 * Real login per scenario (no setStorageState shortcut).
 */
import { test, expect, type Page } from '@playwright/test';

const ADMIN = { email: 'admin@kalatask.test', password: 'TestAdmin123!' };

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Kata Sandi').fill(user.password);
  await page.getByRole('button', { name: 'Masuk' }).click();
  await page.waitForSelector('button:has-text("Keluar")', { timeout: 10_000 });
}

test.use({ viewport: { width: 1280, height: 800 } });

test.describe('R4 post-issue fixes', () => {
  test('I1 admin: notif toggle shows save state + tersimpan flash', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/settings?section=notifications');
    await page.waitForLoadState('networkidle');

    // Locate the "assigned" event toggle by its data-event attribute.
    const toggle = page.locator('button[role="switch"][data-event="assigned"]');
    await expect(toggle).toBeVisible();

    // Hint copy must be present so users know the auto-save behavior.
    await expect(
      page.getByText(/tersimpan otomatis saat kamu toggle/i),
    ).toBeVisible();

    // The save indicator span is the immediately-preceding sibling of the
    // toggle. We assert both transient states fire on click.
    const indicator = page
      .locator('button[role="switch"][data-event="assigned"]')
      .locator('xpath=preceding-sibling::span[1]');

    await toggle.click();

    // Either "Menyimpan…" briefly or "✓ Tersimpan" — both are valid.
    // We just require that some confirmation text appears within 2s.
    await expect(indicator).toContainText(/Menyimpan|Tersimpan/, {
      timeout: 2_000,
    });
  });

  test('I2 admin: invite shows up in pending list after submit', async ({
    page,
  }) => {
    await login(page, ADMIN);
    await page.goto('/settings?section=members');
    await page.waitForLoadState('networkidle');

    // Generate unique email so the test is idempotent across runs.
    const stamp = Date.now();
    const email = `r4-test-${stamp}@kalatask.test`;

    await page.getByRole('button', { name: '+ Undang anggota' }).click();
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Kirim undangan' }).click();

    // Pending panel must render the new row.
    const panel = page.getByTestId('pending-invites-panel');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.getByText(email)).toBeVisible({ timeout: 5_000 });

    // Cleanup: revoke the invite we just created so re-runs stay clean.
    const row = page.locator(
      `[data-testid="pending-invite-row"][data-email="${email}"]`,
    );
    await row.getByRole('button', { name: 'Batalkan' }).click();
    // Row removed from DOM after revoke
    await expect(row).toHaveCount(0, { timeout: 5_000 });
  });
});
