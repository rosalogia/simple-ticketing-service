import messaging from '@react-native-firebase/messaging';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
import {deviceApi} from '../api/client';

export async function requestNotificationPermission(): Promise<boolean> {
  // Android 13+ requires explicit POST_NOTIFICATIONS runtime permission
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    if (status === PermissionsAndroid.RESULTS.DENIED) {
      // User tapped "Don't allow" — we can ask again next time
      return false;
    }
    if (status === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      // User permanently denied — guide them to settings
      Alert.alert(
        'Notifications Disabled',
        'STS needs notifications to page you for critical incidents. Please enable them in app settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => Linking.openSettings()},
        ],
      );
      return false;
    }
  }

  // Also request via Firebase (needed for iOS and older Android)
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

export async function registerDeviceToken(): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return;
    }

    const token = await messaging().getToken();
    const platform = Platform.OS as 'android' | 'ios';
    await deviceApi.registerToken(token, platform);
    console.log('Device token registered');

    // Listen for token refresh
    messaging().onTokenRefresh(async newToken => {
      try {
        await deviceApi.registerToken(newToken, platform);
        console.log('Device token refreshed');
      } catch (err) {
        console.error('Failed to refresh device token:', err);
      }
    });
  } catch (err) {
    console.error('Failed to register device token:', err);
  }
}

export async function unregisterDeviceToken(): Promise<void> {
  try {
    const token = await messaging().getToken();
    const platform = Platform.OS as 'android' | 'ios';
    await deviceApi.unregisterToken(token, platform);
    console.log('Device token unregistered');
  } catch (err) {
    console.error('Failed to unregister device token:', err);
  }
}
