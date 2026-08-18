import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPocketlyClient, type components } from "@pocketly/sdk";
import {
  decodeAccessToken,
  deleteRefreshToken,
  getRefreshToken,
  isExpired,
  saveRefreshToken,
} from "./auth-tokens";

export type SessionUser =
  components["schemas"]["AuthSessionDto"]["data"]["user"];
type Session = components["schemas"]["AuthSessionDto"]["data"];

export function getBaseUrl(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ?? "https://api.pocketly.hasanraiyan.me/api/v1"
  );
}

/** Unauthenticated -- register/login/refresh/logout never carry a bearer token themselves. */
const authClient = createPocketlyClient({ baseUrl: getBaseUrl() });

export interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  /** Returns a live access token, silently refreshing first if the cached one has expired. Null means signed out. */
  getToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const persist = useCallback(async (session: Session) => {
    setUser(session.user);
    setAccessToken(session.accessToken);
    await saveRefreshToken(session.refreshToken);
  }, []);

  const clear = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
    await deleteRefreshToken();
  }, []);

  /**
   * Refresh tokens rotate on every use, so two concurrent refresh calls
   * would race -- the second would present a token the first already
   * invalidated. Caching the in-flight promise means every caller within
   * the same tick shares one rotation instead of fighting over it.
   */
  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      const raw = await getRefreshToken();
      if (!raw) {
        await clear();
        return null;
      }
      const { data, error } = await authClient.POST("/auth/refresh", {
        body: { refreshToken: raw },
      });
      if (error || !data) {
        await clear();
        return null;
      }
      await persist(data.data);
      return data.data.accessToken;
    })();

    refreshInFlight.current = run;
    try {
      return await run;
    } finally {
      refreshInFlight.current = null;
    }
  }, [clear, persist]);

  useEffect(() => {
    void refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const getToken = useCallback(async (): Promise<string | null> => {
    const decoded = accessToken ? decodeAccessToken(accessToken) : null;
    if (decoded && !isExpired(decoded.exp)) return accessToken;
    return refresh();
  }, [accessToken, refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await authClient.POST("/auth/login", {
        body: { email, password },
      });
      if (error || !data) {
        const message =
          (error as { message?: string })?.message ??
          "Invalid email or password";
        throw new Error(message);
      }
      await persist(data.data);
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await authClient.POST("/auth/register", {
        body: { email, password, name },
      });
      if (error || !data) {
        const message =
          (error as { message?: string })?.message ??
          "Couldn't create your account";
        throw new Error(message);
      }
      await persist(data.data);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const raw = await getRefreshToken();
    if (raw) {
      await authClient
        .POST("/auth/logout", { body: { refreshToken: raw } })
        .catch(() => undefined);
    }
    await clear();
  }, [clear]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isLoaded: !isLoading,
      isSignedIn: Boolean(user),
      getToken,
      login,
      register,
      logout,
      signOut: logout,
    }),
    [user, isLoading, getToken, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function useUser(): {
  user: SessionUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
} {
  const { user, isLoaded, isSignedIn } = useAuth();
  return { user, isLoaded, isSignedIn };
}
