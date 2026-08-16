"use client";

import { createAuthClient } from "better-auth/react";
import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import {
  getStoredAuthToken,
  setStoredAuthToken,
} from "./auth-token";

export const authBaseUrl =
  process.env.NEXT_PUBLIC_API_AUTH_URL ?? "http://localhost:4000/api/auth";

/**
 * Better Auth's server lives in `apps/api`, not here -- this client only
 * talks to it over HTTP. Every request is authenticated with the bearer
 * token we store ourselves (see `auth-token.ts`), which is what the rest
 * of the app relies on. `credentials: "include"` additionally lets Better
 * Auth's own session cookie ride along: web and api are same-site (same
 * registrable domain, different port/subdomain), so a Lax cookie set here
 * is still sent on credentialed cross-origin requests -- this is what lets
 * the MCP OAuth login/consent pages (see app/sign-in and app/mcp-connect)
 * resolve an existing session without a second sign-in. Only breaks if web
 * and api ever end up on genuinely unrelated domains in production.
 */
export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  // Adds authClient.oauth2.* (getConsents, deleteConsent, publicClient) --
  // used by the Settings page's "Connected apps" list, so a user can see
  // and revoke MCP clients (Claude Code, Claude Desktop, ...) they've
  // authorized.
  plugins: [oauthProviderClient()],
  fetchOptions: {
    credentials: "include",
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
