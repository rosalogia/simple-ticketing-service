import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import type {Ticket, Comment, QueueMember} from '../types';
import type {HomeStackParamList} from '../navigation/AppNavigator';
import CommentThread from '../components/CommentThread';
import InfoButton, {PriorityHelpContent, EscalationHelpContent, PagingHelpContent} from '../components/InfoButton';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  priorityColors,
  statusColors,
  statusLabels,
  priorityLabels,
} from '../theme';
import {queueApi} from '../api/client';

type Props = NativeStackScreenProps<HomeStackParamList, 'TicketDetail'>;

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return 'Any moment';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function useCountdown(targetIso: string | null): string | null {
  const targetMs = useMemo(
    () => (targetIso ? new Date(targetIso).getTime() : null),
    [targetIso],
  );
  const [display, setDisplay] = useState<string | null>(() => {
    if (targetMs === null) return null;
    return formatCountdown(targetMs - Date.now());
  });

  useEffect(() => {
    if (targetMs === null) {
      setDisplay(null);
      return;
    }
    const tick = () => setDisplay(formatCountdown(targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);

  return display;
}

export default function TicketDetailScreen({route, navigation}: Props) {
  const {user} = useAuth();
  const {ticketId} = route.params;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const escalationCountdown = useCountdown(ticket?.next_escalation_at ?? null);
  const pageCountdown = useCountdown(ticket?.next_page_at ?? null);

  const loadTicket = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([
        api.getTicket(ticketId),
        api.getComments(ticketId),
      ]);
      setTicket(t);
      setComments(c);
      setEditTitle(t.title);
      setEditDescription(t.description || '');
      // Load members for assignee picker
      const m = await queueApi.getMembers(t.queue_id);
      setMembers(m);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleStatusChange = (status: string) => {
    Alert.alert('Change Status', `Set ticket to ${statusLabels[status]}?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            const updated = await api.updateTicket(ticketId, {status});
            setTicket(updated);
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const handleSaveEdit = async () => {
    try {
      const updated = await api.updateTicket(ticketId, {
        title: editTitle,
        description: editDescription || null,
      });
      setTicket(updated);
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAssigneeChange = () => {
    const options = members.map(m => ({
      text: m.user.display_name,
      onPress: async () => {
        try {
          const updated = await api.updateTicket(ticketId, {
            assignee_id: m.user.id,
          });
          setTicket(updated);
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      },
    }));
    Alert.alert('Change Assignee', 'Select new assignee', [
      ...options,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handlePriorityChange = () => {
    const priorities = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];
    const options = priorities.map(p => ({
      text: priorityLabels[p],
      onPress: async () => {
        try {
          const updated = await api.updateTicket(ticketId, {priority: p});
          setTicket(updated);
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      },
    }));
    Alert.alert('Change Priority', 'Select priority', [
      ...options,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Ticket', 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTicket(ticketId);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  if (loading || !ticket) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const pColor = priorityColors[ticket.priority];
  const sColor = statusColors[ticket.status];
  const isTerminal = ticket.status === 'COMPLETED' || ticket.status === 'CANCELLED';
  const nextStatuses = isTerminal
    ? ['OPEN']
    : ['IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED'].filter(
        s => s !== ticket.status,
      );

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.section}>
        <View style={styles.idRow}>
          <Text style={styles.id}>#{ticket.id}</Text>
          <View style={[styles.badge, {backgroundColor: pColor.bg}]}>
            <TouchableOpacity onPress={handlePriorityChange}>
              <Text style={[styles.badgeText, {color: pColor.text}]}>
                {priorityLabels[ticket.priority]}
              </Text>
            </TouchableOpacity>
          </View>
          <InfoButton>
            <PriorityHelpContent />
          </InfoButton>
          <View style={[styles.badge, {backgroundColor: sColor.bg}]}>
            <Text style={[styles.badgeText, {color: sColor.text}]}>
              {statusLabels[ticket.status]}
            </Text>
          </View>
        </View>

        {editing ? (
          <>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Title"
            />
            <TextInput
              style={[styles.editInput, styles.editDescription]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
              multiline
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdit}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditing(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{ticket.title}</Text>
            {ticket.description && (
              <Text style={styles.description}>{ticket.description}</Text>
            )}
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Metadata */}
      <View style={styles.section}>
        <MetaRow label="Assignee" onPress={handleAssigneeChange}>
          <Text style={styles.metaValue}>{ticket.assignee.display_name}</Text>
        </MetaRow>
        <MetaRow label="Created by">
          <Text style={styles.metaValue}>{ticket.assigner.display_name}</Text>
        </MetaRow>
        {ticket.due_date && (
          <MetaRow label="Due date">
            <Text style={styles.metaValue}>
              {new Date(ticket.due_date).toLocaleDateString()}
            </Text>
          </MetaRow>
        )}
        {(escalationCountdown !== null || ticket.escalation_paused) && (
          <MetaRow label="Next Escalation">
            <View style={styles.countdownRow}>
              {ticket.escalation_paused ? (
                <Text style={styles.countdownPaused}>Paused</Text>
              ) : (
                <Text style={styles.countdownEscalation}>
                  {escalationCountdown}
                </Text>
              )}
              <InfoButton>
                <EscalationHelpContent />
              </InfoButton>
            </View>
          </MetaRow>
        )}
        {pageCountdown !== null && (
          <MetaRow label="Next Page">
            <View style={styles.countdownRow}>
              <Text
                style={[
                  styles.countdownPage,
                  {
                    color:
                      ticket.priority === 'SEV1' ? colors.sev1 : colors.sev2,
                  },
                ]}>
                {pageCountdown}
              </Text>
              {ticket.page_acknowledged && (
                <Text style={styles.countdownAcked}>(Acked)</Text>
              )}
              <InfoButton>
                <PagingHelpContent />
              </InfoButton>
            </View>
          </MetaRow>
        )}
        {ticket.category && (
          <MetaRow label="Category">
            <Text style={styles.metaValue}>{ticket.category}</Text>
          </MetaRow>
        )}
        {ticket.type && (
          <MetaRow label="Type">
            <Text style={styles.metaValue}>{ticket.type}</Text>
          </MetaRow>
        )}
        {ticket.item && (
          <MetaRow label="Item">
            <Text style={styles.metaValue}>{ticket.item}</Text>
          </MetaRow>
        )}
        <MetaRow label="Created">
          <Text style={styles.metaValue}>
            {new Date(ticket.created_at).toLocaleDateString()}
          </Text>
        </MetaRow>
      </View>

      {/* Status actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.statusActions}>
          {nextStatuses.map(s => {
            const sc = statusColors[s];
            return (
              <TouchableOpacity
                key={s}
                style={[styles.statusButton, {backgroundColor: sc.bg}]}
                onPress={() => handleStatusChange(s)}>
                <Text style={[styles.statusButtonText, {color: sc.text}]}>
                  {statusLabels[s]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Comments */}
      <CommentThread
        ticketId={ticketId}
        comments={comments}
        onRefresh={loadTicket}
      />

      <View style={{height: 40}} />
    </ScrollView>
  );
}

function MetaRow({
  label,
  children,
  onPress,
}: {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.metaRow} onPress={onPress}>
      <Text style={styles.metaLabel}>{label}</Text>
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.paper,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone100,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  id: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.inkMuted,
    fontVariant: ['tabular-nums'],
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.inkLight,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  editLink: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.medium,
  },
  editInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  editDescription: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  saveButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  cancelText: {
    color: colors.inkMuted,
    fontWeight: fontWeight.medium,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone100,
  },
  metaLabel: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    fontWeight: fontWeight.medium,
  },
  metaValue: {
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: fontWeight.medium,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  countdownEscalation: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.statusProgress, // amber
    fontVariant: ['tabular-nums'],
  },
  countdownPage: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  countdownPaused: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
    color: colors.stone400,
  },
  countdownAcked: {
    fontSize: fontSize.xs,
    color: colors.stone400,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  statusButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  deleteButton: {
    paddingVertical: spacing.sm,
  },
  deleteText: {
    color: colors.sev1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
