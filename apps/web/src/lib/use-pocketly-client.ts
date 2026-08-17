"use client";

import { useMemo } from "react";
import { createPocketlyClient } from "@pocketly/sdk";
import { useAuth } from "./auth-provider";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Client-side Pocketly API client for mutations/queries triggered from the
 * browser (not initial SSR data, which goes through `getServerApiClient`).
 * `getToken` (from `AuthProvider`) silently refreshes an expired access
 * token before returning it, which is what lets the client itself be
 * memoized on a stable reference. Mirrors apps/mobile/src/lib/api-client.ts.
 */
export function usePocketlyClient() {
  const { getToken } = useAuth();
  return useMemo(() => createPocketlyClient({ baseUrl, getToken }), [getToken]);
}
