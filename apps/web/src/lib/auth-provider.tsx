"use client";

import {
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
  clearAccessTokenCookie,
  clearGuestCookie,
  decodeAccessToken,
  isExpired,
  REFRESH_TOKEN_STORAGE_KEY,
  writeAccessTokenCookie,
  writeGuestCookie,
} from "./auth-tokens";
import { ensureLocalSeedData } from "./local-storage-adapter";

export type SessionUser = components["schemas"]["AuthSessionDto"]["data"]["user"];
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

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
}

/** Unauthenticated -- register/login/refresh/logout never carry a bearer token themselves. */
const authClient = createPocketlyClient({ baseUrl: baseUrl() });

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  isSignedIn: boolean;
  isGuest: boolean;
  /** Returns a live access token, silently refreshing first if the cached one has expired. Null means signed out. */
  getToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Replaces `ClerkProvider`. Holds the access token in memory (mirrored to a
 * cookie so Server Components can read it -- see `auth-tokens.ts`) and the
 * refresh token in `localStorage`, per the chosen "Authorization header +
 * client-managed refresh token" design.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const persist = useCallback((session: Session) => {
    setIsGuest(false);
    setUser(session.user);
    setAccessToken(session.accessToken);
    clearGuestCookie();
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
    writeAccessTokenCookie(session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken);
  }, []);

  const clear = useCallback(() => {
    setIsGuest(false);
    setUser(null);
    setAccessToken(null);
    clearAccessTokenCookie();
    clearGuestCookie();
    if (typeof window !== "undefined") {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }, []);

  const continueAsGuest = useCallback(async () => {
    await ensureLocalSeedData();
    setIsGuest(true);
    setUser(GUEST_USER);
    setAccessToken(null);
    clearAccessTokenCookie();
    writeGuestCookie();
    if (typeof window !== "undefined") {
      localStorage.setItem(GUEST_STORAGE_KEY, "true");
    }
  }, []);

  const exitGuestMode = useCallback(async () => {
    clear();
  }, [clear]);

  /**
   * Refresh tokens rotate on every use, so two concurrent refresh calls
   * would race -- the second would present a token the first already
   * invalidated. Caching the in-flight promise means every caller within
   * the same tick shares one rotation instead of fighting over it.
   */
  const refresh = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      const raw = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!raw) {
        clear();
        return null;
      }
      const { data, error } = await authClient.POST("/auth/refresh", {
        body: { refreshToken: raw },
      });
      if (error || !data) {
        clear();
        return null;
      }
      persist(data.data);
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
    async function initAuth() {
      try {
        const isGuestSaved = localStorage.getItem(GUEST_STORAGE_KEY) === "true";
        if (isGuestSaved) {
          await ensureLocalSeedData();
          setIsGuest(true);
          setUser(GUEST_USER);
          writeGuestCookie();
          setIsLoading(false);
          return;
        }
        await refresh();
      } finally {
        setIsLoading(false);
      }
    }
    void initAuth();
    // Runs once on mount only -- `refresh` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    if (isGuest) return null;
    const decoded = accessToken ? decodeAccessToken(accessToken) : null;
    if (decoded && !isExpired(decoded.exp)) return accessToken;
    return refresh();
  }, [accessToken, isGuest, refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await authClient.POST("/auth/login", {
        body: { email, password },
      });
      if (error) throw new Error("Invalid email or password");
      persist(data.data);
    },
    [persist],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const { data, error } = await authClient.POST("/auth/register", {
        body: { email, password, name },
      });
      if (error) {
        throw new Error(
          (error as { message?: string }).message ?? "Couldn't create your account",
        );
      }
      persist(data.data);
    },
    [persist],
  );

  const logout = useCallback(async () => {
    const raw = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (raw) {
      // Best-effort -- the client-side state clears either way, and a
      // network failure here shouldn't trap the user in a "signed in" UI
      // they can no longer act on.
      await authClient
        .POST("/auth/logout", { body: { refreshToken: raw } })
        .catch(() => undefined);
    }
    clear();
  }, [clear]);

  const isSignedIn = !!user && !isGuest;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isSignedIn,
      isGuest,
      getToken,
      login,
      register,
      continueAsGuest,
      exitGuestMode,
      logout,
    }),
    [
      user,
      isLoading,
      isSignedIn,
      isGuest,
      getToken,
      login,
      register,
      continueAsGuest,
      exitGuestMode,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
