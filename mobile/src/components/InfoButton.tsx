import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

interface Props {
  children: React.ReactNode;
}

export default function InfoButton({children}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setVisible(true)}
        hitSlop={8}
        accessibilityLabel="More info">
        <Text style={styles.buttonText}>?</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
            <ScrollView bounces={false}>{children}</ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

/* ── Help content components ──────────────────────────────────── */

export function PriorityHelpContent() {
  return (
    <View>
      <Text style={styles.heading}>Priority Levels</Text>
      <View style={styles.helpBody}>
        <Text style={styles.helpText}>
          <Text style={[styles.bold, {color: colors.sev1}]}>SEV-1 (Urgent):</Text>{' '}
          Critical issue requiring immediate attention. Pages every 15 min (open)
          or 2 h (in progress).
        </Text>
        <Text style={styles.helpText}>
          <Text style={[styles.bold, {color: colors.sev2}]}>SEV-2 (High):</Text>{' '}
          Important issue. Pages every 30 min (open) or 8 h (in progress).
        </Text>
        <Text style={styles.helpText}>
          <Text style={[styles.bold, {color: colors.sev3}]}>SEV-3 (Normal):</Text>{' '}
          Standard priority. No paging.
        </Text>
        <Text style={styles.helpText}>
          <Text style={[styles.bold, {color: colors.sev4}]}>SEV-4 (Low):</Text>{' '}
          Minor issue. No paging.
        </Text>
      </View>
      <Text style={styles.footnote}>
        Tickets with due dates are automatically escalated to higher severity as
        the deadline approaches.
      </Text>
    </View>
  );
}

export function EscalationHelpContent() {
  return (
    <View>
      <Text style={styles.heading}>Escalation Rules</Text>
      <Text style={[styles.helpText, {marginBottom: spacing.sm}]}>
        Tickets are automatically escalated (severity increased) based on their
        due date:
      </Text>
      <View style={styles.bulletList}>
        <Text style={styles.helpText}>
          {'\u2022  '}
          <Text style={styles.medium}>7 days before due:</Text> First escalation
        </Text>
        <Text style={styles.helpText}>
          {'\u2022  '}
          <Text style={styles.medium}>On due date:</Text> Second escalation
        </Text>
        <Text style={styles.helpText}>
          {'\u2022  '}
          <Text style={styles.medium}>After due date:</Text> Escalates once per
          day
        </Text>
      </View>
      <Text style={styles.footnote}>
        Escalation pauses when a ticket is Blocked, Completed, or Cancelled.
        Tickets already at SEV-1 cannot escalate further.
      </Text>
    </View>
  );
}

export function PagingHelpContent() {
  return (
    <View>
      <Text style={styles.heading}>Paging Schedule</Text>
      <Text style={[styles.helpText, {marginBottom: spacing.sm}]}>
        SEV-1 and SEV-2 tickets in Open or In Progress status send repeated
        notifications to the assignee:
      </Text>
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={[styles.tableCell, styles.tableCellFirst, styles.tableHeaderText]} />
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Open</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>In Progress</Text>
        </View>
        <View style={[styles.tableRow, styles.tableBodyRow]}>
          <Text style={[styles.tableCell, styles.tableCellFirst, styles.bold, {color: colors.sev1}]}>
            SEV-1
          </Text>
          <Text style={[styles.tableCell, styles.tableCellBody]}>Every 15 min</Text>
          <Text style={[styles.tableCell, styles.tableCellBody]}>Every 2 hours</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableCellFirst, styles.bold, {color: colors.sev2}]}>
            SEV-2
          </Text>
          <Text style={[styles.tableCell, styles.tableCellBody]}>Every 30 min</Text>
          <Text style={[styles.tableCell, styles.tableCellBody]}>Every 8 hours</Text>
        </View>
      </View>
      <Text style={styles.footnote}>
        Acknowledging a page does not stop future pages — it just records that
        you saw it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Button
  button: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.stone300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 10,
    fontWeight: fontWeight.semibold,
    color: colors.stone400,
    lineHeight: 12,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxWidth: 340,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // Help content
  heading: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  helpBody: {
    gap: 6,
  },
  helpText: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 18,
  },
  bold: {
    fontWeight: fontWeight.semibold,
  },
  medium: {
    fontWeight: fontWeight.medium,
    color: colors.inkLight,
  },
  bulletList: {
    gap: 4,
    marginLeft: spacing.sm,
  },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.stone500,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.stone100,
    lineHeight: 16,
  },

  // Table
  table: {
    marginBottom: spacing.xs,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.stone200,
  },
  tableBodyRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.stone100,
  },
  tableHeaderText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.stone500,
  },
  tableCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableCellFirst: {
    flex: 0.7,
  },
  tableCellBody: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
});
