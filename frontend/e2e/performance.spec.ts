import { test, expect } from './fixtures';
import { USERS, QUEUE } from './helpers/seed-data';
import type { Page } from '@playwright/test';

/** Ensure we're on the Housemates queue dashboard. */
async function ensureOnDashboard(page: Page) {
  // If we're already on a queue dashboard, check if it's the right one
  if (page.url().match(/\/queues\/\d+$/)) {
    // Already on a queue dashboard — check for the tab buttons
    const toMeBtn = page.getByRole('button', { name: /To Me/ });
    if (await toMeBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      return;
    }
  }

  // We're on the queue list — click Housemates
  await page.getByRole('heading', { name: QUEUE.name }).click();
  await page.getByRole('button', { name: /To Me/ }).waitFor();
}

test.describe('Performance Dashboard', () => {
  test('navigate via dashboard chart icon and verify content', async ({ page, loginAs }) => {
    await loginAs('alice');
    await ensureOnDashboard(page);

    // Click the performance icon in the tab bar
    await page.getByTitle('My Performance').click();
    await page.waitForURL('**/performance/**');

    // Verify header renders with user name
    await expect(page.getByText('Performance Dashboard')).toBeVisible();
    await expect(page.getByRole('heading', { name: USERS.alice.displayName })).toBeVisible();

    // Verify stat cards render
    await expect(page.getByText('Unclosed Tickets')).toBeVisible();
    await expect(page.getByText('Oldest Unclosed')).toBeVisible();
    await expect(page.getByText('Avg Close Time')).toBeVisible();
    await expect(page.getByText('Avg Pickup Time')).toBeVisible();

    // Verify resolution quality section
    await expect(page.getByText('Resolution Quality')).toBeVisible();

    // Verify chart section
    await expect(page.getByText('Tickets per Week')).toBeVisible();
  });

  test('navigate via queue settings member link', async ({ page, loginAs }) => {
    await loginAs('alice');
    await ensureOnDashboard(page);

    // Go to queue settings
    await page.getByTitle('Queue Settings').click();
    await page.waitForURL('**/settings');

    // Click the performance icon for a member
    const performanceButtons = page.getByTitle('View performance');
    await expect(performanceButtons.first()).toBeVisible();
    await performanceButtons.first().click();

    await page.waitForURL('**/performance/**');
    await expect(page.getByText('Performance Dashboard')).toBeVisible();
  });

  test('back navigation works', async ({ page, loginAs }) => {
    await loginAs('alice');
    await ensureOnDashboard(page);

    await page.getByTitle('My Performance').click();
    await page.waitForURL('**/performance/**');
    await expect(page.getByText('Performance Dashboard')).toBeVisible();

    // Click back button
    await page.getByRole('button', { name: 'Back' }).click();

    // Should be back at the dashboard
    await expect(page.getByRole('button', { name: /To Me/ })).toBeVisible();
  });
});
