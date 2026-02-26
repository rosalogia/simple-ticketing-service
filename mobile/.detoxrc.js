/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      testBinaryPath:
        'android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk',
      build:
        'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug -PbundleInDebug && cd ..',
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'sts_test',
      },
    },
    'ci.emulator': {
      type: 'android.emulator',
      device: {
        avdName: 'detox_ci',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.ci.debug': {
      device: 'ci.emulator',
      app: 'android.debug',
    },
  },
  artifacts: {
    rootDir: 'artifacts',
    plugins: {
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
      },
      video: {
        keepOnlyFailedTestsArtifacts: true,
      },
      log: {
        enabled: true,
      },
    },
  },
  behavior: {
    init: {
      exposeGlobals: true,
    },
  },
};
