import React, {useState, useCallback, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import type {Ticket, TicketStats, TicketStatus, TicketPriority} from '../types';
import type {HomeStackParamList} from '../navigation/AppNavigator';
import TicketCard from '../components/TicketCard';
import StatsRow from '../components/StatsRow';
import FilterSheet from '../components/FilterSheet';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

type Tab = 'to_me' | 'by_me';

const PAGE_SIZE = 20;

export default function DashboardScreen({navigation, route}: Props) {
  const {user} = useAuth();
  const queueId = route.params.queueId;

  const [tab, setTab] = useState<Tab>('to_me');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const ticketsRef = useRef<Ticket[]>([]);
  ticketsRef.current = tickets;

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [ticketResult, statsResult] = await Promise.all([
        api.getTickets({
          queue_id: queueId,
          assignee_id: tab === 'to_me' ? user.id : undefined,
          assigner_id: tab === 'by_me' ? user.id : undefined,
          search: search || undefined,
          status: statusFilter.length ? statusFilter : undefined,
          priority: priorityFilter.length ? priorityFilter : undefined,
          skip: 0,
          limit: PAGE_SIZE,
        }),
        api.getTicketStats({
          queue_id: queueId,
          assignee_id: tab === 'to_me' ? user.id : undefined,
          assigner_id: tab === 'by_me' ? user.id : undefined,
        }),
      ]);
      setTickets(ticketResult.tickets);
      setTotal(ticketResult.total);
      setStats(statsResult);
    } catch (e) {
      console.warn('loadData error', e);
    }
  }, [queueId, user, tab, search, statusFilter, priorityFilter]);

  // Load on mount and when filters change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload when screen regains focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const onEndReached = async () => {
    if (loadingMore || ticketsRef.current.length >= total || !user) return;
    setLoadingMore(true);
    try {
      const result = await api.getTickets({
        queue_id: queueId,
        assignee_id: tab === 'to_me' ? user.id : undefined,
        assigner_id: tab === 'by_me' ? user.id : undefined,
        search: search || undefined,
        status: statusFilter.length ? statusFilter : undefined,
        priority: priorityFilter.length ? priorityFilter : undefined,
        skip: ticketsRef.current.length,
        limit: PAGE_SIZE,
      });
      setTickets(prev => [...prev, ...result.tickets]);
      setTotal(result.total);
    } catch {}
    setLoadingMore(false);
  };

  const handleFilterApply = (f: {status: TicketStatus[]; priority: TicketPriority[]}) => {
    setStatusFilter(f.status);
    setPriorityFilter(f.priority);
  };

  const activeFilterCount = statusFilter.length + priorityFilter.length;

  const header = useMemo(
    () => (
      <View>
        {/* Tab selector */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'to_me' && styles.tabActive]}
            onPress={() => setTab('to_me')}>
            <Text
              style={[styles.tabText, tab === 'to_me' && styles.tabTextActive]}>
              To Me
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'by_me' && styles.tabActive]}
            onPress={() => setTab('by_me')}>
            <Text
              style={[styles.tabText, tab === 'by_me' && styles.tabTextActive]}>
              By Me
            </Text>
          </TouchableOpacity>
        </View>

        <StatsRow stats={stats} />

        {/* Search + filter */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            placeholderTextColor={colors.stone400}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => loadData()}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setFilterVisible(true)}>
            <Text style={styles.filterButtonText}>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [tab, stats, search, activeFilterCount, loadData],
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={t => String(t.id)}
        renderItem={({item}) => (
          <TicketCard
            ticket={item}
            onPress={() => navigation.navigate('TicketDetail', {ticketId: item.id})}
          />
        )}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !refreshing ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No tickets found</Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTicket', {queueId})}>
        <Text style={styles.fabText}>+ New</Text>
      </TouchableOpacity>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        filters={{status: statusFilter, priority: priorityFilter}}
        onApply={handleFilterApply}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  list: {
    paddingBottom: 80,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.stone100,
    borderRadius: borderRadius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabActive: {
    backgroundColor: colors.white,
  },
  tabText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.inkMuted,
  },
  tabTextActive: {
    color: colors.ink,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  filterButton: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.inkMuted,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: fontSize.md,
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
