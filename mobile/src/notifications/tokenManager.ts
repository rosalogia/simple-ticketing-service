import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import {deviceApi} from '../api/client';

export async function requestNotificationPermission(): Promise<boolean> {
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
