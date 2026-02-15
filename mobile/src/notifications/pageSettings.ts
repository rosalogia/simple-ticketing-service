import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'sts_page_sound_settings';

export interface PageSoundSettings {
  soundEnabled: boolean;
  volume: number;
}

const DEFAULTS: PageSoundSettings = {soundEnabled: true, volume: 100};

export async function getPageSoundSettings(): Promise<PageSoundSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      return {...DEFAULTS, ...JSON.parse(raw)};
    }
  } catch (e) {
    console.error('Failed to read page sound settings:', e);
  }
  return DEFAULTS;
}

export async function setPageSoundSettings(
  settings: Partial<PageSoundSettings>,
): Promise<void> {
  try {
    const current = await getPageSoundSettings();
    await AsyncStorage.setItem(KEY, JSON.stringify({...current, ...settings}));
  } catch (e) {
    console.error('Failed to save page sound settings:', e);
  }
}
