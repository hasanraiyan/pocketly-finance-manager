import { useMemo } from "react";
import { useAuth } from "@clerk/expo";
import { createPocketlyClient } from "@pocketly/sdk";

const baseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Mirrors apps/web/src/lib/use-pocketly-client.ts -- same SDK, same
 * getToken contract, just sourced from @clerk/expo instead of
 * @clerk/nextjs. getToken is called fresh on every request, so the
 * client itself can be memoized safely.
 */
export function usePocketlyClient() {
  const { getToken } = useAuth();
  return useMemo(() => createPocketlyClient({ baseUrl, getToken }), [getToken]);
}
