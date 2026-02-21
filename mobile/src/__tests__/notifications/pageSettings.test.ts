import AsyncStorage from '@react-native-async-storage/async-storage';
import {getPageSoundSettings, setPageSoundSettings} from '../../notifications/pageSettings';

beforeEach(() => {
  AsyncStorage.clear();
});

describe('Page sound settings', () => {
  it('returns defaults when nothing stored', async () => {
    const settings = await getPageSoundSettings();
    expect(settings).toEqual({soundEnabled: true, volume: 100});
  });

  it('setPageSoundSettings merges with existing', async () => {
    await setPageSoundSettings({volume: 50});

    const settings = await getPageSoundSettings();
    expect(settings).toEqual({soundEnabled: true, volume: 50});
  });

  it('returns stored values after set', async () => {
    await setPageSoundSettings({soundEnabled: false, volume: 75});

    const settings = await getPageSoundSettings();
    expect(settings).toEqual({soundEnabled: false, volume: 75});
  });

  it('handles AsyncStorage errors gracefully (returns defaults)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
      new Error('Storage error'),
    );

    const settings = await getPageSoundSettings();
    expect(settings).toEqual({soundEnabled: true, volume: 100});
    spy.mockRestore();
  });
});
