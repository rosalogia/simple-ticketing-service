import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {inviteApi, notificationApi, api} from '../api/client';
import type {QueueInvite, Notification} from '../types';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type FeedItem =
  | {kind: 'invite'; data: QueueInvite; time: string}
  | {kind: 'notification'; data: Notification; time: string};

export default function NotificationsScreen() {
  const [invites, setInvites] = useState<QueueInvite[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const navigation = useNavigation<any>();

  const load = useCallback(async () => {
    try {
      const [inv, notifs] = await Promise.all([
        inviteApi.getMyInvites(),
        notificationApi.list(),
      ]);
      setInvites(inv);
      setNotifications(notifs);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const feed: FeedItem[] = [
    ...invites.map(i => ({kind: 'invite' as const, data: i, time: i.created_at})),
    ...notifications.map(n => ({
      kind: 'notification' as const,
      data: n,
      time: n.created_at,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const handleAccept = async (inviteId: number) => {
    setActionInProgress(`invite-${inviteId}`);
    try {
      await inviteApi.acceptInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDecline = async (inviteId: number) => {
    setActionInProgress(`invite-${inviteId}`);
    try {
      await inviteApi.declineInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const navigateToTicket = async (ticketId: number) => {
    // Navigate to HomeTab and then to TicketDetail
    const tabNav = navigation.getParent();
    if (tabNav) {
      tabNav.navigate('HomeTab', {
        screen: 'TicketDetail',
        params: {ticketId},
      });
    }
  };

  const handleNotificationPress = async (notif: Notification) => {
    if (!notif.read) {
      try {
        await notificationApi.markRead(notif.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notif.id ? {...n, read: true} : n)),
        );
      } catch {
        // ignore
      }
    }
    if (notif.ticket_id) {
      navigateToTicket(notif.ticket_id);
    }
  };

  const handleAcknowledge = async (notif: Notification) => {
    if (!notif.ticket_id) return;
    setActionInProgress(`notif-${notif.id}`);
    try {
      await api.acknowledgeTicket(notif.ticket_id);
      await notificationApi.markRead(notif.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notif.id ? {...n, read: true} : n)),
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (notifId: number) => {
    try {
      await notificationApi.delete(notifId);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({...n, read: true})));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case 'comment':
        return 'Comment';
      case 'assignment':
        return 'Assignment';
      case 'status_change':
        return 'Status Change';
      case 'escalation':
        return 'Escalation';
      case 'page':
        return 'Page';
      default:
        return type;
    }
  };

  const renderItem = ({item}: {item: FeedItem}) => {
    if (item.kind === 'invite') {
      const invite = item.data;
      return (
        <View style={[styles.card, styles.inviteCard]}>
          <Text style={styles.typeLabel}>Queue Invitation</Text>
          <Text style={styles.inviteText}>
            <Text style={styles.bold}>{invite.invited_by.display_name}</Text>
            {' invited you to '}
            <Text style={styles.bold}>{invite.queue.name}</Text>
          </Text>
          <Text style={styles.roleText}>Role: {invite.role}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAccept(invite.id)}
              disabled={actionInProgress === `invite-${invite.id}`}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleDecline(invite.id)}
              disabled={actionInProgress === `invite-${invite.id}`}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const notif = item.data;
    const isPage = notif.type === 'page';
    return (
      <TouchableOpacity
        style={[styles.card, !notif.read && styles.unreadCard]}
        onPress={() => handleNotificationPress(notif)}
        activeOpacity={notif.ticket_id ? 0.7 : 1}>
        <View style={styles.notifHeader}>
          <Text style={styles.typeLabel}>{typeLabel(notif.type)}</Text>
          <TouchableOpacity onPress={() => handleDelete(notif.id)}>
            <Text style={styles.deleteText}>Remove</Text>
          </TouchableOpacity>
        </View>
        <Text
          style={[styles.notifTitle, !notif.read && styles.bold]}
          numberOfLines={1}>
          {notif.title}
        </Text>
        <Text style={styles.notifBody} numberOfLines={2}>
          {notif.body}
        </Text>
        {isPage && notif.ticket_id && !notif.read && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.ackButton}
              onPress={() => handleAcknowledge(notif)}
              disabled={actionInProgress === `notif-${notif.id}`}>
              <Text style={styles.ackText}>Acknowledge</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() =>
                notif.ticket_id && navigateToTicket(notif.ticket_id)
              }>
              <Text style={styles.declineText}>View Ticket</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const hasUnread = notifications.some(n => !n.read);

  return (
    <View style={styles.container}>
      {hasUnread && (
        <TouchableOpacity style={styles.markAllRow} onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={feed}
        keyExtractor={item =>
          item.kind === 'invite'
            ? `invite-${item.data.id}`
            : `notif-${item.data.id}`
        }
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  markAllRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  inviteCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  unreadCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.ink,
  },
  typeLabel: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  inviteText: {
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  bold: {
    fontWeight: fontWeight.semibold,
  },
  roleText: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  acceptText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  ackButton: {
    backgroundColor: '#b91c1c',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  ackText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.sm,
  },
  declineButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  declineText: {
    color: colors.inkMuted,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitle: {
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: 2,
  },
  notifBody: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  deleteText: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
  },
  empty: {
    paddingVertical: spacing.xxxl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.inkMuted,
  },
});
