import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import type {Ticket} from '../types';
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

interface Props {
  ticket: Ticket;
  onPress: () => void;
}

export default function TicketCard({ticket, onPress}: Props) {
  const pColor = priorityColors[ticket.priority];
  const sColor = statusColors[ticket.status];
  const isOverdue =
    ticket.due_date &&
    new Date(ticket.due_date) < new Date() &&
    ticket.status !== 'COMPLETED' &&
    ticket.status !== 'CANCELLED';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.id}>#{ticket.id}</Text>
        <View style={[styles.badge, {backgroundColor: pColor.bg}]}>
          <Text style={[styles.badgeText, {color: pColor.text}]}>
            {priorityLabels[ticket.priority]}
          </Text>
        </View>
        <View style={[styles.badge, {backgroundColor: sColor.bg}]}>
          <Text style={[styles.badgeText, {color: sColor.text}]}>
            {statusLabels[ticket.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {ticket.title}
      </Text>
      <View style={styles.footer}>
        <Text style={styles.meta}>
          {ticket.assignee.display_name}
        </Text>
        {ticket.due_date && (
          <Text style={[styles.meta, isOverdue && styles.overdue]}>
            Due {new Date(ticket.due_date).toLocaleDateString()}
          </Text>
        )}
        {ticket.comment_count > 0 && (
          <Text style={styles.meta}>
            {ticket.comment_count} comment{ticket.comment_count !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.stone200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
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
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  meta: {
    fontSize: fontSize.xs,
    color: colors.inkMuted,
  },
  overdue: {
    color: colors.sev1,
    fontWeight: fontWeight.medium,
  },
});
