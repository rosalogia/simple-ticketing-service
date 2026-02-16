import * as Keychain from 'react-native-keychain';

const KEYCHAIN_SERVICE = 'sts-session';

export async function saveToken(token: string): Promise<void> {
  await Keychain.setGenericPassword('session', token, {
    service: KEYCHAIN_SERVICE,
  });
}

export async function loadToken(): Promise<string | null> {
  const creds = await Keychain.getGenericPassword({service: KEYCHAIN_SERVICE});
  return creds ? creds.password : null;
}

export async function clearToken(): Promise<void> {
  await Keychain.resetGenericPassword({service: KEYCHAIN_SERVICE});
}
