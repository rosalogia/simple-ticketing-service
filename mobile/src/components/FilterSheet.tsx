import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import type {TicketStatus, TicketPriority} from '../types';
import {
  colors,
  spacing,
  fontSize,
  fontWeight,
  borderRadius,
  statusColors,
  statusLabels,
  priorityColors,
  priorityLabels,
} from '../theme';

interface FilterState {
  status: TicketStatus[];
  priority: TicketPriority[];
}

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (filters: FilterState) => void;
}

const allStatuses: TicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'BLOCKED',
  'COMPLETED',
  'CANCELLED',
];
const allPriorities: TicketPriority[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4'];

export default function FilterSheet({visible, onClose, filters, onApply}: Props) {
  const [local, setLocal] = useState<FilterState>(filters);

  const toggleStatus = (s: TicketStatus) => {
    setLocal(prev => ({
      ...prev,
      status: prev.status.includes(s)
        ? prev.status.filter(x => x !== s)
        : [...prev.status, s],
    }));
  };

  const togglePriority = (p: TicketPriority) => {
    setLocal(prev => ({
      ...prev,
      priority: prev.priority.includes(p)
        ? prev.priority.filter(x => x !== p)
        : [...prev.priority, p],
    }));
  };

  const handleApply = () => {
    onApply(local);
    onClose();
  };

  const handleClear = () => {
    const cleared = {status: [], priority: []};
    setLocal(cleared);
    onApply(cleared);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.chips}>
            {allStatuses.map(s => {
              const active = local.status.includes(s);
              const sc = statusColors[s];
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.chip,
                    {backgroundColor: active ? sc.bg : colors.stone100},
                    active && {borderColor: sc.text},
                  ]}
                  onPress={() => toggleStatus(s)}>
                  <Text
                    style={[
                      styles.chipText,
                      {color: active ? sc.text : colors.inkMuted},
                    ]}>
                    {statusLabels[s]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.chips}>
            {allPriorities.map(p => {
              const active = local.priority.includes(p);
              const pc = priorityColors[p];
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.chip,
                    {backgroundColor: active ? pc.bg : colors.stone100},
                    active && {borderColor: pc.text},
                  ]}
                  onPress={() => togglePriority(p)}>
                  <Text
                    style={[
                      styles.chipText,
                      {color: active ? pc.text : colors.inkMuted},
                    ]}>
                    {priorityLabels[p]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.stone200,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  cancelText: {
    fontSize: fontSize.md,
    color: colors.inkMuted,
  },
  clearText: {
    fontSize: fontSize.md,
    color: colors.sev1,
  },
  body: {
    flex: 1,
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.stone200,
  },
  applyButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  applyText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
