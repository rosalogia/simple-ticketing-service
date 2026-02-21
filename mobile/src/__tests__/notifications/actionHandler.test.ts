import {NativeModules, Platform} from 'react-native';
import notifee from '@notifee/react-native';
import {handleBackgroundNotificationEvent} from '../../notifications/actionHandler';

// Mock dependencies
jest.mock('../../navigation/AppNavigator', () => ({
  navigationRef: {
    isReady: jest.fn().mockReturnValue(true),
    navigate: jest.fn(),
  },
}));

jest.mock('../../notifications/pageSettings', () => ({
  getPageSoundSettings: jest.fn().mockResolvedValue({soundEnabled: true, volume: 100}),
}));

jest.mock('../../api/client', () => ({
  ensureToken: jest.fn().mockResolvedValue(undefined),
  api: {
    acknowledgeTicket: jest.fn().mockResolvedValue({status: 'ok'}),
  },
}));

const {EventType} = jest.requireMock('@notifee/react-native');
const mockNotifee = notifee as jest.Mocked<typeof notifee>;
const {ensureToken, api} = require('../../api/client');

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
});

describe('handleBackgroundNotificationEvent', () => {
  it('acknowledge action calls ensureToken + acknowledgeTicket + cancelNotification', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.ACTION_PRESS,
      detail: {
        notification: {
          id: 'notif-1',
          data: {type: 'page', ticket_id: '42'},
        },
        pressAction: {id: 'acknowledge'},
      },
    });

    expect(ensureToken).toHaveBeenCalled();
    expect(api.acknowledgeTicket).toHaveBeenCalledWith(42);
    expect(mockNotifee.cancelNotification).toHaveBeenCalledWith('notif-1');
  });

  it('view_ticket action cancels notification', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.ACTION_PRESS,
      detail: {
        notification: {
          id: 'notif-2',
          data: {type: 'page', ticket_id: '42'},
        },
        pressAction: {id: 'view_ticket'},
      },
    });

    expect(mockNotifee.cancelNotification).toHaveBeenCalledWith('notif-2');
  });

  it('non-ACTION_PRESS/PRESS event is ignored', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.DISMISSED,
      detail: {
        notification: {
          id: 'notif-3',
          data: {type: 'page', ticket_id: '42'},
        },
        pressAction: {id: 'acknowledge'},
      },
    });

    expect(ensureToken).not.toHaveBeenCalled();
    expect(mockNotifee.cancelNotification).not.toHaveBeenCalled();
  });

  it('missing data returns early', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.ACTION_PRESS,
      detail: {
        notification: {id: 'notif-4'},
        pressAction: {id: 'acknowledge'},
      },
    });

    expect(ensureToken).not.toHaveBeenCalled();
  });

  it('page action stops SirenPlayer', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.ACTION_PRESS,
      detail: {
        notification: {
          id: 'notif-5',
          data: {type: 'page', ticket_id: '42'},
        },
        pressAction: {id: 'acknowledge'},
      },
    });

    expect(NativeModules.SirenPlayer.stop).toHaveBeenCalled();
  });

  it('non-page action does not stop SirenPlayer', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.ACTION_PRESS,
      detail: {
        notification: {
          id: 'notif-6',
          data: {type: 'ticket_update', ticket_id: '42'},
        },
        pressAction: {id: 'view_ticket'},
      },
    });

    expect(NativeModules.SirenPlayer.stop).not.toHaveBeenCalled();
  });

  it('PRESS event type is also handled', async () => {
    await handleBackgroundNotificationEvent({
      type: EventType.PRESS,
      detail: {
        notification: {
          id: 'notif-7',
          data: {type: 'page', ticket_id: '99'},
        },
        pressAction: {id: 'view_ticket'},
      },
    });

    expect(mockNotifee.cancelNotification).toHaveBeenCalledWith('notif-7');
  });
});
