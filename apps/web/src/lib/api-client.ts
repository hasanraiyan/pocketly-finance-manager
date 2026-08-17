import { cookies } from "next/headers";
import { createPocketlyClient } from "@pocketly/sdk";
import { ACCESS_TOKEN_COOKIE_NAME } from "./auth-tokens";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NODE_ENV === "production"
    ? "https://api.pocketly.hasanraiyan.me/api/v1"
    : "http://localhost:4000/api/v1";
}

const baseUrl = getBaseUrl();

/** Unauthenticated client, usable only for public endpoints (e.g. /health). */
export const apiClient = createPocketlyClient({ baseUrl });

/**
 * Authenticated client for Server Components/Actions. Built fresh per call
 * (not a shared singleton) since it carries the current request's token.
 *
 * Reads the access token straight from the cookie `AuthProvider` mirrors it
 * into (see `auth-tokens.ts`) -- Server Components are short-lived, so
 * there's no silent-refresh step here the way the client-side hook has one;
 * a token that's expired by the time this runs just means the SSR fetch
 * 401s, same as any other API error the page already has to handle.
 */
export async function getServerApiClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  return createPocketlyClient({
    baseUrl,
    getToken: async () => token,
  });
}
