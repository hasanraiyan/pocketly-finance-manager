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
  decodeAccessToken,
  isExpired,
  REFRESH_TOKEN_STORAGE_KEY,
  writeAccessTokenCookie,
} from "./auth-tokens";

export type SessionUser = components["schemas"]["AuthSessionDto"]["data"]["user"];
type Session = components["schemas"]["AuthSessionDto"]["data"];

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
}

/** Unauthenticated -- register/login/refresh/logout never carry a bearer token themselves. */
const authClient = createPocketlyClient({ baseUrl: baseUrl() });

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  /** Returns a live access token, silently refreshing first if the cached one has expired. Null means signed out. */
  getToken: () => Promise<string | null>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Replaces `ClerkProvider`. Holds the access token in memory (mirrored to a
 * cookie so Server Components can read it -- see `auth-tokens.ts`) and the
 * refresh token in `localStorage`, per the chosen "Authorization header +
 * client-managed refresh token" design.
 *
 * Refreshes unconditionally on mount rather than trusting a possibly-stale
 * access-token cookie: one extra rotation per page load is cheap, and it's
 * what makes the browser reload self-heal if the cookie and localStorage
 * ever fall out of sync (e.g. the cookie was cleared but the refresh token
 * wasn't, or vice versa).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const persist = useCallback((session: Session) => {
    setUser(session.user);
    setAccessToken(session.accessToken);
    writeAccessTokenCookie(session.accessToken);
    localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, session.refreshToken);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    clearAccessTokenCookie();
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
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
    void refresh().finally(() => setIsLoading(false));
    // Runs once on mount only -- `refresh` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, getToken, login, register, logout }),
    [user, isLoading, getToken, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
