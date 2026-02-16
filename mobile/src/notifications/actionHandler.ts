import notifee, {EventType, Event} from '@notifee/react-native';
import {NativeModules, Platform} from 'react-native';
import {api, ensureToken} from '../api/client';
import {navigationRef} from '../navigation/AppNavigator';
import {getPageSoundSettings} from './pageSettings';

/**
 * Background event handler — registered in index.js so it's available even
 * when the app is killed. Has NO React/navigation dependencies.
 * Handles acknowledge + view_ticket actions (stops siren, calls API).
 * Navigation is handled separately via getInitialNotification() on cold start.
 */
export async function handleBackgroundNotificationEvent({
  type,
  detail,
}: Event): Promise<void> {
  if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) {
    return;
  }

  const data = detail.notification?.data;
  const actionId = detail.pressAction?.id;

  if (!data) return;

  const ticketId = data.ticket_id ? Number(data.ticket_id) : null;
  const isPage = data.type === 'page';

  // Stop siren for any page-related action
  if (isPage && Platform.OS === 'android' && NativeModules.SirenPlayer) {
    NativeModules.SirenPlayer.stop();
  }

  // Acknowledge action from notification button
  if (actionId === 'acknowledge' && ticketId) {
    try {
      await ensureToken();
      await api.acknowledgeTicket(ticketId);
      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    } catch (err) {
      console.error('Failed to acknowledge ticket (background):', err);
    }
    return;
  }

  // View ticket — just cancel the notification; navigation handled on cold start
  if (actionId === 'view_ticket' && ticketId) {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }
}

/**
 * Foreground event handler — registered in AppNavigator useEffect.
 * Has access to React Navigation for in-app navigation.
 */
export function setupForegroundNotificationHandler(): void {
  notifee.onForegroundEvent(handleForegroundEvent);
}

async function handleForegroundEvent({type, detail}: Event): Promise<void> {
  if (type !== EventType.ACTION_PRESS && type !== EventType.PRESS) {
    return;
  }

  const data = detail.notification?.data;
  const actionId = detail.pressAction?.id;

  if (!data) return;

  const ticketId = data.ticket_id ? Number(data.ticket_id) : null;
  const isPage = data.type === 'page';

  // Acknowledge action from notification button
  if (actionId === 'acknowledge' && ticketId) {
    if (Platform.OS === 'android' && NativeModules.SirenPlayer) {
      NativeModules.SirenPlayer.stop();
    }
    try {
      await api.acknowledgeTicket(ticketId);
      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    } catch (err) {
      console.error('Failed to acknowledge ticket:', err);
    }
    return;
  }

  // Page notification pressed (default/fullscreen action) → open full-screen alert
  if (isPage && (actionId === 'default' || !actionId) && ticketId) {
    const pageSettings = await getPageSoundSettings();
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('PageAlert', {
        ticketId,
        title: data.title || 'Unknown',
        priority: data.priority || 'SEV1',
        status: data.status || 'OPEN',
        notificationId: detail.notification?.id,
        pageSoundEnabled: pageSettings.soundEnabled,
        pageVolume: pageSettings.volume,
      });
    }
    return;
  }

  // View ticket action or default press for non-page notifications
  if (actionId === 'view_ticket' && isPage && Platform.OS === 'android' && NativeModules.SirenPlayer) {
    NativeModules.SirenPlayer.stop();
  }
  if ((actionId === 'view_ticket' || actionId === 'default') && ticketId) {
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('MainTabs', {
        screen: 'HomeTab',
        params: {
          screen: 'TicketDetail',
          params: {ticketId},
        },
      });
    }
  }
}
