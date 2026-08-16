import { createPocketlyClient } from '@pocketly/sdk';

/**
 * Unauthenticated client, usable for public endpoints (e.g. /health).
 * Once Clerk is wired into this app, add a `getToken` per-request/per-user
 * (server components should not share a single authenticated client instance).
 */
export const apiClient = createPocketlyClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
});
