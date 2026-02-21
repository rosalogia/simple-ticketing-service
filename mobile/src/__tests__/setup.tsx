import '@testing-library/react-native/build/matchers/extend-expect';

// ── @react-native-firebase/messaging ────────────────────────────
jest.mock('@react-native-firebase/messaging', () => {
  const mock = () => ({
    requestPermission: jest.fn().mockResolvedValue(1),
    getToken: jest.fn().mockResolvedValue('mock-fcm-token'),
    onMessage: jest.fn().mockReturnValue(jest.fn()),
    onTokenRefresh: jest.fn().mockReturnValue(jest.fn()),
    registerDeviceForRemoteMessages: jest.fn().mockResolvedValue(undefined),
    isDeviceRegisteredForRemoteMessages: true,
  });
  mock.AuthorizationStatus = {AUTHORIZED: 1, PROVISIONAL: 2, DENIED: 0};
  return {__esModule: true, default: mock};
});

// ── @notifee/react-native ───────────────────────────────────────
jest.mock('@notifee/react-native', () => ({
  displayNotification: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelNotification: jest.fn().mockResolvedValue(undefined),
  createChannel: jest.fn().mockResolvedValue('channel-id'),
  deleteChannel: jest.fn().mockResolvedValue(undefined),
  onForegroundEvent: jest.fn().mockReturnValue(jest.fn()),
  getInitialNotification: jest.fn().mockResolvedValue(null),
  EventType: {
    ACTION_PRESS: 1,
    PRESS: 7,
    DISMISSED: 0,
  },
  AndroidImportance: {DEFAULT: 3, HIGH: 4},
  AndroidVisibility: {PUBLIC: 1},
  AndroidCategory: {ALARM: 'alarm'},
  AndroidStyle: {BIGTEXT: 0},
  AndroidFlags: {FLAG_INSISTENT: 4},
}));

// ── react-native-keychain ───────────────────────────────────────
jest.mock('react-native-keychain', () => ({
  setGenericPassword: jest.fn().mockResolvedValue(true),
  getGenericPassword: jest.fn().mockResolvedValue(false),
  resetGenericPassword: jest.fn().mockResolvedValue(true),
}));

// ── @react-native-async-storage/async-storage ───────────────────
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// ── react-native-sound ──────────────────────────────────────────
jest.mock('react-native-sound', () => {
  class MockSound {
    play = jest.fn(cb => cb?.(true));
    release = jest.fn();
    setVolume = jest.fn(() => this);
    setNumberOfLoops = jest.fn(() => this);
    setCategory = jest.fn();
  }
  (MockSound as any).setCategory = jest.fn();
  return MockSound;
});

// ── react-native-vector-icons ───────────────────────────────────
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const {Text} = require('react-native');
  return (props: any) => <Text {...props}>{props.name}</Text>;
});

// ── react-native-safe-area-context ──────────────────────────────
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
  SafeAreaView: ({children}: {children: React.ReactNode}) => children,
  useSafeAreaInsets: () => ({top: 0, right: 0, bottom: 0, left: 0}),
}));

// ── @react-navigation ───────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  NavigationContainer: ({children}: {children: React.ReactNode}) => children,
  createNavigationContainerRef: () => ({
    isReady: jest.fn().mockReturnValue(true),
    navigate: mockNavigate,
    goBack: mockGoBack,
    current: {navigate: mockNavigate, goBack: mockGoBack},
  }),
  useNavigation: () => ({navigate: mockNavigate, goBack: mockGoBack}),
  useRoute: () => ({params: {}}),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({children}: {children: React.ReactNode}) => children,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({children}: {children: React.ReactNode}) => children,
    Screen: ({children}: {children: React.ReactNode}) => children,
  }),
}));

// ── NativeModules.SirenPlayer ───────────────────────────────────
const {NativeModules} = require('react-native');
NativeModules.SirenPlayer = {
  play: jest.fn(),
  stop: jest.fn(),
  checkFullScreenIntent: jest.fn().mockResolvedValue(undefined),
};

// ── Linking overrides ───────────────────────────────────────────
const {Linking} = require('react-native');
Linking.openURL = jest.fn().mockResolvedValue(undefined);
Linking.openSettings = jest.fn().mockResolvedValue(undefined);

// ── Global fetch mock ───────────────────────────────────────────
global.fetch = jest.fn();

// Export for use in tests
export {mockNavigate, mockGoBack};
