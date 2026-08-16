"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { createPocketlyClient } from "@pocketly/sdk";

const baseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Client-side Pocketly API client for use in mutations/queries triggered
 * from the browser (not initial SSR data, which goes through
 * `getServerApiClient` instead). `getToken` is called fresh on every
 * request, so the client itself can be memoized safely.
 */
export function usePocketlyClient() {
  const { getToken } = useAuth();
  return useMemo(() => createPocketlyClient({ baseUrl, getToken }), [getToken]);
}
