import * as Keychain from 'react-native-keychain';
import {saveToken, loadToken, clearToken} from '../../auth/keychain';

const mockKeychain = Keychain as jest.Mocked<typeof Keychain>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('keychain wrapper', () => {
  it('saveToken calls setGenericPassword', async () => {
    await saveToken('session-abc');

    expect(mockKeychain.setGenericPassword).toHaveBeenCalledWith(
      'session',
      'session-abc',
      {service: 'sts-session'},
    );
  });

  it('loadToken returns password from getGenericPassword', async () => {
    mockKeychain.getGenericPassword.mockResolvedValueOnce({
      service: 'sts-session',
      storage: 'keystore',
      username: 'session',
      password: 'tok-123',
    } as any);

    const result = await loadToken();
    expect(result).toBe('tok-123');
  });

  it('loadToken returns null when no credentials', async () => {
    mockKeychain.getGenericPassword.mockResolvedValueOnce(false);

    const result = await loadToken();
    expect(result).toBeNull();
  });

  it('clearToken calls resetGenericPassword', async () => {
    await clearToken();

    expect(mockKeychain.resetGenericPassword).toHaveBeenCalledWith({
      service: 'sts-session',
    });
  });
});
