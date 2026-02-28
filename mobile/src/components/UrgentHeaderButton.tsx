import React, {useState, useCallback} from 'react';
import {View, TouchableOpacity, Text, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {navigationRef} from '../navigation/AppNavigator';
import {api} from '../api/client';
import {colors, fontSize, fontWeight} from '../theme';

export default function UrgentHeaderButton() {
  const [overdueCount, setOverdueCount] = useState(0);
  const [dueSoonCount, setDueSoonCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const resp = await api.getUrgentTickets();
          if (!cancelled) {
            setOverdueCount(resp.overdue_count);
            setDueSoonCount(resp.due_soon_count);
          }
        } catch {
          // ignore
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const total = overdueCount + dueSoonCount;
  const badgeColor = overdueCount > 0 ? colors.sev1 : '#d97706';

  const onPress = () => {
    if (navigationRef.isReady()) {
      (navigationRef as any).navigate('UrgentTickets');
    }
  };

  return (
    <TouchableOpacity
      testID="urgent-header-button"
      onPress={onPress}
      style={styles.button}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
      <Icon name="clock-alert-outline" size={22} color={colors.inkMuted} />
      {total > 0 && (
        <View
          testID="urgent-header-badge"
          style={[styles.badge, {backgroundColor: badgeColor}]}>
          <Text style={styles.badgeText}>{total}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 4,
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: fontSize.xs - 1,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
});
