import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api, queueApi} from '../api/client';
import {useAuth} from '../auth/AuthContext';
import type {QueueMember, CategoriesResponse} from '../types';
import type {HomeStackParamList} from '../navigation/AppNavigator';
import {colors, spacing, fontSize, fontWeight, borderRadius, priorityLabels} from '../theme';
import InfoButton, {PriorityHelpContent} from '../components/InfoButton';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateTicket'>;

function CtiAutocomplete({
  label,
  testIDPrefix,
  values,
  value,
  onSelect,
}: {
  label: string;
  testIDPrefix: string;
  values: string[];
  value: string;
  onSelect: (v: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const filtered = value.trim()
    ? values.filter(v => v.toLowerCase().includes(value.toLowerCase()))
    : values;

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={`${testIDPrefix}-input`}
        style={styles.input}
        value={value}
        onChangeText={text => {
          onSelect(text);
          setFocused(true);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Delay so suggestion onPress fires before hiding
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder={`Type to search ${label.toLowerCase()}s...`}
        placeholderTextColor={colors.stone400}
      />
      {focused && filtered.length > 0 && (
        <View testID={`${testIDPrefix}-suggestions`} style={styles.suggestions}>
          {filtered.map(v => (
            <Pressable
              testID={`${testIDPrefix}-suggestion-${v}`}
              key={v}
              style={styles.suggestionItem}
              onPress={() => {
                Keyboard.dismiss();
                onSelect(v);
                setFocused(false);
              }}>
              <Text style={styles.suggestionName}>{v}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </>
  );
}

const priorities = ['SEV1', 'SEV2', 'SEV3', 'SEV4'] as const;

export default function CreateTicketScreen({navigation, route}: Props) {
  const {user} = useAuth();
  const queueId = route.params.queueId;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<number | null>(null);
  const [priority, setPriority] = useState<string>('SEV3');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState('');
  const [type, setType] = useState('');
  const [item, setItem] = useState('');
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [categories, setCategories] = useState<CategoriesResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeFocused, setAssigneeFocused] = useState(false);

  useEffect(() => {
    queueApi.getMembers(queueId).then(setMembers).catch(() => {});
    api.getCategories(queueId).then(setCategories).catch(() => {});
  }, [queueId]);

  // Default assignee to current user (only on mount)
  useEffect(() => {
    if (user) {
      setAssigneeId(user.id);
      setAssigneeQuery(user.display_name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMembers = members.filter(m => {
    if (!assigneeQuery.trim()) return true;
    const q = assigneeQuery.toLowerCase();
    return (
      m.user.display_name.toLowerCase().includes(q) ||
      m.user.username.toLowerCase().includes(q)
    );
  });

  const selectAssignee = (member: QueueMember) => {
    setAssigneeId(member.user.id);
    setAssigneeQuery(member.user.display_name);
    setAssigneeFocused(false);
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

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = useMemo(() => new Date(), []);

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
        due_date: dueDate ? formatDate(dueDate) : undefined,
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

  return (
    <ScrollView testID="create-ticket-scroll" style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          testID="title-input"
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Ticket title"
          placeholderTextColor={colors.stone400}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          testID="description-input"
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the issue..."
          placeholderTextColor={colors.stone400}
          multiline
        />

        <Text style={styles.label}>Assignee *</Text>
        <TextInput
          style={styles.input}
          value={assigneeQuery}
          onChangeText={text => {
            setAssigneeQuery(text);
            setAssigneeId(null);
            setAssigneeFocused(true);
          }}
          onFocus={() => setAssigneeFocused(true)}
          placeholder="Search members..."
          placeholderTextColor={colors.stone400}
        />
        {assigneeFocused && filteredMembers.length > 0 && (
          <View style={styles.suggestions}>
            {filteredMembers.map(m => (
              <TouchableOpacity
                key={m.user.id}
                style={styles.suggestionItem}
                onPress={() => selectAssignee(m)}>
                <Text style={styles.suggestionName}>{m.user.display_name}</Text>
                <Text style={styles.suggestionUsername}>@{m.user.username}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.labelRow}>
          <Text style={[styles.label, {marginTop: 0, marginBottom: 0}]}>Priority</Text>
          <InfoButton>
            <PriorityHelpContent />
          </InfoButton>
        </View>
        <TouchableOpacity style={styles.picker} onPress={handlePriorityPicker}>
          <Text style={styles.pickerText}>{priorityLabels[priority]}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Due Date</Text>
        <TouchableOpacity
          testID="due-date-picker-button"
          style={styles.picker}
          onPress={() => setShowDatePicker(true)}>
          <Text style={dueDate ? styles.pickerText : styles.pickerPlaceholder}>
            {dueDate ? formatDate(dueDate) : 'Select date...'}
          </Text>
        </TouchableOpacity>
        {dueDate && (
          <TouchableOpacity onPress={() => setDueDate(null)}>
            <Text style={styles.clearLink}>Clear date</Text>
          </TouchableOpacity>
        )}
        {showDatePicker && (
          <DateTimePicker
            testID="due-date-calendar"
            value={dueDate || today}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={today}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'set' && selectedDate) setDueDate(selectedDate);
            }}
          />
        )}

        {categories && categories.categories.length > 0 && (
          <CtiAutocomplete
            label="Category"
            testIDPrefix="category"
            values={categories.categories}
            value={category}
            onSelect={setCategory}
          />
        )}

        {categories && categories.types.length > 0 && (
          <CtiAutocomplete
            label="Type"
            testIDPrefix="type"
            values={categories.types}
            value={type}
            onSelect={setType}
          />
        )}

        {categories && categories.items.length > 0 && (
          <CtiAutocomplete
            label="Item"
            testIDPrefix="item"
            values={categories.items}
            value={item}
            onSelect={setItem}
          />
        )}

        <TouchableOpacity
          testID="submit-ticket-button"
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
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
  pickerPlaceholder: {
    fontSize: fontSize.md,
    color: colors.stone400,
  },
  clearLink: {
    fontSize: fontSize.sm,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  suggestions: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.stone100,
  },
  suggestionName: {
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: fontWeight.medium,
  },
  suggestionUsername: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginLeft: spacing.sm,
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
