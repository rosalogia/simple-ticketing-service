import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { USERS, QUEUE } from './helpers/seed-data';

/**
 * Switch user via the dropdown without using loginAs (avoids waitForURL
 * timeout when the target user has multiple queues).
 */
async function switchToUser(page: Page, displayName: string) {
  await page.goto('/queues');
  await page.getByText('Viewing as').waitFor();
  const select = page.locator('select').filter({ has: page.locator(`option:text("${displayName}")`) });
  const current = await select.inputValue();
  const optionValue = await select.locator(`option:text("${displayName}")`).getAttribute('value');
  if (current === optionValue) return;
  await select.selectOption({ label: displayName });
  await page.getByText('Viewing as').waitFor();
  await page.waitForTimeout(500);
}

/** Navigate into the Housemates queue from the queue list. */
async function goToHousemates(page: Page) {
  const url = page.url();
  if (!url.match(/\/queues\/\d/)) {
    await page.getByRole('main').getByText(QUEUE.name).click();
    await page.waitForURL('**/queues/*');
  }
}

test.describe('Notifications', () => {
  test('full notification lifecycle: assign, comment, status, navigate, delete, mark-all-read', async ({ page, loginAs }) => {
    const ticketTitle = `Notif E2E ${Date.now()}`;

    // ── 1. Alice creates a ticket assigned to Bob ────────────────────
    await loginAs('alice');
    await goToHousemates(page);

    await page.getByRole('button', { name: /New Ticket|New/ }).click();
    await page.getByPlaceholder('What needs to be done?').fill(ticketTitle);
    await page.locator('select').filter({ has: page.locator('option:text("Select person...")') }).selectOption({ label: USERS.bob.displayName });
    await page.getByRole('button', { name: 'Create Ticket' }).click();

    // Verify ticket was created
    await page.getByRole('button', { name: /By Me/ }).click();
    await expect(page.getByRole('cell', { name: ticketTitle }).first()).toBeVisible();

    // ── 2. Bob sees assignment notification ──────────────────────────
    await switchToUser(page, USERS.bob.displayName);
    await page.getByTitle('Notifications').click();
    await expect(page.getByText(ticketTitle).first()).toBeVisible();

    // Close the dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // ── 3. Bob comments → Alice gets comment notification ───────────
    await goToHousemates(page);
    await page.getByRole('button', { name: /To Me/ }).click();
    await page.getByRole('cell', { name: ticketTitle }).first().click();

    await page.getByPlaceholder('Add a comment...').fill('Working on this now!');
    await page.getByRole('button', { name: 'Post' }).click();
    await expect(page.getByText('Working on this now!')).toBeVisible();

    await switchToUser(page, USERS.alice.displayName);
    await page.getByTitle('Notifications').click();
    await expect(page.getByText(`Comment on: ${ticketTitle}`)).toBeVisible();

    // Close dropdown
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // ── 4. Bob changes status → Alice gets status_change notification
    await switchToUser(page, USERS.bob.displayName);
    await goToHousemates(page);
    await page.getByRole('button', { name: /To Me/ }).click();
    await page.getByRole('cell', { name: ticketTitle }).first().click();
    await page.getByRole('button', { name: 'Start Work' }).click();
    await expect(page.getByText('In Progress')).toBeVisible();

    await switchToUser(page, USERS.alice.displayName);
    await page.getByTitle('Notifications').click();
    await expect(page.getByText('changed status to IN_PROGRESS').first()).toBeVisible();

    // ── 5. Click notification → navigates to ticket ─────────────────
    await page.getByText('changed status to IN_PROGRESS').first().click();
    await expect(page.getByRole('heading', { name: ticketTitle })).toBeVisible();

    // ── 6. Delete a notification ────────────────────────────────────
    await switchToUser(page, USERS.alice.displayName);
    await page.getByTitle('Notifications').click();
    await expect(page.getByText(`Comment on: ${ticketTitle}`)).toBeVisible();

    // Click delete on the comment notification
    const commentNotif = page.getByText(`Comment on: ${ticketTitle}`);
    const container = commentNotif.locator('xpath=ancestor::div[contains(@class,"border-b")]');
    await container.locator('button[title="Delete notification"]').click();
    await expect(commentNotif).not.toBeVisible();

    // ── 7. Mark all read ────────────────────────────────────────────
    const markAllBtn = page.getByText('Mark all read');
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();
      await expect(markAllBtn).not.toBeVisible();
    }
  });
});
