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
import {inviteApi} from '../api/client';
import type {QueueInvite} from '../types';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

export default function NotificationsScreen() {
  const [invites, setInvites] = useState<QueueInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await inviteApi.getMyInvites();
      setInvites(data);
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

  const handleAccept = async (inviteId: number) => {
    setActionInProgress(inviteId);
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
    setActionInProgress(inviteId);
    try {
      await inviteApi.declineInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setActionInProgress(null);
    }
  };

  const renderItem = ({item}: {item: QueueInvite}) => (
    <View style={styles.card}>
      <Text style={styles.inviteText}>
        <Text style={styles.bold}>{item.invited_by.display_name}</Text>
        {' invited you to '}
        <Text style={styles.bold}>{item.queue.name}</Text>
      </Text>
      <Text style={styles.roleText}>Role: {item.role}</Text>
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.id)}
          disabled={actionInProgress === item.id}>
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDecline(item.id)}
          disabled={actionInProgress === item.id}>
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={invites}
      keyExtractor={item => String(item.id)}
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
          <Text style={styles.emptyText}>No pending invitations</Text>
        </View>
      }
    />
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
  card: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone200,
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
  declineButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  declineText: {
    color: colors.inkMuted,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
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
