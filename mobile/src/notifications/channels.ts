import notifee, {AndroidImportance, AndroidVisibility} from '@notifee/react-native';

export const DEFAULT_CHANNEL_ID = 'sts_default';
export const PAGE_CHANNEL_ID = 'sts_page_v3';

// Old channel IDs to clean up (Android channels are immutable once created)
const OLD_CHANNEL_IDS = ['sts_page', 'sts_page_v2'];

export async function createNotificationChannels(): Promise<void> {
  // Delete old channels that can't be updated
  for (const id of OLD_CHANNEL_IDS) {
    await notifee.deleteChannel(id);
  }

  await notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: 'STS Notifications',
    description: 'Standard ticket notifications',
    importance: AndroidImportance.DEFAULT,
  });

  await notifee.createChannel({
    id: PAGE_CHANNEL_ID,
    name: 'STS Pages',
    description: 'Disruptive paging for SEV1/SEV2 incidents',
    importance: AndroidImportance.HIGH,
    sound: 'siren',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500, 300, 500],
    visibility: AndroidVisibility.PUBLIC,
    bypassDnd: true,
  });
}
