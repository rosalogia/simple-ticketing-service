import {by, device, element, expect} from 'detox';
import {USERS} from './helpers/seed-data';
import {loginAs, logout} from './helpers/login';

describe('Auth', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows all 4 seeded users in dev mode', async () => {
    await expect(element(by.text('Dev Mode - Select User'))).toBeVisible();
    await expect(element(by.id('dev-user-list'))).toBeVisible();

    for (const user of Object.values(USERS)) {
      await expect(element(by.text(user.displayName))).toBeVisible();
    }
  });

  it('logs in as alice and sees queue list', async () => {
    await loginAs('alice');
    await expect(element(by.text('Housemates'))).toBeVisible();
  });

  it('logs out and returns to login screen', async () => {
    await loginAs('alice');
    await logout();
    await expect(element(by.text('Dev Mode - Select User'))).toBeVisible();
  });

  it('can switch between users', async () => {
    await loginAs('alice');
    await expect(element(by.text('Queues'))).toBeVisible();

    await logout();
    await loginAs('bob');
    await expect(element(by.text('Queues'))).toBeVisible();
  });
});
