import { test, expect } from './fixtures';

test.describe('Discord Integration', () => {
  test('authenticated session works without dev mode', async ({ page, loginWithDiscordToken }) => {
    await loginWithDiscordToken();

    // Should not show dev mode UI
    await expect(page.getByText('Viewing as')).not.toBeVisible();
  });

  test('From Discord tab lists servers and imports successfully', async ({ page, loginWithDiscordToken }) => {
    await loginWithDiscordToken();

    // Navigate to Create Queue
    await page.getByRole('button', { name: /create/i }).first().click();
    await expect(page).toHaveURL(/\/queues\/new/);

    // Click the "From Discord" tab
    await page.getByRole('button', { name: 'From Discord' }).click();

    // Should NOT show dev mode message
    await expect(page.getByText('Discord integration is not available in dev mode')).not.toBeVisible();

    // Wait for servers to load
    await expect(page.getByText('Loading your Discord servers...')).not.toBeVisible({ timeout: 15000 });

    // Should NOT show an error
    await expect(page.locator('[class*="sev1"]')).not.toBeVisible();

    // Should show the "Testing" server
    await expect(page.getByText('Testing')).toBeVisible();
    await expect(page.getByText('Showing servers where you')).toBeVisible();

    // The "Testing" server should have an Import button (bot is in the server)
    const importButton = page.getByRole('button', { name: 'Import' });
    await expect(importButton).toBeVisible();

    // Click Import
    await importButton.click();

    // Should redirect to the new queue's page
    await expect(page).toHaveURL(/\/queues\/\d+/, { timeout: 15000 });

    // The queue should show the server name
    await expect(page.getByText('Testing')).toBeVisible();
  });

  test('imported server disappears from server list', async ({ page, loginWithDiscordToken }) => {
    await loginWithDiscordToken();

    // Navigate to Create Queue — the "Testing" server was imported in the previous test
    // (tests share the same DB and run serially)
    await page.goto('/queues/new');
    await page.getByRole('button', { name: 'From Discord' }).click();
    await expect(page.getByText('Loading your Discord servers...')).not.toBeVisible({ timeout: 15000 });

    // The "Testing" server should no longer appear (already imported)
    await expect(page.getByText('No eligible servers found')).toBeVisible();
  });

  test('Discord-linked queue shows badge and sync in settings', async ({ page, loginWithDiscordToken }) => {
    await loginWithDiscordToken();

    // The "Testing" queue was imported in a previous test — navigate to it
    await page.goto('/queues');

    // Click on the Testing queue
    await page.getByText('Testing').first().click();
    await expect(page).toHaveURL(/\/queues\/\d+/);

    // Open queue settings via the gear icon button
    await page.getByRole('button', { name: 'Queue Settings' }).click();
    await expect(page).toHaveURL(/\/settings/);

    // Should show Discord Linked badge
    await expect(page.getByText('Discord Linked')).toBeVisible();

    // Should show Discord Sync section with Sync Now button
    await expect(page.getByText('Discord Sync')).toBeVisible();
    await expect(page.getByRole('button', { name: /sync now/i })).toBeVisible();
  });
});
