"use client";

import { useEffect, useState } from "react";
import {
  createFetchClient,
  type Middleware,
  type paths,
} from "@pocketly/sdk";
import {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
} from "./auth-token";

export const apiServerOrigin =
  process.env.NEXT_PUBLIC_API_AUTH_URL
    ? process.env.NEXT_PUBLIC_API_AUTH_URL.replace(/\/api\/auth\/?$/, "")
    : (process.env.NEXT_PUBLIC_API_URL
        ? process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "")
        : "http://localhost:4000");

export const authBaseUrl =
  process.env.NEXT_PUBLIC_API_AUTH_URL ?? `${apiServerOrigin}/api/auth`;

export const apiBaseUrl = apiServerOrigin;

const rawClient = createFetchClient<paths>({
  baseUrl: apiServerOrigin,
  credentials: "include",
});

const authSyncMiddleware: Middleware = {
  async onRequest({ request }: { request: Request }) {
    const token = typeof window !== "undefined" ? getStoredAuthToken() : null;
    if (token && !request.headers.has("Authorization")) {
      request.headers.set("Authorization", `Bearer ${token}`);
    }
    return request;
  },
  async onResponse({ response }: { response: Response }) {
    const setAuthToken = response.headers.get("set-auth-token");
    if (setAuthToken && typeof window !== "undefined") {
      setStoredAuthToken(setAuthToken);
    }
    return response;
  },
};

rawClient.use(authSyncMiddleware);

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

export const authClient = {
  signIn: {
    email: async (params: { email: string; password: string }) => {
      const { data, error } = await rawClient.POST("/api/auth/sign-in", {
        body: params,
      });
      if (data?.token) {
        setStoredAuthToken(data.token);
      }
      return {
        data,
        error: error ? { message: (error as any)?.message || "Sign in failed" } : null,
      };
    },
    social: async (params: { provider: "google"; callbackURL?: string }) => {
      const redirect = params.callbackURL || "/dashboard";
      window.location.href = `${authBaseUrl}/google?redirect=${encodeURIComponent(redirect)}`;
    },
    google: async (params?: { callbackURL?: string }) => {
      const redirect = params?.callbackURL || "/dashboard";
      window.location.href = `${authBaseUrl}/google?redirect=${encodeURIComponent(redirect)}`;
    },
  },
  signUp: {
    email: async (params: { email: string; password: string; name: string }) => {
      const { data, error } = await rawClient.POST("/api/auth/sign-up", {
        body: params,
      });
      if (data?.token) {
        setStoredAuthToken(data.token);
      }
      return {
        data,
        error: error ? { message: (error as any)?.message || "Sign up failed" } : null,
      };
    },
  },
  signOut: async () => {
    const { data, error } = await rawClient.POST("/api/auth/sign-out", {});
    clearStoredAuthToken();
    return {
      data,
      error: error ? { message: (error as any)?.message || "Sign out failed" } : null,
    };
  },
  requestPasswordReset: async (params: { email: string; redirectTo?: string }) => {
    const { data, error } = await rawClient.POST("/api/auth/forgot-password", {
      body: { email: params.email },
    });
    return {
      data,
      error: error ? { message: (error as any)?.message || "Password reset failed" } : null,
    };
  },
  forgetPassword: async (params: { email: string; redirectTo?: string }) => {
    const { data, error } = await rawClient.POST("/api/auth/forgot-password", {
      body: { email: params.email },
    });
    return {
      data,
      error: error ? { message: (error as any)?.message || "Password reset failed" } : null,
    };
  },
  resetPassword: async (params: { newPassword: string; token: string }) => {
    const { data, error } = await rawClient.POST("/api/auth/reset-password", {
      body: params,
    });
    return {
      data,
      error: error ? { message: (error as any)?.message || "Reset password failed" } : null,
    };
  },
  verifyEmail: async (params: { token: string }) => {
    const { data, error } = await rawClient.POST("/api/auth/verify-email", {
      body: params,
    });
    if (data?.token) {
      setStoredAuthToken(data.token);
    }
    return {
      data,
      error: error ? { message: (error as any)?.message || "Verification failed" } : null,
    };
  },
  sendVerificationEmail: async (params: { email: string }) => {
    const { data, error } = await rawClient.POST(
      "/api/auth/send-verification-email",
      {
        body: params,
      },
    );
    return {
      data,
      error: error
        ? { message: (error as any)?.message || "Failed to send verification email" }
        : null,
    };
  },
  changePassword: async (params: { currentPassword?: string; newPassword: string }) => {
    const { data, error } = await rawClient.POST("/api/auth/change-password", {
      body: params,
    });
    return {
      data,
      error: error
        ? { message: (error as any)?.message || "Failed to change password" }
        : null,
    };
  },
  getSessions: async () => {
    const { data, error } = await rawClient.GET("/api/auth/sessions");
    return {
      data: data?.items ?? [],
      error: error
        ? { message: (error as any)?.message || "Failed to fetch active sessions" }
        : null,
    };
  },
  revokeSession: async (params: { sessionId: string }) => {
    const { data, error } = await rawClient.POST("/api/auth/sessions/revoke", {
      body: params,
    });
    return {
      data,
      error: error
        ? { message: (error as any)?.message || "Failed to revoke session" }
        : null,
    };
  },
  revokeOtherSessions: async () => {
    const { data, error } = await rawClient.POST("/api/auth/sessions/revoke-others", {});
    return {
      data,
      error: error
        ? { message: (error as any)?.message || "Failed to revoke other sessions" }
        : null,
    };
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
      rawClient
        .GET("/api/auth/session")
        .then((result: any) => {
          if (!isMounted) return;
          const { data, error } = result;
          if (error || !data) {
            setSession({ data: null, isPending: false, error: null });
          } else {
            setSession({ data: data as SessionData, isPending: false, error: null });
          }
        })
        .catch((err: any) => {
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
      const res = await fetch(
        `${authBaseUrl}/oauth2/public-client?client_id=${encodeURIComponent(params.query.client_id)}`,
        { credentials: "include" },
      );
      const data = await res.json().catch(() => null);
      return { data, error: res.ok ? null : data };
    },
    getConsents: async () => {
      const res = await fetch(`${authBaseUrl}/oauth2/get-consents`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => []);
      return { data: (data || []) as ConsentRecord[], error: null };
    },
    deleteConsent: async (params: { id: string }) => {
      const res = await fetch(`${authBaseUrl}/oauth2/delete-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params),
      });
      const data = await res.json().catch(() => null);
      return { data, error: res.ok ? null : data };
    },
  },
};

export const { useSession, signIn, signUp, signOut } = authClient;
