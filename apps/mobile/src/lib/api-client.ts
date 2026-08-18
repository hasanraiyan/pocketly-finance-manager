import { useMemo } from "react";
import { createPocketlyClient } from "@pocketly/sdk";
import { getBaseUrl, useAuth } from "@/lib/auth-provider";

/**
 * Mirrors apps/web/src/lib/use-pocketly-client.ts -- same SDK, same
 * getToken contract, sourced from our own AuthProvider.
 * getToken is called fresh on every request, silently refreshing expired tokens.
 */
export function usePocketlyClient() {
  const { getToken } = useAuth();
  return useMemo(
    () => createPocketlyClient({ baseUrl: getBaseUrl(), getToken }),
    [getToken],
  );
}
