import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {queueApi, api} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import type {Queue, UrgentTicketsResponse} from '../types';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'QueueList'>;

export default function QueueListScreen({navigation}: Props) {
  const {logout} = useAuth();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [urgent, setUrgent] = useState<UrgentTicketsResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await queueApi.getQueues();
      setQueues(data);
    } catch {}
    try {
      const urgentData = await api.getUrgentTickets();
      setUrgent(urgentData);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderQueue = ({item}: {item: Queue}) => (
    <TouchableOpacity
      testID={`queue-card-${item.id}`}
      style={styles.card}
      onPress={() => navigation.navigate('MainTabs', {queueId: item.id})}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.queueName}>{item.name}</Text>
        {item.my_role && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.my_role}</Text>
          </View>
        )}
      </View>
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      )}
      <Text style={styles.memberCount}>
        {item.member_count} member{item.member_count !== 1 ? 's' : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Queues</Text>
        <TouchableOpacity testID="logout-button" onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
      {urgent && (urgent.overdue_count > 0 || urgent.due_soon_count > 0) && (
        <TouchableOpacity
          testID="urgent-banner"
          style={styles.urgentBanner}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('UrgentTickets' as any)}>
          <View style={styles.urgentBannerContent}>
            {urgent.overdue_count > 0 && (
              <Text style={styles.urgentOverdueText}>
                {urgent.overdue_count} overdue
              </Text>
            )}
            {urgent.overdue_count > 0 && urgent.due_soon_count > 0 && (
              <Text style={styles.urgentDot}> {'\u00B7'} </Text>
            )}
            {urgent.due_soon_count > 0 && (
              <Text style={styles.urgentDueSoonText}>
                {urgent.due_soon_count} due soon
              </Text>
            )}
          </View>
          <Text style={styles.urgentArrow}>{'\u203A'}</Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={queues}
        keyExtractor={q => String(q.id)}
        renderItem={renderQueue}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No queues yet</Text>
            <Text style={styles.emptyText}>
              Create a queue to get started
            </Text>
          </View>
        }
      />
      <TouchableOpacity
        testID="new-queue-fab"
        style={styles.fab}
        onPress={() => navigation.navigate('CreateQueue')}>
        <Text style={styles.fabText}>+ New Queue</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  logoutText: {
    fontSize: fontSize.md,
    color: colors.inkMuted,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  queueName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    flex: 1,
  },
  roleBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginBottom: spacing.xs,
  },
  memberCount: {
    fontSize: fontSize.sm,
    color: colors.stone500,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  urgentBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  urgentOverdueText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#dc2626',
  },
  urgentDot: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  urgentDueSoonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#d97706',
  },
  urgentArrow: {
    fontSize: fontSize.xl,
    color: colors.inkMuted,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xxl,
    right: spacing.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fabText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
