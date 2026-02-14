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

  if (actionId === 'acknowledge' && ticketId) {
    try {
      await api.acknowledgeTicket(ticketId);
      // Dismiss the notification after acknowledging
      if (detail.notification?.id) {
        await notifee.cancelNotification(detail.notification.id);
      }
    } catch (err) {
      console.error('Failed to acknowledge ticket:', err);
    }
  }

  if ((actionId === 'view_ticket' || actionId === 'default') && ticketId) {
    // Navigate to ticket detail
    if (navigationRef.isReady()) {
      // Navigate within the home stack to TicketDetail
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
