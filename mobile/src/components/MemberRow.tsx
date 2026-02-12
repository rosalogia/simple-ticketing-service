import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import type {QueueMember, QueueRole} from '../types';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

interface Props {
  member: QueueMember;
  currentUserRole: QueueRole | null;
  onChangeRole: (userId: number, role: QueueRole) => void;
  onRemove: (userId: number) => void;
}

const roleOrder: QueueRole[] = ['VIEWER', 'MEMBER', 'OWNER'];

export default function MemberRow({
  member,
  currentUserRole,
  onChangeRole,
  onRemove,
}: Props) {
  const canManage = currentUserRole === 'OWNER';

  const handleRolePicker = () => {
    if (!canManage) return;
    const options = roleOrder.map(r => ({
      text: r,
      onPress: () => onChangeRole(member.user.id, r),
    }));
    Alert.alert('Change Role', `Set role for ${member.user.display_name}`, [
      ...options,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Member',
      `Remove ${member.user.display_name} from queue?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onRemove(member.user.id),
        },
      ],
    );
  };

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{member.user.display_name}</Text>
        <Text style={styles.username}>@{member.user.username}</Text>
      </View>
      <TouchableOpacity
        onPress={handleRolePicker}
        disabled={!canManage}
        style={[styles.roleBadge, !canManage && {opacity: 0.6}]}>
        <Text style={styles.roleText}>{member.role}</Text>
      </TouchableOpacity>
      {canManage && member.role !== 'OWNER' && (
        <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone100,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.ink,
  },
  username: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  roleBadge: {
    backgroundColor: colors.accentLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.accent,
  },
  removeButton: {
    padding: spacing.xs,
  },
  removeText: {
    fontSize: fontSize.sm,
    color: colors.sev1,
    fontWeight: fontWeight.medium,
  },
});
