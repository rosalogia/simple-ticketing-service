import {by, device, element, expect} from 'detox';
import {loginAs} from './helpers/login';
import {goToHousematesQueue, switchToByMeTab, switchToToMeTab} from './helpers/navigation';

describe('Queues', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAs('alice');
  });

  it('shows Housemates queue with 4 members', async () => {
    await expect(element(by.text('Housemates'))).toBeVisible();
    await expect(element(by.text('4 members'))).toBeVisible();
  });

  it('navigates to queue and sees To Me / By Me tabs', async () => {
    await goToHousematesQueue();
    await expect(element(by.id('tab-to-me'))).toBeVisible();
    await expect(element(by.id('tab-by-me'))).toBeVisible();
  });

  it('To Me tab shows tickets assigned to alice', async () => {
    await goToHousematesQueue();
    // Default tab is To Me — alice has "Pick up dry cleaning" assigned to her
    await expect(element(by.text('Pick up dry cleaning'))).toBeVisible();
  });

  it('By Me tab shows tickets created by alice', async () => {
    await goToHousematesQueue();
    await switchToByMeTab();
    // Alice created "Read 'Designing Data-Intensive Applications' Ch. 5"
    await expect(
      element(by.text("Read 'Designing Data-Intensive Applications' Ch. 5")),
    ).toBeVisible();
  });

  it('can switch between tabs', async () => {
    await goToHousematesQueue();
    await switchToByMeTab();
    await expect(element(by.id('tab-by-me'))).toBeVisible();

    await switchToToMeTab();
    await expect(element(by.id('tab-to-me'))).toBeVisible();
  });
});
