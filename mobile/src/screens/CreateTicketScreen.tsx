import React, {useState, useEffect} from 'react';
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
import {api, queueApi} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import type {QueueMember, CategoriesResponse} from '../types';
import type {HomeStackParamList} from '../navigation/AppNavigator';
import {colors, spacing, fontSize, fontWeight, borderRadius, priorityLabels} from '../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateTicket'>;

const priorities = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const;

export default function CreateTicketScreen({navigation, route}: Props) {
  const {user} = useAuth();
  const queueId = route.params.queueId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [priority, setPriority] = useState<string>('SEV3');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [item, setItem] = useState('');
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [categories, setCategories] = useState<CategoriesResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    queueApi.getMembers(queueId).then(setMembers).catch(() => {});
    api.getCategories(queueId).then(setCategories).catch(() => {});
  }, [queueId]);

  // Default assignee to current user
  useEffect(() => {
    if (user && !assigneeId) {
      setAssigneeId(user.id);
    }
  }, [user, assigneeId]);

  const handleAssigneePicker = () => {
    const options = members.map(m => ({
      text: m.user.display_name,
      onPress: () => setAssigneeId(m.user.id),
    }));
    Alert.alert('Select Assignee', '', [
      ...options,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handlePriorityPicker = () => {
    const options = priorities.map(p => ({
      text: priorityLabels[p],
      onPress: () => setPriority(p),
    }));
    Alert.alert('Select Priority', '', [
      ...options,
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleCategoryPicker = (
    field: 'category' | 'type' | 'item',
    values: string[],
    setter: (v: string) => void,
  ) => {
    if (!values.length) return;
    const options = values.map(v => ({
      text: v,
      onPress: () => setter(v),
    }));
    Alert.alert(`Select ${field}`, '', [
      ...options,
      {text: 'Clear', onPress: () => setter('')},
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    if (!assigneeId) {
      Alert.alert('Error', 'Assignee is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.createTicket({
        title: title.trim(),
        description: description.trim() || undefined,
        assignee_id: assigneeId,
        queue_id: queueId,
        priority,
        due_date: dueDate || undefined,
        category: category || undefined,
        type: type || undefined,
        item: item || undefined,
      });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const assigneeName =
    members.find(m => m.user.id === assigneeId)?.user.display_name || 'Select...';

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ticket title"
          placeholderTextColor={colors.stone400}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue..."
          placeholderTextColor={colors.stone400}
          multiline
        />

        <Text style={styles.label}>Assignee *</Text>
        <TouchableOpacity style={styles.picker} onPress={handleAssigneePicker}>
          <Text style={styles.pickerText}>{assigneeName}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Priority</Text>
        <TouchableOpacity style={styles.picker} onPress={handlePriorityPicker}>
          <Text style={styles.pickerText}>{priorityLabels[priority]}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2025-12-31"
          placeholderTextColor={colors.stone400}
        />

        {categories && categories.categories.length > 0 && (
          <>
            <Text style={styles.label}>Category</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() =>
                handleCategoryPicker('category', categories.categories, setCategory)
              }>
              <Text style={styles.pickerText}>{category || 'Select...'}</Text>
            </TouchableOpacity>
          </>
        )}

        {categories && categories.types.length > 0 && (
          <>
            <Text style={styles.label}>Type</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() =>
                handleCategoryPicker('type', categories.types, setType)
              }>
              <Text style={styles.pickerText}>{type || 'Select...'}</Text>
            </TouchableOpacity>
          </>
        )}

        {categories && categories.items.length > 0 && (
          <>
            <Text style={styles.label}>Item</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() =>
                handleCategoryPicker('item', categories.items, setItem)
              }>
              <Text style={styles.pickerText}>{item || 'Select...'}</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && {opacity: 0.6}]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.submitText}>Create Ticket</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  form: {
    padding: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  pickerText: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  submitButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxxl,
  },
  submitText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
});
