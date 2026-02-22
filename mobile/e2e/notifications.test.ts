import {by, device, element, expect} from 'detox';
import {loginAs} from './helpers/login';
import {goToHousematesQueue, goToNotifications} from './helpers/navigation';

describe('Notifications', () => {
  beforeAll(async () => {
    await device.launchApp({newInstance: true});
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAs('alice');
    await goToHousematesQueue();
  });

  it('shows notifications screen', async () => {
    await goToNotifications();
    // Two "Notifications" texts visible: tab bar label + screen header.
    // The header (index 1) confirms we navigated to the screen.
    await expect(element(by.text('Notifications')).atIndex(1)).toBeVisible();
  });
});
