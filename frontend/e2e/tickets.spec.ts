import { test, expect } from './fixtures';
import { QUEUE } from './helpers/seed-data';

test.describe('Tickets', () => {
  const newTicketTitle = 'E2E: Buy groceries for the week';
  const newTicketDescription = 'Milk, eggs, bread, and veggies';

  test('create a new ticket', async ({ page, loginAs }) => {
    await loginAs('alice');

    // Navigate to Housemates queue
    const url = page.url();
    if (url.endsWith('/queues') || url.endsWith('/queues/')) {
      await page.getByRole('main').getByText(QUEUE.name).click();
    }

    // Open new ticket form
    await page.getByRole('button', { name: /New Ticket|New/ }).click();

    // Fill out the form
    await page.getByPlaceholder('What needs to be done?').fill(newTicketTitle);
    await page.getByPlaceholder('Add context, details, or instructions...').fill(newTicketDescription);

    // Select an assignee (bob)
    await page.locator('select').filter({ has: page.locator('option:text("Select person...")') }).selectOption({ label: 'Bob Martinez' });

    // Submit
    await page.getByRole('button', { name: 'Create Ticket' }).click();

    // Ticket should appear in the dashboard (By Me tab since alice created it)
    await page.getByRole('button', { name: /By Me/ }).click();
    await expect(page.getByRole('cell', { name: newTicketTitle })).toBeVisible();
  });

  test('view ticket detail page', async ({ page, loginAs }) => {
    await loginAs('alice');

    const url = page.url();
    if (url.endsWith('/queues') || url.endsWith('/queues/')) {
      await page.getByRole('main').getByText(QUEUE.name).click();
    }

    // Click on the ticket we just created (in "By Me" tab)
    await page.getByRole('button', { name: /By Me/ }).click();
    await page.getByRole('cell', { name: newTicketTitle }).click();

    // Verify we're on the detail page — use heading for unique match
    await expect(page.getByRole('heading', { name: newTicketTitle })).toBeVisible();
    await expect(page.getByText(newTicketDescription)).toBeVisible();
    await expect(page.getByText(/Sev-3/)).toBeVisible();
  });

  test('change ticket status through lifecycle', async ({ page, loginAs }) => {
    await loginAs('alice');

    const url = page.url();
    if (url.endsWith('/queues') || url.endsWith('/queues/')) {
      await page.getByRole('main').getByText(QUEUE.name).click();
    }

    // Navigate to the ticket detail
    await page.getByRole('button', { name: /By Me/ }).click();
    await page.getByRole('cell', { name: newTicketTitle }).click();

    // Start Work: Open → In Progress
    await page.getByRole('button', { name: 'Start Work' }).click();
    await expect(page.getByText('In Progress')).toBeVisible();

    // Complete: In Progress → Completed
    await page.getByRole('button', { name: 'Complete' }).click();
    await expect(page.getByText('Completed')).toBeVisible();

    // Reopen: Completed → Open
    await page.getByRole('button', { name: 'Reopen' }).click();
    await expect(page.getByText('Open').first()).toBeVisible();
  });
});
