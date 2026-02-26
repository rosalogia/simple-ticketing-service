import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import {AppRegistry, LogBox} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {handleRemoteMessage} from './src/notifications/messageHandler';
import {handleBackgroundNotificationEvent} from './src/notifications/actionHandler';

// Suppress LogBox warnings during Detox E2E tests — the yellow warning bar
// covers bottom tab bars and FABs, causing tap failures.
if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

// Register background handlers before AppRegistry so they're available
// even when the app is killed (headless JS context).
messaging().setBackgroundMessageHandler(handleRemoteMessage);
notifee.onBackgroundEvent(handleBackgroundNotificationEvent);

AppRegistry.registerComponent(appName, () => App);
