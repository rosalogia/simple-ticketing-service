import notifee, {EventType, Event} from '@notifee/react-native';
import {api} from '../api/client';
import {navigationRef} from '../navigation/AppNavigator';

export function setupNotificationActionHandler(): void {
  notifee.onForegroundEvent(handleNotificationEvent);
  notifee.onBackgroundEvent(handleNotificationEvent);
}

async function handleNotificationEvent({type, detail}: Event): Promise<void> {
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
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('PageAlert', {
        ticketId,
        title: data.title || 'Unknown',
        priority: data.priority || 'SEV1',
        status: data.status || 'OPEN',
        notificationId: detail.notification?.id,
      });
    }
    return;
  }

  // View ticket action or default press for non-page notifications
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
