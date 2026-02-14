import messaging from '@react-native-firebase/messaging';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {handleRemoteMessage} from './src/notifications/messageHandler';

// Register background message handler before AppRegistry
messaging().setBackgroundMessageHandler(handleRemoteMessage);

AppRegistry.registerComponent(appName, () => App);
