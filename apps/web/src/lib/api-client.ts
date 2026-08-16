import { cookies } from "next/headers";
import { createPocketlyClient } from "@pocketly/sdk";
import { AUTH_TOKEN_COOKIE_NAME } from "./auth-token";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Unauthenticated client, usable only for public endpoints (e.g. /health). */
export const apiClient = createPocketlyClient({ baseUrl });

/**
 * Authenticated client for Server Components/Actions. Built fresh per call
 * (not a shared singleton) since it carries the current request's bearer
 * token, read from the cookie `auth-client.ts` writes on sign-in.
 */
export async function getServerApiClient() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ?? null;
  return createPocketlyClient({ baseUrl, getToken: async () => token });
}
