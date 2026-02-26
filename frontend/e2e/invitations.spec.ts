import { test, expect } from './fixtures';

test.describe('Invitations', () => {
  const newQueueName = 'E2E Test Queue';

  test('alice creates a queue, invites bob, bob accepts', async ({ page, loginAs }) => {
    // --- Alice creates a new queue ---
    await loginAs('alice');
    await page.goto('/queues/new');

    await page.getByPlaceholder('e.g., Housemates, Work Team').fill(newQueueName);
    await page.getByPlaceholder('What is this queue for?').fill('Queue created by e2e test');
    await page.getByRole('button', { name: 'Create Queue' }).click();

    // Should redirect to the new queue's dashboard
    await page.waitForURL('**/queues/*');
    // The queue name appears in the header nav as a selected option
    await expect(page.locator('main')).toBeVisible();

    // --- Alice invites bob ---
    // Navigate to queue settings via the gear icon
    await page.getByTitle('Queue settings').or(page.getByTitle('Queue Settings')).click();
    await expect(page.getByRole('heading', { name: 'Queue Settings' })).toBeVisible();

    // Fill in the invite form
    await page.getByPlaceholder('Username to invite...').fill('bob');
    await page.getByRole('button', { name: 'Invite' }).click();

    // Wait for the success toast
    await expect(page.getByText('Invitation sent!')).toBeVisible();

    // --- Switch to bob and accept the invitation ---
    await loginAs('bob');

    // Open notifications dropdown
    await page.getByTitle('Notifications').click();
    await expect(page.getByText('Notifications', { exact: true })).toBeVisible();

    // Bob should see the invitation from Alice
    await expect(page.getByText(`Alice Chen invited you to ${newQueueName}`).first()).toBeVisible();

    // Accept the invitation
    await page.getByRole('button', { name: 'Accept' }).first().click();

    // The invitation should disappear
    await expect(page.getByText(`Alice Chen invited you to ${newQueueName}`)).not.toBeVisible();

    // Verify bob can navigate to the new queue
    await page.goto('/queues');
    await expect(page.getByRole('main').getByText(newQueueName)).toBeVisible();
  });
});
