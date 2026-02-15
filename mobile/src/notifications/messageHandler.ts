import notifee, {AndroidFlags, AndroidStyle} from '@notifee/react-native';
import {FirebaseMessagingTypes} from '@react-native-firebase/messaging';
import {DEFAULT_CHANNEL_ID, PAGE_VIBRATE_CHANNEL_ID} from './channels';
import {navigationRef} from '../navigation/AppNavigator';
import {getPageSoundSettings} from './pageSettings';

export async function handleRemoteMessage(
  message: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const data = message.data;
  if (!data) return;

  if (data.type === 'page') {
    const pageSettings = await getPageSoundSettings();

    // Use vibrate-only channel; PageAlertScreen handles audio playback with volume
    const androidConfig: any = {
      channelId: PAGE_VIBRATE_CHANNEL_ID,
      importance: 4, // HIGH
      vibrationPattern: [300, 500, 300, 500, 300, 500],
      flags: [AndroidFlags.FLAG_INSISTENT],
      ongoing: true,
      autoCancel: false,
      fullScreenAction: {
        id: 'default',
      },
      actions: [
        {
          title: 'Acknowledge',
          pressAction: {id: 'acknowledge'},
        },
        {
          title: 'View Ticket',
          pressAction: {id: 'view_ticket', launchActivity: 'default'},
        },
      ],
      style: {
        type: AndroidStyle.BIGTEXT,
        text: `${data.priority} - ${data.title}\nStatus: ${data.status}`,
      },
    };

    // Display the system notification (for lock-screen / background)
    const notificationId = await notifee.displayNotification({
      title: `${data.priority} PAGE`,
      body: data.title as string,
      data: data as Record<string, string>,
      android: androidConfig,
    });

    // Navigate to full-screen alert if app is in foreground
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('PageAlert', {
        ticketId: Number(data.ticket_id),
        title: data.title,
        priority: data.priority,
        status: data.status,
        notificationId,
        pageSoundEnabled: pageSettings.soundEnabled,
        pageVolume: pageSettings.volume,
      });
    }
  } else {
    // Standard notification — show via default channel
    const notification = message.notification;
    if (notification) {
      await notifee.displayNotification({
        title: notification.title || 'STS',
        body: notification.body || '',
        data: data as Record<string, string>,
        android: {
          channelId: DEFAULT_CHANNEL_ID,
          pressAction: {
            id: 'default',
          },
        },
      });
    }
  }
}
