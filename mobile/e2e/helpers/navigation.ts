import {by, element, expect, waitFor} from 'detox';
import {QUEUE} from './seed-data';

/**
 * Navigate into the Housemates queue from the queue list screen.
 */
export async function goToHousematesQueue() {
  await element(by.text(QUEUE.name)).tap();
  // Wait for the dashboard tabs to appear
  await expect(element(by.id('tab-to-me'))).toBeVisible();
}

/**
 * Switch to the "By Me" tab on the dashboard.
 */
export async function switchToByMeTab() {
  await element(by.id('tab-by-me')).tap();
}

/**
 * Switch to the "To Me" tab on the dashboard.
 */
export async function switchToToMeTab() {
  await element(by.id('tab-to-me')).tap();
}

/**
 * Navigate to the Notifications tab.
 */
export async function goToNotifications() {
  await element(by.label('tab-bar-notifications')).tap();
}

/**
 * Navigate to the Settings tab.
 */
export async function goToSettings() {
  await element(by.label('tab-bar-settings')).tap();
}

/**
 * Tap the FAB and wait for the create ticket form.
 */
export async function navigateToCreateTicket() {
  await element(by.id('new-ticket-fab')).tap();
  await waitFor(element(by.id('title-input')))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Scroll until the submit button is visible on the create ticket form.
 */
export async function scrollToSubmit() {
  await waitFor(element(by.id('submit-ticket-button')))
    .toBeVisible()
    .whileElement(by.id('create-ticket-scroll'))
    .scroll(200, 'down');
}
