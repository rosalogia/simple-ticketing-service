import {by, device, element, expect, waitFor} from 'detox';
import {loginAs} from './helpers/login';
import {goToHousematesQueue, switchToByMeTab} from './helpers/navigation';

describe('Tickets', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAs('alice');
    await goToHousematesQueue();
  });

  it('creates a new ticket', async () => {
    await element(by.id('new-ticket-fab')).tap();

    await element(by.id('title-input')).typeText('E2E test ticket');
    await element(by.id('description-input')).typeText('Created by Detox E2E test');
    // Dismiss keyboard: description is multiline so tapReturnKey inserts a
    // newline. Tap the single-line title then press return to dismiss instead.
    await element(by.id('title-input')).tap();
    await element(by.id('title-input')).tapReturnKey();
    await waitFor(element(by.id('submit-ticket-button')))
      .toBeVisible()
      .whileElement(by.id('create-ticket-scroll'))
      .scroll(200, 'down');
    await element(by.id('submit-ticket-button')).tap();

    // Should navigate back to dashboard
    await expect(element(by.id('tab-to-me'))).toBeVisible();
  });

  it('new ticket appears in By Me tab', async () => {
    await switchToByMeTab();
    await expect(element(by.text('E2E test ticket'))).toBeVisible();
  });

  it('can view ticket detail', async () => {
    await switchToByMeTab();
    await element(by.text('E2E test ticket')).tap();

    await expect(element(by.id('ticket-title'))).toBeVisible();
    await expect(element(by.text('E2E test ticket'))).toBeVisible();
    await expect(element(by.id('ticket-status'))).toBeVisible();
  });

  it('can change ticket status through lifecycle', async () => {
    await switchToByMeTab();
    await element(by.text('E2E test ticket')).tap();

    // Open -> In Progress
    await element(by.text('In Progress')).tap();
    await element(by.text('Confirm')).tap();
    await expect(element(by.text('In Progress'))).toBeVisible();

    // In Progress -> Completed
    await element(by.text('Completed')).tap();
    await element(by.text('Confirm')).tap();
    await expect(element(by.text('Completed'))).toBeVisible();
  });
});
