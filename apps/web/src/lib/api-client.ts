import { auth } from "@clerk/nextjs/server";
import { createPocketlyClient } from "@pocketly/sdk";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/** Unauthenticated client, usable only for public endpoints (e.g. /health). */
export const apiClient = createPocketlyClient({ baseUrl });

/**
 * Authenticated client for Server Components/Actions. Built fresh per call
 * (not a shared singleton) since it carries the current request's user
 * session via Clerk's `auth()`.
 */
export async function getServerApiClient() {
  const { getToken } = await auth();
  return createPocketlyClient({ baseUrl, getToken });
}
