import notifee from '@notifee/react-native';
import {createNotificationChannels} from '../../notifications/channels';

const mockNotifee = notifee as jest.Mocked<typeof notifee>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Notification channels', () => {
  it('creates 3 channels (default, page, page_vibrate)', async () => {
    await createNotificationChannels();

    const createCalls = mockNotifee.createChannel.mock.calls;
    expect(createCalls).toHaveLength(3);

    const channelIds = createCalls.map((call: any[]) => call[0].id);
    expect(channelIds).toContain('sts_default');
    expect(channelIds).toContain('sts_page_v4');
    expect(channelIds).toContain('sts_page_vibrate_v3');
  });

  it('deletes old deprecated channel IDs', async () => {
    await createNotificationChannels();

    const deleteCalls = mockNotifee.deleteChannel.mock.calls.map(
      (call: any[]) => call[0],
    );
    expect(deleteCalls).toContain('sts_page');
    expect(deleteCalls).toContain('sts_page_v2');
    expect(deleteCalls).toContain('sts_page_v3');
    expect(deleteCalls).toContain('sts_page_vibrate');
    expect(deleteCalls).toContain('sts_page_vibrate_v2');
  });

  it('channel configs have correct importance levels', async () => {
    await createNotificationChannels();

    const createCalls = mockNotifee.createChannel.mock.calls;
    const defaultChannel = createCalls.find(
      (call: any[]) => call[0].id === 'sts_default',
    )![0];
    const pageChannel = createCalls.find(
      (call: any[]) => call[0].id === 'sts_page_v4',
    )![0];
    const vibrateChannel = createCalls.find(
      (call: any[]) => call[0].id === 'sts_page_vibrate_v3',
    )![0];

    // AndroidImportance: DEFAULT=3, HIGH=4
    expect(defaultChannel.importance).toBe(3);
    expect(pageChannel.importance).toBe(4);
    expect(vibrateChannel.importance).toBe(4);
  });
});
