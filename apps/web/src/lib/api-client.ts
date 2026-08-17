import { cookies } from "next/headers";
import { createPocketlyClient } from "@pocketly/sdk";
import { AUTH_TOKEN_COOKIE_NAME } from "./auth-token";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (process.env.NEXT_PUBLIC_API_AUTH_URL) {
    return process.env.NEXT_PUBLIC_API_AUTH_URL.replace(/\/api\/auth\/?$/, "/api/v1");
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
 * (not a shared singleton) since it carries the current request's bearer
 * token, read from the cookie `auth-client.ts` writes on sign-in.
 */
export async function getServerApiClient() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
    cookieStore.get("pocketly_session")?.value ||
    null;
  return createPocketlyClient({ baseUrl, getToken: async () => token });
}
