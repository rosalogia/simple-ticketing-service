import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {Linking} from 'react-native';
import {authApi, setToken, setOnSessionExpired} from '../api/client';
import {createNotificationChannels} from '../notifications/channels';
import {registerDeviceToken, unregisterDeviceToken} from '../notifications/tokenManager';
import {saveToken, loadToken, clearToken} from './keychain';
import type {User} from '../types';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  devMode: boolean;
  discordClientId: string | null;
}

interface AuthContextValue extends AuthState {
  login: () => Promise<void>;
  devLogin: (userId: number) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    user: null,
    devMode: false,
    discordClientId: null,
  });

  const setupNotifications = useCallback(async () => {
    try {
      await createNotificationChannels();
      await registerDeviceToken();
    } catch (err) {
      console.error('Failed to setup notifications:', err);
    }
  }, []);

  const resetAuth = useCallback(() => {
    setToken(null);
    clearToken();
    setState(prev => ({
      ...prev,
      isAuthenticated: false,
      user: null,
      isLoading: false,
    }));
  }, []);

  // Handle session expiry from API client
  useEffect(() => {
    setOnSessionExpired(resetAuth);
  }, [resetAuth]);

  // Handle deep link callback from Discord OAuth
  useEffect(() => {
    const handleUrl = async (event: {url: string}) => {
      const url = event.url;
      // sts://auth/callback?session_id=...
      if (url.startsWith('sts://auth/callback')) {
        const match = url.match(/[?&]session_id=([^&]+)/);
        if (match) {
          try {
            const sessionId = match[1];
            setToken(sessionId);
            await saveToken(sessionId);
            const status = await authApi.getStatus();
            if (status.authenticated && status.user) {
              setState(prev => ({
                ...prev,
                isAuthenticated: true,
                user: status.user,
                isLoading: false,
              }));
              setupNotifications();
            } else {
              resetAuth();
            }
          } catch {
            resetAuth();
          }
        }
      }
    };

    const sub = Linking.addEventListener('url', handleUrl);
    // Check if app was opened via deep link
    Linking.getInitialURL().then(url => {
      if (url) handleUrl({url});
    });

    return () => sub.remove();
  }, [resetAuth, setupNotifications]);

  // Bootstrap: load token from keychain and check auth status
  useEffect(() => {
    (async () => {
      try {
        const token = await loadToken();
        if (token) {
          setToken(token);
          const status = await authApi.getStatus();
          if (status.authenticated && status.user) {
            setState({
              isLoading: false,
              isAuthenticated: true,
              user: status.user,
              devMode: status.dev_mode,
              discordClientId: status.discord_client_id,
            });
            setupNotifications();
            return;
          }
        }
        // No token or session invalid — check if dev mode
        const status = await authApi.getStatus();
        setState({
          isLoading: false,
          isAuthenticated: false,
          user: null,
          devMode: status.dev_mode,
          discordClientId: status.discord_client_id,
        });
      } catch {
        setState(prev => ({...prev, isLoading: false}));
      }
    })();
  }, []);

  const login = useCallback(async () => {
    const {url} = await authApi.getLoginUrl();
    await Linking.openURL(url);
  }, []);

  const devLogin = useCallback(async (userId: number) => {
    const result = await authApi.devLogin(userId);
    setToken(result.session_id);
    await saveToken(result.session_id);
    setState(prev => ({
      ...prev,
      isAuthenticated: true,
      user: result.user,
    }));
    setupNotifications();
  }, [setupNotifications]);

  const logout = useCallback(async () => {
    try {
      await unregisterDeviceToken();
    } catch {
      // ignore
    }
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    resetAuth();
  }, [resetAuth]);

  return (
    <AuthContext.Provider
      value={{...state, login, devLogin, logout}}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
