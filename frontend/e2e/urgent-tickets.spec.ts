import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';
import { USERS, QUEUE } from './helpers/seed-data';

/** Ensure we're on the Housemates queue page. */
async function goToHousemates(page: Page) {
  // Wait for possible auto-redirect from /queues to /queues/:id
  try {
    await page.waitForURL(/\/queues\/\d/, { timeout: 3000 });
  } catch {
    // Not yet on a queue page — click into Housemates
    await page.getByRole('main').getByText(QUEUE.name).click();
    await page.waitForURL(/\/queues\/\d/);
  }
}

test.describe('Urgent Tickets Dropdown', () => {
  test('badge shows count for overdue seed-data tickets and dropdown shows overdue section', async ({
    page,
    loginAs,
  }) => {
    // Alice has "Pick up dry cleaning" (due Feb 10, 2026) which is overdue
    await loginAs('alice');
    await goToHousemates(page);

    // Badge should appear on the urgent tickets button
    const urgentButton = page.getByTestId('urgent-tickets-button');
    await expect(urgentButton).toBeVisible();
    const badge = page.getByTestId('urgent-badge');
    await expect(badge).toBeVisible({ timeout: 10000 });

    // Open dropdown
    await urgentButton.click();

    // Should see "Overdue" section header and the seed ticket
    await expect(page.getByText('OVERDUE').first()).toBeVisible();
    await expect(page.getByText('Pick up dry cleaning').first()).toBeVisible();

    // Queue name tag should be shown in the dropdown ticket row
    await expect(page.getByText(/days overdue/).first()).toBeVisible();
  });

  test('clicking a ticket in the dropdown navigates to its detail page', async ({
    page,
    loginAs,
  }) => {
    await loginAs('alice');
    await goToHousemates(page);

    const urgentButton = page.getByTestId('urgent-tickets-button');
    await urgentButton.click();
    await expect(page.getByText('OVERDUE').first()).toBeVisible();

    // Click the overdue ticket
    await page.getByText('Pick up dry cleaning').first().click();

    // Should navigate to the ticket detail page
    await page.waitForURL('**/queues/*/tickets/*');
    await expect(page.getByText('Pick up dry cleaning').first()).toBeVisible();
  });

  test('due-soon section appears for newly created tickets', async ({
    page,
    loginAs,
  }) => {
    await loginAs('alice');
    await goToHousemates(page);

    const title = `Due-Soon E2E ${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1); // tomorrow
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create a ticket due tomorrow
    await page.getByRole('button', { name: /New Ticket|New/ }).click();
    await page.getByPlaceholder('What needs to be done?').fill(title);
    const assigneeSelect = page
      .locator('select')
      .filter({ has: page.locator('option:text("Select person...")') });
    const matchingOption = assigneeSelect.locator('option').filter({ hasText: USERS.alice.displayName }).first();
    const optionValue = await matchingOption.getAttribute('value');
    await assigneeSelect.selectOption(optionValue!);
    await page.locator('input[type="date"]').fill(dueDateStr);
    await page.getByRole('button', { name: 'Create Ticket' }).click();
    await expect(page.getByRole('cell', { name: title }).first()).toBeVisible({ timeout: 5000 });

    // Reload to refresh the urgent tickets component
    await page.reload();
    await page.getByText('Viewing as').waitFor();

    // Open dropdown
    const urgentButton = page.getByTestId('urgent-tickets-button');
    await urgentButton.click();

    // Should see "Due Soon" section with the new ticket
    await expect(page.getByText('DUE SOON').first()).toBeVisible();
    await expect(page.getByText(title).first()).toBeVisible();
  });

  test('dropdown header is always visible when opened', async ({ page, loginAs }) => {
    await loginAs('alice');
    await goToHousemates(page);

    const urgentButton = page.getByTestId('urgent-tickets-button');
    await expect(urgentButton).toBeVisible();

    // Open dropdown — should show header
    await urgentButton.click();
    await expect(page.getByText('Urgent Tickets')).toBeVisible();
  });
});
