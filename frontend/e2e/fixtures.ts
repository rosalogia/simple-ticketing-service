import { test as base, expect } from '@playwright/test';
import { USERS } from './helpers/seed-data';

type UserKey = keyof typeof USERS;

type Fixtures = {
  loginAs: (user: UserKey) => Promise<void>;
};

export const test = base.extend<Fixtures>({
  loginAs: async ({ page }, use) => {
    const fn = async (user: UserKey) => {
      await page.goto('/queues');
      // Wait for dev mode auto-login to complete
      await page.getByText('Viewing as').waitFor();

      const displayName = USERS[user].displayName;
      const select = page.locator('select').filter({ has: page.locator(`option:text("${displayName}")`) });
      const current = await select.inputValue();

      // If already logged in as this user, nothing to do
      const optionValue = await select.locator(`option:text("${displayName}")`).getAttribute('value');
      if (current === optionValue) return;

      // Switch to the desired user
      await select.selectOption({ label: displayName });
      // Switching user navigates to /queues and reloads data
      await page.waitForURL('**/queues/**');
      await page.getByText('Viewing as').waitFor();
    };
    await use(fn);
  },
});

export { expect };
