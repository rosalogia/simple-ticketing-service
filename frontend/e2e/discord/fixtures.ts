import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { test as base, expect } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));

type DiscordFixtures = {
  loginWithDiscordToken: () => Promise<void>;
};

export const test = base.extend<DiscordFixtures>({
  loginWithDiscordToken: async ({ page, context }, use) => {
    const fn = async () => {
      // Read the session ID created by global-setup
      const sessionFile = join(__dirname, '.discord-session-id');
      const sessionId = readFileSync(sessionFile, 'utf-8').trim();

      // Set the session cookie directly — no OAuth flow needed
      await context.addCookies([{
        name: 'session_id',
        value: sessionId,
        domain: 'localhost',
        path: '/',
      }]);

      // Navigate and verify we're logged in (not showing login page)
      await page.goto('/queues');
      await expect(page.getByRole('button', { name: 'Sign in with Discord' })).not.toBeVisible({ timeout: 10000 });
    };
    await use(fn);
  },
});

export { expect };
