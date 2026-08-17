"use client";

import { useEffect, useState } from "react";
import {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
} from "./auth-token";

export const authBaseUrl =
  process.env.NEXT_PUBLIC_API_AUTH_URL ?? "http://localhost:4000/api/auth";

export interface SessionData {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  session?: {
    id: string;
    userId: string;
    expiresAt: string;
  };
}

export interface ConsentRecord {
  id: string;
  clientId: string;
  scopes: string[];
  createdAt: string | Date;
}

async function authFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: { message: string } | null }> {
  const token = typeof window !== "undefined" ? getStoredAuthToken() : null;
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    const res = await fetch(`${authBaseUrl}${path}`, {
      ...options,
      headers,
      credentials: "include",
    });

    const setAuthToken = res.headers.get("set-auth-token");
    if (setAuthToken && typeof window !== "undefined") {
      setStoredAuthToken(setAuthToken);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = data?.message || data?.error || "An error occurred";
      return {
        data: null,
        error: {
          message: Array.isArray(errorMsg) ? errorMsg.join(", ") : String(errorMsg),
        },
      };
    }

    return { data, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: { message: err?.message || "Network error" },
    };
  }
}

export const authClient = {
  signIn: {
    email: async (params: { email: string; password: string }) => {
      const result = await authFetch<{ token: string; user: any; session: any }>("/sign-in", {
        method: "POST",
        body: JSON.stringify(params),
      });
      if (result.data?.token) {
        setStoredAuthToken(result.data.token);
      }
      return result;
    },
  },
  signUp: {
    email: async (params: { email: string; password: string; name: string }) => {
      const result = await authFetch<{ token: string; user: any; session: any }>("/sign-up", {
        method: "POST",
        body: JSON.stringify(params),
      });
      if (result.data?.token) {
        setStoredAuthToken(result.data.token);
      }
      return result;
    },
  },
  signOut: async () => {
    const result = await authFetch("/sign-out", {
      method: "POST",
    });
    clearStoredAuthToken();
    return result;
  },
  requestPasswordReset: async (params: { email: string; redirectTo?: string }) => {
    return authFetch("/forgot-password", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  forgetPassword: async (params: { email: string; redirectTo?: string }) => {
    return authFetch("/forgot-password", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  verifyEmail: async (params: { token: string }) => {
    const result = await authFetch<{ token: string; user: any; session: any }>(
      "/verify-email",
      {
        method: "POST",
        body: JSON.stringify(params),
      },
    );
    if (result.data?.token) {
      setStoredAuthToken(result.data.token);
    }
    return result;
  },
  sendVerificationEmail: async (params: { email: string }) => {
    return authFetch("/send-verification-email", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },
  useSession: () => {
    const [session, setSession] = useState<{
      data: SessionData | null;
      isPending: boolean;
      error: Error | null;
    }>({
      data: null,
      isPending: true,
      error: null,
    });

    useEffect(() => {
      let isMounted = true;
      authFetch<SessionData>("/session", { method: "GET" })
        .then(({ data, error }) => {
          if (!isMounted) return;
          if (error || !data) {
            setSession({ data: null, isPending: false, error: null });
          } else {
            setSession({ data, isPending: false, error: null });
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setSession({ data: null, isPending: false, error: err });
        });

      return () => {
        isMounted = false;
      };
    }, []);

    return session;
  },
  oauth2: {
    publicClient: async (params: { query: { client_id: string } }) => {
      return authFetch<{ client_name?: string }>(
        `/oauth2/public-client?client_id=${encodeURIComponent(params.query.client_id)}`,
        { method: "GET" },
      );
    },
    getConsents: async () => {
      return authFetch<ConsentRecord[]>("/oauth2/get-consents", { method: "GET" });
    },
    deleteConsent: async (params: { id: string }) => {
      return authFetch("/oauth2/delete-consent", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
  },
};

export const { useSession, signIn, signUp, signOut } = authClient;
