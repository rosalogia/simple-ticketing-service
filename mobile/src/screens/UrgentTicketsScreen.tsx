import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {api} from '../api/client';
import TicketCard from '../components/TicketCard';
import type {Ticket, UrgentTicketsResponse} from '../types';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function UrgentTicketsScreen() {
  const navigation = useNavigation<Nav>();
  const [data, setData] = useState<UrgentTicketsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const resp = await api.getUrgentTickets();
      setData(resp);
    } catch {
      // keep stale data on error
    } finally {
      setLoading(false);
    }
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

  const navigateToTicket = (ticket: Ticket) => {
    // Navigate to MainTabs with nested screen params in a single call.
    // React Navigation handles mounting the tab navigator and pushing
    // to the nested TicketDetail screen in one transition.
    (navigation as any).navigate('MainTabs', {
      queueId: ticket.queue_id,
      screen: 'HomeTab',
      params: {
        screen: 'TicketDetail',
        params: {ticketId: ticket.id},
      },
    });
  };

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const sections: {title: string; accent: string; data: Ticket[]}[] = [];
  if (data?.overdue?.length) {
    sections.push({
      title: 'OVERDUE',
      accent: colors.sev1,
      data: data.overdue,
    });
  }
  if (data?.due_soon?.length) {
    sections.push({
      title: 'DUE SOON',
      accent: '#d97706', // amber
      data: data.due_soon,
    });
  }

  return (
    <SectionList
      testID="urgent-tickets-list"
      sections={sections}
      keyExtractor={item => String(item.id)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderSectionHeader={({section}) => (
        <View style={styles.sectionHeader}>
          <View
            style={[styles.sectionDot, {backgroundColor: section.accent}]}
          />
          <Text style={[styles.sectionTitle, {color: section.accent}]}>
            {section.title}
          </Text>
          <Text style={styles.sectionCount}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({item}) => (
        <View>
          <TicketCard ticket={item} onPress={() => navigateToTicket(item)} />
          {item.queue_name && (
            <View style={styles.queueTag}>
              <Text style={styles.queueTagText}>{item.queue_name}</Text>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No urgent tickets</Text>
          <Text style={styles.emptyText}>
            All caught up — nothing overdue or due soon.
          </Text>
        </View>
      }
      contentContainerStyle={sections.length === 0 ? styles.emptyContainer : styles.list}
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    marginLeft: spacing.sm,
  },
  queueTag: {
    marginLeft: spacing.lg + spacing.lg,
    marginTop: -spacing.sm + 2,
    marginBottom: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.stone100,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  queueTagText: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    fontWeight: fontWeight.medium,
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
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
});
