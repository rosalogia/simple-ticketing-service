import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  StatusBar,
  Animated,
  Platform,
  NativeModules,
} from 'react-native';
import notifee from '@notifee/react-native';
import Sound from 'react-native-sound';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {api} from '../api/client';
import type {RootStackParamList} from '../navigation/AppNavigator';
import {navigationRef} from '../navigation/AppNavigator';

const {SirenPlayer} = NativeModules;

type Props = NativeStackScreenProps<RootStackParamList, 'PageAlert'>;

export default function PageAlertScreen({route, navigation}: Props) {
  const {ticketId, title, priority, status, notificationId, pageSoundEnabled = true, pageVolume = 100} = route.params;
  const [acknowledging, setAcknowledging] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // iOS fallback: react-native-sound (relative to system volume)
  const soundRef = useRef<Sound | null>(null);
  const soundReleasedRef = useRef(false);

  const isSev1 = priority === 'SEV1';
  const bgColor = isSev1 ? '#7f1d1d' : '#7c2d12';
  const accentColor = isSev1 ? '#fca5a5' : '#fdba74';
  const buttonColor = isSev1 ? '#dc2626' : '#ea580c';
  const buttonPressedColor = isSev1 ? '#b91c1c' : '#c2410c';

  // Pulsing animation for the acknowledge button
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  // Vibrate repeatedly while screen is open
  useEffect(() => {
    const pattern = [0, 500, 300, 500, 300, 500, 2000];
    if (Platform.OS === 'android') {
      Vibration.vibrate(pattern, true);
    }
    return () => Vibration.cancel();
  }, []);

  // Cancel the system notification on mount to stop its sound —
  // PageAlertScreen takes over with its own audio + vibration
  useEffect(() => {
    if (notificationId) {
      notifee.cancelNotification(notificationId);
    }
  }, [notificationId]);

  // Play siren sound if enabled
  useEffect(() => {
    if (!pageSoundEnabled) return;

    if (Platform.OS === 'android' && SirenPlayer) {
      // Android: native module plays on STREAM_ALARM for absolute volume control
      SirenPlayer.play(pageVolume);
      return () => {
        SirenPlayer.stop();
      };
    }

    // iOS fallback: react-native-sound (relative to system volume)
    soundReleasedRef.current = false;
    Sound.setCategory('Playback');
    const siren = new Sound('siren.mp3', Sound.MAIN_BUNDLE, err => {
      if (err || soundReleasedRef.current) return;
      siren.setVolume(pageVolume / 100);
      siren.setNumberOfLoops(-1);
      siren.play();
    });
    soundRef.current = siren;

    return () => {
      if (soundRef.current === siren) {
        soundReleasedRef.current = true;
        siren.release();
        soundRef.current = null;
      }
    };
  }, [pageSoundEnabled, pageVolume]);

  const stopSound = () => {
    if (Platform.OS === 'android' && SirenPlayer) {
      SirenPlayer.stop();
      return;
    }
    soundReleasedRef.current = true;
    if (soundRef.current) {
      soundRef.current.release();
      soundRef.current = null;
    }
  };

  const navigateToTicket = () => {
    // Preserve queueId from the existing MainTabs route to avoid crash
    const navState = navigationRef.getRootState();
    const mainTabsRoute = navState?.routes.find((r: any) => r.name === 'MainTabs');
    const queueId = (mainTabsRoute?.params as any)?.queueId;

    navigation.goBack();
    if (navigationRef.isReady() && queueId) {
      (navigationRef as any).navigate('MainTabs', {
        queueId,
        screen: 'HomeTab',
        params: {
          screen: 'TicketDetail',
          params: {ticketId},
        },
      });
    }
  };

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    Vibration.cancel();
    stopSound();
    try {
      await api.acknowledgeTicket(ticketId);
      // Dismiss the notification
      if (notificationId) {
        await notifee.cancelNotification(notificationId);
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    }
    navigateToTicket();
  };

  const handleViewTicket = () => {
    Vibration.cancel();
    stopSound();
    navigateToTicket();
  };

  return (
    <View style={[styles.container, {backgroundColor: bgColor}]}>
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />

      {/* Priority badge */}
      <View style={styles.priorityContainer}>
        <View style={[styles.priorityBadge, {backgroundColor: accentColor}]}>
          <Text style={[styles.priorityText, {color: bgColor}]}>{priority}</Text>
        </View>
      </View>

      {/* PAGE label */}
      <Text style={styles.pageLabel}>PAGE</Text>

      {/* Ticket info */}
      <View style={styles.ticketInfo}>
        <Text style={styles.ticketTitle} numberOfLines={3}>
          {title}
        </Text>
        <Text style={[styles.statusText, {color: accentColor}]}>
          Status: {status}
        </Text>
      </View>

      {/* Big acknowledge button */}
      <View style={styles.buttonContainer}>
        <Animated.View style={{transform: [{scale: pulseAnim}], width: '100%'}}>
          <TouchableOpacity
            style={[
              styles.acknowledgeButton,
              {backgroundColor: buttonColor},
              acknowledging && {backgroundColor: buttonPressedColor, opacity: 0.8},
            ]}
            onPress={handleAcknowledge}
            disabled={acknowledging}
            activeOpacity={0.8}>
            <Text style={styles.acknowledgeIcon}>
              {acknowledging ? '...' : '!'}
            </Text>
            <Text style={styles.acknowledgeText}>
              {acknowledging ? 'Acknowledging...' : 'ACKNOWLEDGE'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={handleViewTicket}
          activeOpacity={0.7}>
          <Text style={[styles.viewButtonText, {color: accentColor}]}>
            View Ticket
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  priorityContainer: {
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
  },
  priorityText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  pageLabel: {
    fontSize: 56,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 8,
    marginBottom: 24,
  },
  ticketInfo: {
    alignItems: 'center',
    marginBottom: 48,
    paddingHorizontal: 16,
  },
  ticketTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 30,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  acknowledgeButton: {
    width: '100%',
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  acknowledgeIcon: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  acknowledgeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 3,
  },
  viewButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
