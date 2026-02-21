import {NativeModules, Platform} from 'react-native';
import notifee from '@notifee/react-native';
import {handleRemoteMessage} from '../../notifications/messageHandler';

// Mock the navigationRef
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: {
    isReady: jest.fn().mockReturnValue(true),
    navigate: jest.fn(),
  },
}));

// Mock pageSettings
jest.mock('../../notifications/pageSettings', () => ({
  getPageSoundSettings: jest.fn().mockResolvedValue({soundEnabled: true, volume: 100}),
}));

const mockNotifee = notifee as jest.Mocked<typeof notifee>;
const {navigationRef} = require('../../navigation/AppNavigator');
const {getPageSoundSettings} = require('../../notifications/pageSettings');

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  mockNotifee.displayNotification.mockResolvedValue('notif-123');
});

describe('handleRemoteMessage', () => {
  it('page message: starts SirenPlayer, displays notification, navigates to PageAlert', async () => {
    await handleRemoteMessage({
      data: {
        type: 'page',
        ticket_id: '42',
        title: 'DB is down',
        priority: 'SEV1',
        status: 'OPEN',
      },
    } as any);

    expect(NativeModules.SirenPlayer.play).toHaveBeenCalledWith(100);
    expect(mockNotifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'SEV1 PAGE',
        body: 'DB is down',
      }),
    );
    expect(navigationRef.navigate).toHaveBeenCalledWith(
      'PageAlert',
      expect.objectContaining({ticketId: 42}),
    );
  });

  it('page message with sound disabled: skips SirenPlayer', async () => {
    getPageSoundSettings.mockResolvedValueOnce({soundEnabled: false, volume: 100});

    await handleRemoteMessage({
      data: {type: 'page', ticket_id: '42', title: 'Alert', priority: 'SEV1', status: 'OPEN'},
    } as any);

    expect(NativeModules.SirenPlayer.play).not.toHaveBeenCalled();
    expect(mockNotifee.displayNotification).toHaveBeenCalled();
  });

  it('standard notification: displays via default channel', async () => {
    await handleRemoteMessage({
      data: {type: 'ticket_update', ticket_id: '42'},
      notification: {title: 'Ticket Updated', body: 'Status changed'},
    } as any);

    expect(mockNotifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ticket Updated',
        body: 'Status changed',
        android: expect.objectContaining({channelId: 'sts_default'}),
      }),
    );
    expect(NativeModules.SirenPlayer.play).not.toHaveBeenCalled();
  });

  it('missing data: early return, no notification displayed', async () => {
    await handleRemoteMessage({} as any);
    await handleRemoteMessage({data: undefined} as any);

    expect(mockNotifee.displayNotification).not.toHaveBeenCalled();
  });

  it('iOS: skips SirenPlayer', async () => {
    Platform.OS = 'ios';

    await handleRemoteMessage({
      data: {type: 'page', ticket_id: '42', title: 'Alert', priority: 'SEV1', status: 'OPEN'},
    } as any);

    expect(NativeModules.SirenPlayer.play).not.toHaveBeenCalled();
    expect(mockNotifee.displayNotification).toHaveBeenCalled();
  });
});
