import {by, device, element, expect} from 'detox';
import {USERS} from './seed-data';

type UserKey = keyof typeof USERS;

/**
 * Log in as a seeded user via the dev-mode user list.
 * The backend must be running with DEBUG=true for dev login to appear.
 */
export async function loginAs(userKey: UserKey) {
  const user = USERS[userKey];
  await expect(element(by.text('Dev Mode - Select User'))).toBeVisible();
  await element(by.id(`user-row-${user.username}`)).tap();
  // Wait for the queue list to appear after login
  await expect(element(by.text('Queues'))).toBeVisible();
}

/**
 * Log out by tapping the Logout button on the queue list screen.
 */
export async function logout() {
  await element(by.id('logout-button')).tap();
  await expect(element(by.text('Dev Mode - Select User'))).toBeVisible();
}

/**
 * Relaunch the app and log in fresh as the given user.
 */
export async function relaunchAndLoginAs(userKey: UserKey) {
  await device.reloadReactNative();
  await loginAs(userKey);
}
