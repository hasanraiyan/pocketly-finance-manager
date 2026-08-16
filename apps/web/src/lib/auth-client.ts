"use client";

import { createAuthClient } from "better-auth/react";
import {
  getStoredAuthToken,
  setStoredAuthToken,
} from "./auth-token";

const authBaseUrl =
  process.env.NEXT_PUBLIC_API_AUTH_URL ?? "http://localhost:4000/api/auth";

/**
 * Better Auth's server lives in `apps/api`, not here -- this client only
 * talks to it over HTTP. It authenticates every request with the bearer
 * token we store ourselves (see `auth-token.ts`) rather than Better Auth's
 * own session cookie, which sidesteps cross-origin cookie configuration
 * between the web app's origin and the API's origin.
 */
export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  fetchOptions: {
    auth: {
      type: "Bearer",
      token: () => getStoredAuthToken(),
    },
    onSuccess: (ctx) => {
      const token = ctx.response.headers.get("set-auth-token");
      if (token) setStoredAuthToken(token);
    },
  },
});

export const { useSession, signIn, signUp, signOut } = authClient;
