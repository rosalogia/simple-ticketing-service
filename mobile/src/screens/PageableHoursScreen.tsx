import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {settingsApi} from '../api/client';
import type {UserQueueSettings} from '../types';
import type {SettingsStackParamList} from '../navigation/AppNavigator';
import {colors, spacing, fontSize, fontWeight, borderRadius} from '../theme';

type Props = NativeStackScreenProps<SettingsStackParamList, 'PageableHours'>;

const HOURS = Array.from({length: 24}, (_, i) =>
  `${String(i).padStart(2, '0')}:00`,
);

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export default function PageableHoursScreen({route}: Props) {
  const queueId = route.params.queueId;

  const [settings, setSettings] = useState<UserQueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [tz, setTz] = useState('America/New_York');
  const [optOut, setOptOut] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showTzPicker, setShowTzPicker] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await settingsApi.getMySettings(queueId);
      setSettings(s);
      setStart(s.pageable_start);
      setEnd(s.pageable_end);
      setTz(s.timezone);
      setOptOut(s.sev1_off_hours_opt_out);
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
    setSaving(true);
    try {
      const updated = await settingsApi.updateMySettings(queueId, {
        pageable_start: start,
        pageable_end: end,
        timezone: tz,
        sev1_off_hours_opt_out: optOut,
      });
      setSettings(updated);
      Alert.alert('Saved', 'Paging settings updated');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pageable Hours</Text>
        <Text style={styles.description}>
          SEV2 pages will only be sent during these hours. SEV1 pages ignore
          these hours by default (see opt-out below).
        </Text>

        {/* Start Time */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            setShowStartPicker(!showStartPicker);
            setShowEndPicker(false);
            setShowTzPicker(false);
          }}>
          <Text style={styles.pickerLabel}>Start Time</Text>
          <Text style={styles.pickerValue}>{start}</Text>
        </TouchableOpacity>
        {showStartPicker && (
          <ScrollView style={styles.optionsList} nestedScrollEnabled>
            {HOURS.map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.option, h === start && styles.optionSelected]}
                onPress={() => {
                  setStart(h);
                  setShowStartPicker(false);
                }}>
                <Text
                  style={[
                    styles.optionText,
                    h === start && styles.optionTextSelected,
                  ]}>
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* End Time */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            setShowEndPicker(!showEndPicker);
            setShowStartPicker(false);
            setShowTzPicker(false);
          }}>
          <Text style={styles.pickerLabel}>End Time</Text>
          <Text style={styles.pickerValue}>{end}</Text>
        </TouchableOpacity>
        {showEndPicker && (
          <ScrollView style={styles.optionsList} nestedScrollEnabled>
            {HOURS.map(h => (
              <TouchableOpacity
                key={h}
                style={[styles.option, h === end && styles.optionSelected]}
                onPress={() => {
                  setEnd(h);
                  setShowEndPicker(false);
                }}>
                <Text
                  style={[
                    styles.optionText,
                    h === end && styles.optionTextSelected,
                  ]}>
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Timezone */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            setShowTzPicker(!showTzPicker);
            setShowStartPicker(false);
            setShowEndPicker(false);
          }}>
          <Text style={styles.pickerLabel}>Timezone</Text>
          <Text style={styles.pickerValue}>{tz}</Text>
        </TouchableOpacity>
        {showTzPicker && (
          <ScrollView style={styles.optionsList} nestedScrollEnabled>
            {TIMEZONES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.option, t === tz && styles.optionSelected]}
                onPress={() => {
                  setTz(t);
                  setShowTzPicker(false);
                }}>
                <Text
                  style={[
                    styles.optionText,
                    t === tz && styles.optionTextSelected,
                  ]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SEV1 Off-Hours Opt-Out</Text>
        <Text style={styles.description}>
          When enabled, SEV1 pages will also respect your pageable hours instead
          of paging you 24/7.
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Disable SEV1 off-hours pages</Text>
          <Switch
            value={optOut}
            onValueChange={setOptOut}
            trackColor={{false: colors.stone300, true: colors.accent}}
            thumbColor={colors.white}
          />
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Text>
        </TouchableOpacity>
      </View>

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
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pickerLabel: {
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: fontWeight.medium,
  },
  pickerValue: {
    fontSize: fontSize.md,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  optionsList: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    maxHeight: 200,
    overflow: 'hidden',
  },
  option: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone100,
  },
  optionSelected: {
    backgroundColor: colors.accentLight,
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  optionTextSelected: {
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchLabel: {
    fontSize: fontSize.md,
    color: colors.ink,
    flex: 1,
    marginRight: spacing.md,
  },
  buttonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
