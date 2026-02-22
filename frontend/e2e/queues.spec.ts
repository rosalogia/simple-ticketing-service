import { test, expect } from './fixtures';
import { QUEUE, TICKETS } from './helpers/seed-data';

test.describe('Queues', () => {
  test('shows the Housemates queue dashboard with ticket tabs', async ({ page, loginAs }) => {
    await loginAs('alice');

    const url = page.url();
    if (url.endsWith('/queues') || url.endsWith('/queues/')) {
      await page.getByRole('main').getByText(QUEUE.name).click();
    }

    await expect(page.getByRole('button', { name: /To Me/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /By Me/ })).toBeVisible();
  });

  test('shows correct tickets for alice (To Me tab)', async ({ page, loginAs }) => {
    await loginAs('alice');

    const url = page.url();
    if (url.endsWith('/queues') || url.endsWith('/queues/')) {
      await page.getByRole('main').getByText(QUEUE.name).click();
    }

    // Default filters show Open, In Progress, Blocked (not Completed/Cancelled)
    // Alice's assigned tickets that pass default filters:
    const visibleStatuses = ['Open', 'In Progress', 'Blocked'];
    const aliceVisibleTickets = TICKETS.filter(
      (t) => t.assignee === 'alice' && visibleStatuses.includes(t.status)
    );
    for (const ticket of aliceVisibleTickets) {
      await expect(page.getByRole('cell', { name: ticket.title })).toBeVisible();
    }
  });

  test('shows correct tickets for alice (By Me tab)', async ({ page, loginAs }) => {
    await loginAs('alice');

    const url = page.url();
    if (url.endsWith('/queues') || url.endsWith('/queues/')) {
      await page.getByRole('main').getByText(QUEUE.name).click();
    }

    // Switch to "By Me" tab
    await page.getByRole('button', { name: /By Me/ }).click();

    // Tickets assigned by alice that pass default filters (Open, In Progress, Blocked)
    const visibleStatuses = ['Open', 'In Progress', 'Blocked'];
    const aliceAssignedTickets = TICKETS.filter(
      (t) => t.assigner === 'alice' && visibleStatuses.includes(t.status)
    );
    for (const ticket of aliceAssignedTickets) {
      await expect(page.getByRole('cell', { name: ticket.title })).toBeVisible();
    }
  });
});
