module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['./src/__tests__/setup.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation|react-native-safe-area-context|react-native-screens|react-native-vector-icons|@react-native-firebase|@notifee|@react-native-async-storage|@react-native-community|react-native-keychain|react-native-sound)/)',
  ],
};
