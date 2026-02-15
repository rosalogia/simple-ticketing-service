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
import type {UserQueueSettings, WeekSchedule} from '../types';
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

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const DAY_LABELS: Record<string, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: {start: '09:00', end: '17:00'},
  tue: {start: '09:00', end: '17:00'},
  wed: {start: '09:00', end: '17:00'},
  thu: {start: '09:00', end: '17:00'},
  fri: {start: '09:00', end: '17:00'},
  sat: {start: '09:00', end: '17:00'},
  sun: {start: '09:00', end: '17:00'},
};

export default function PageableHoursScreen({route}: Props) {
  const queueId = route.params.queueId;

  const [settings, setSettings] = useState<UserQueueSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [tz, setTz] = useState('America/New_York');
  const [optOut, setOptOut] = useState(false);

  const [expandedPicker, setExpandedPicker] = useState<string | null>(null);
  const [showTzPicker, setShowTzPicker] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await settingsApi.getMySettings(queueId);
      setSettings(s);
      setSchedule(s.schedule || DEFAULT_SCHEDULE);
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

  const toggleDay = (day: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day] ? null : {start: '09:00', end: '17:00'},
    }));
  };

  const setDayTime = (day: string, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {...(prev[day] || {start: '09:00', end: '17:00'}), [field]: value},
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await settingsApi.updateMySettings(queueId, {
        schedule,
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
          these hours by default (see opt-out below). Toggle a day off to
          disable pages for that day entirely.
        </Text>

        {DAY_KEYS.map(day => {
          const dayConfig = schedule[day];
          const enabled = !!dayConfig;
          const startKey = `${day}-start`;
          const endKey = `${day}-end`;

          return (
            <View key={day} style={styles.dayRow}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, !enabled && styles.dayLabelDisabled]}>
                  {DAY_LABELS[day]}
                </Text>
                <Switch
                  value={enabled}
                  onValueChange={() => toggleDay(day)}
                  trackColor={{false: colors.stone300, true: colors.accent}}
                  thumbColor={colors.white}
                />
              </View>

              {enabled && (
                <View style={styles.timeRow}>
                  {/* Start time */}
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {
                      setExpandedPicker(expandedPicker === startKey ? null : startKey);
                      setShowTzPicker(false);
                    }}>
                    <Text style={styles.timeLabel}>Start</Text>
                    <Text style={styles.timeValue}>{dayConfig!.start}</Text>
                  </TouchableOpacity>

                  <Text style={styles.timeSeparator}>to</Text>

                  {/* End time */}
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => {
                      setExpandedPicker(expandedPicker === endKey ? null : endKey);
                      setShowTzPicker(false);
                    }}>
                    <Text style={styles.timeLabel}>End</Text>
                    <Text style={styles.timeValue}>{dayConfig!.end}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {expandedPicker === startKey && enabled && (
                <ScrollView style={styles.optionsList} nestedScrollEnabled>
                  {HOURS.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.option, h === dayConfig!.start && styles.optionSelected]}
                      onPress={() => {
                        setDayTime(day, 'start', h);
                        setExpandedPicker(null);
                      }}>
                      <Text style={[styles.optionText, h === dayConfig!.start && styles.optionTextSelected]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {expandedPicker === endKey && enabled && (
                <ScrollView style={styles.optionsList} nestedScrollEnabled>
                  {HOURS.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.option, h === dayConfig!.end && styles.optionSelected]}
                      onPress={() => {
                        setDayTime(day, 'end', h);
                        setExpandedPicker(null);
                      }}>
                      <Text style={[styles.optionText, h === dayConfig!.end && styles.optionTextSelected]}>
                        {h}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          );
        })}
      </View>

      {/* Timezone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Timezone</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => {
            setShowTzPicker(!showTzPicker);
            setExpandedPicker(null);
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
  dayRow: {
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone100,
    paddingBottom: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  dayLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.ink,
  },
  dayLabelDisabled: {
    color: colors.inkMuted,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone200,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  timeLabel: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  timeValue: {
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: fontWeight.semibold,
  },
  timeSeparator: {
    fontSize: fontSize.sm,
    color: colors.inkMuted,
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
