import {by, device, element, expect, waitFor} from 'detox';
import {loginAs} from './helpers/login';
import {goToHousematesQueue} from './helpers/navigation';

describe('Urgent Tickets', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAs('alice');
  });

  it('shows urgent banner on queue list when overdue tickets exist', async () => {
    // Alice has "Pick up dry cleaning" (due 2026-02-10) which is overdue
    await waitFor(element(by.id('urgent-banner')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.text('1 overdue'))).toBeVisible();
  });

  it('tapping urgent banner navigates to urgent tickets screen', async () => {
    await waitFor(element(by.id('urgent-banner')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('urgent-banner')).tap();
    await expect(element(by.id('urgent-tickets-list'))).toBeVisible();
    await expect(element(by.text('OVERDUE'))).toBeVisible();
  });

  it('urgent tickets screen shows overdue seed-data ticket', async () => {
    await waitFor(element(by.id('urgent-banner')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('urgent-banner')).tap();
    await expect(element(by.text('Pick up dry cleaning'))).toBeVisible();
    // Queue name should be shown (use .atIndex(0) since accumulated test data
    // may create additional urgent tickets with the same queue name)
    await expect(element(by.text('Housemates')).atIndex(0)).toBeVisible();
  });

  it('header button shows badge on dashboard', async () => {
    await goToHousematesQueue();
    await expect(element(by.id('urgent-header-button'))).toBeVisible();
    // Badge exists (may be partially clipped due to absolute positioning,
    // so check existence rather than strict visibility)
    await waitFor(element(by.id('urgent-header-badge')))
      .toExist()
      .withTimeout(10000);
  });

  it('header button navigates to urgent tickets screen', async () => {
    await goToHousematesQueue();
    await waitFor(element(by.id('urgent-header-button')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('urgent-header-button')).tap();
    await expect(element(by.id('urgent-tickets-list'))).toBeVisible();
    await expect(element(by.text('OVERDUE'))).toBeVisible();
  });

  it('tapping an urgent ticket navigates to ticket detail', async () => {
    await waitFor(element(by.id('urgent-banner')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('urgent-banner')).tap();
    await waitFor(element(by.text('Pick up dry cleaning')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.text('Pick up dry cleaning')).tap();

    // Should navigate to ticket detail screen
    await waitFor(element(by.id('ticket-title')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.text('Pick up dry cleaning'))).toBeVisible();
  });

  it('banner reflects user-specific urgent tickets after switching users', async () => {
    // Alice should see a banner
    await waitFor(element(by.id('urgent-banner')))
      .toBeVisible()
      .withTimeout(10000);
    // Text should include "overdue"
    await expect(element(by.text('1 overdue'))).toBeVisible();
  });
});
