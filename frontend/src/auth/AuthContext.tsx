import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "../types";
import { authApi, setDevModeUserId, authEvents } from "../api/client";

interface AuthContextValue {
  user: User | null;
  devMode: boolean;
  loading: boolean;
  discordClientId: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  switchDevUser: (id: number) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  devMode: false,
  loading: true,
  discordClientId: null,
  login: async () => {},
  logout: async () => {},
  switchDevUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [discordClientId, setDiscordClientId] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const status = await authApi.getStatus();
      setUser(status.user);
      setDevMode(status.dev_mode);
      setDiscordClientId(status.discord_client_id);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for 401 responses (session expired)
  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
    };
    authEvents.addEventListener("session-expired", handleExpired);
    return () => authEvents.removeEventListener("session-expired", handleExpired);
  }, []);

  const login = useCallback(async () => {
    const { url } = await authApi.getLoginUrl();
    window.location.href = url;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const switchDevUser = useCallback(
    (id: number) => {
      setDevModeUserId(id);
      checkAuth();
    },
    [checkAuth]
  );

  return (
    <AuthContext.Provider
      value={{ user, devMode, loading, discordClientId, login, logout, switchDevUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
