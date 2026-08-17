import { auth } from "@clerk/nextjs/server";
import { createPocketlyClient } from "@pocketly/sdk";

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
 * (not a shared singleton) since it carries the current request's Clerk
 * session token.
 */
export async function getServerApiClient() {
  const { getToken } = await auth();
  return createPocketlyClient({ baseUrl, getToken });
}
