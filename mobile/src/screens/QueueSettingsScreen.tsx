import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {queueApi, api} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import type {Queue, QueueMember, QueueRole, User} from '../types';
import type {SettingsStackParamList} from '../navigation/AppNavigator';
import MemberRow from '../components/MemberRow';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type Props = NativeStackScreenProps<SettingsStackParamList, 'QueueSettings'>;

export default function QueueSettingsScreen({route, navigation}: Props) {
  const {user} = useAuth();
  const queueId = route.params.queueId;

  const [queue, setQueue] = useState<Queue | null>(null);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [q, m, u] = await Promise.all([
        queueApi.getQueue(queueId),
        queueApi.getMembers(queueId),
        api.getUsers(),
      ]);
      setQueue(q);
      setMembers(m);
      setAllUsers(u);
      setName(q.name);
      setDescription(q.description || '');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    try {
      const updated = await queueApi.updateQueue(queueId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setQueue(updated);
      setEditingName(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleChangeRole = async (userId: number, role: QueueRole) => {
    try {
      await queueApi.updateMemberRole(queueId, userId, role);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await queueApi.removeMember(queueId, userId);
      load();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleAddMember = () => {
    const memberIds = new Set(members.map(m => m.user.id));
    const available = allUsers.filter(u => !memberIds.has(u.id));
    if (!available.length) {
      Alert.alert('No users available', 'All users are already members.');
      return;
    }
    const options = available.map(u => ({
      text: u.display_name,
      onPress: async () => {
        try {
          await queueApi.addMember(queueId, u.id);
          load();
        } catch (e: any) {
          Alert.alert('Error', e.message);
        }
      },
    }));
    Alert.alert('Add Member', 'Select user to add', [
      ...options,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleSyncDiscord = async () => {
    try {
      await queueApi.syncDiscord(queueId);
      load();
      Alert.alert('Success', 'Discord sync complete');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleDeleteQueue = () => {
    Alert.alert(
      'Delete Queue',
      'This will delete all tickets and data. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await queueApi.deleteQueue(queueId);
              navigation.getParent()?.goBack();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  if (loading || !queue) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const myRole = queue.my_role;

  return (
    <ScrollView style={styles.container}>
      {/* Queue Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Queue Info</Text>
        {editingName ? (
          <>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Queue name"
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              multiline
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingName(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <TouchableOpacity
            onPress={() => myRole === 'OWNER' && setEditingName(true)}>
            <Text style={styles.queueName}>{queue.name}</Text>
            {queue.description && (
              <Text style={styles.queueDescription}>{queue.description}</Text>
            )}
            {myRole === 'OWNER' && (
              <Text style={styles.editHint}>Tap to edit</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Members */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Members ({members.length})
          </Text>
          {myRole === 'OWNER' && (
            <TouchableOpacity onPress={handleAddMember}>
              <Text style={styles.addText}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>
        {members.map(m => (
          <MemberRow
            key={m.id}
            member={m}
            currentUserRole={myRole}
            onChangeRole={handleChangeRole}
            onRemove={handleRemoveMember}
          />
        ))}
      </View>

      {/* Discord sync */}
      {queue.discord_guild_id && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discord</Text>
          <TouchableOpacity style={styles.syncButton} onPress={handleSyncDiscord}>
            <Text style={styles.syncButtonText}>Sync from Discord</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Danger Zone */}
      {myRole === 'OWNER' && (
        <View style={[styles.section, styles.dangerZone]}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteQueue}>
            <Text style={styles.deleteText}>Delete Queue</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{height: 40}} />
    </ScrollView>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  queueName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  queueDescription: {
    fontSize: fontSize.md,
    color: colors.inkMuted,
    marginTop: spacing.xs,
  },
  editHint: {
    fontSize: fontSize.xs,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  multiline: {
    minHeight: 60,
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
  addText: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
  },
  syncButton: {
    backgroundColor: colors.discord,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  syncButtonText: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  dangerZone: {
    borderBottomWidth: 0,
  },
  dangerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.sev1,
    marginBottom: spacing.sm,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.sev1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deleteText: {
    color: colors.sev1,
    fontWeight: fontWeight.semibold,
  },
});
