import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import type {TicketStats} from '../types';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

interface Props {
  stats: TicketStats | null;
}

const statItems = [
  {key: 'open_count' as const, label: 'Open', color: colors.statusOpen, bg: colors.statusOpenBg},
  {key: 'in_progress_count' as const, label: 'In Progress', color: colors.statusProgress, bg: colors.statusProgressBg},
  {key: 'blocked_count' as const, label: 'Blocked', color: colors.statusBlocked, bg: colors.statusBlockedBg},
  {key: 'completed_count' as const, label: 'Done', color: colors.statusDone, bg: colors.statusDoneBg},
  {key: 'overdue_count' as const, label: 'Overdue', color: colors.sev1, bg: colors.sev1Bg},
];

export default function StatsRow({stats}: Props) {
  if (!stats) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {statItems.map(item => (
        <View key={item.key} style={[styles.stat, {backgroundColor: item.bg}]}>
          <Text style={[styles.count, {color: item.color}]}>
            {stats[item.key]}
          </Text>
          <Text style={[styles.label, {color: item.color}]}>{item.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stat: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minWidth: 70,
  },
  count: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
});
