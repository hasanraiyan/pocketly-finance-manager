"use client";

import { useMemo } from "react";
import { createPocketlyClient } from "@pocketly/sdk";
import { getStoredAuthToken } from "./auth-token";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Client-side Pocketly API client for use in mutations/queries triggered
 * from the browser (not initial SSR data, which goes through
 * `getServerApiClient` instead). `getToken` reads the bearer token cookie
 * fresh on every request, so the client itself can be memoized once.
 */
export function usePocketlyClient() {
  return useMemo(
    () =>
      createPocketlyClient({
        baseUrl,
        getToken: async () => getStoredAuthToken() ?? null,
      }),
    [],
  );
}
