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
import { ensureLocalSeedData } from "./local-storage-adapter";
import { safeStorage } from "./safe-storage";
import {
  decodeAccessToken,
  deleteRefreshToken,
  getRefreshToken,
  isExpired,
  saveRefreshToken,
} from "./auth-tokens";

import { queryClient } from "./query-persister";

export type SessionUser =
  components["schemas"]["AuthSessionDto"]["data"]["user"];
type Session = components["schemas"]["AuthSessionDto"]["data"];

const GUEST_STORAGE_KEY = "POCKETLY_GUEST_MODE";

export const GUEST_USER: SessionUser = {
  _id: "local_guest_user",
  name: "Guest User",
  email: "guest@pocketly.local",
  currency: "USD",
  timezone: "UTC",
  role: "user",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

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
  isGuest: boolean;
  /** Returns a live access token, silently refreshing first if the cached one has expired. Null means signed out or guest. */
  getToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  logout: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const persist = useCallback(async (session: Session) => {
    setIsGuest(false);
    setUser(session.user);
    setAccessToken(session.accessToken);
    queryClient.clear();
    await safeStorage.removeItem(GUEST_STORAGE_KEY);
    await saveRefreshToken(session.refreshToken);
  }, []);

  const clear = useCallback(async () => {
    setIsGuest(false);
    setUser(null);
    setAccessToken(null);
    queryClient.clear();
    await safeStorage.removeItem(GUEST_STORAGE_KEY);
    await deleteRefreshToken();
  }, []);

  /**
   * Refresh tokens rotate on every use, so two concurrent refresh calls
   * would race. Caching the in-flight promise means callers share one rotation.
   */
  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      // 1. Check if user is in local guest mode
      const savedGuest = await safeStorage.getItem(GUEST_STORAGE_KEY).catch(() => null);
      if (savedGuest === "true") {
        await ensureLocalSeedData();
        setIsGuest(true);
        setUser(GUEST_USER);
        return null;
      }

      // 2. Check cloud refresh token
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
    if (isGuest) return null;
    const decoded = accessToken ? decodeAccessToken(accessToken) : null;
    if (decoded && !isExpired(decoded.exp)) return accessToken;
    return refresh();
  }, [accessToken, isGuest, refresh]);

  const continueAsGuest = useCallback(async () => {
    queryClient.clear();
    await ensureLocalSeedData();
    await safeStorage.setItem(GUEST_STORAGE_KEY, "true");
    setIsGuest(true);
    setUser(GUEST_USER);
    setAccessToken(null);
  }, []);

  const exitGuestMode = useCallback(async () => {
    queryClient.clear();
    await clear();
  }, [clear]);

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
    if (!isGuest) {
      const raw = await getRefreshToken();
      if (raw) {
        await authClient
          .POST("/auth/logout", { body: { refreshToken: raw } })
          .catch(() => undefined);
      }
    }
    await clear();
  }, [clear, isGuest]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isLoaded: !isLoading,
      isSignedIn: Boolean(user),
      isGuest,
      getToken,
      login,
      register,
      continueAsGuest,
      exitGuestMode,
      logout,
      signOut: logout,
    }),
    [user, isLoading, isGuest, getToken, login, register, continueAsGuest, exitGuestMode, logout],
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
  isGuest: boolean;
} {
  const { user, isLoaded, isSignedIn, isGuest } = useAuth();
  return { user, isLoaded, isSignedIn, isGuest };
}
