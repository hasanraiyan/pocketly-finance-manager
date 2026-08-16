"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export interface OAuthConnection {
  id: string;
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt: string;
}

const CONNECTIONS_QUERY_KEY = ["oauth-connections"];

async function resolveClientName(clientId: string): Promise<string> {
  const { data } = await authClient.oauth2.publicClient({
    query: { client_id: clientId },
  });
  // The public-client endpoint returns RFC 7591-style field names
  // (client_name, not name) -- confirmed by reading schemaToOAuth's
  // mapping directly, since the client's inferred response type doesn't
  // resolve this correctly on its own.
  const name = (data as { client_name?: string } | null)?.client_name;
  return name ?? clientId;
}

export function useOAuthConnections() {
  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: async (): Promise<OAuthConnection[]> => {
      const { data, error } = await authClient.oauth2.getConsents();
      if (error) throw error;
      const consents = data ?? [];
      return Promise.all(
        consents.map(async (consent) => ({
          id: consent.id,
          clientId: consent.clientId,
          scopes: consent.scopes,
          createdAt: String(consent.createdAt),
          clientName: await resolveClientName(consent.clientId).catch(
            () => consent.clientId,
          ),
        })),
      );
    },
  });
}

export function useDisconnectOAuthClient() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      // Deleting the consent blocks a future silent re-authorization: on
      // its own it does NOT invalidate an already-issued access token
      // (Better Auth doesn't check consent existence on token refresh/use,
      // and JWTs have no server-side revocation list). The second call is
      // Pocketly's own instant-revocation deny-list (see McpAuthGuard) --
      // together these make disconnecting take effect immediately, not
      // just for future connections.
      const [{ error: consentError }, { error: revokeError }] =
        await Promise.all([
          authClient.oauth2.deleteConsent({ id }),
          client.DELETE("/mcp-connections/{clientId}", {
            params: { path: { clientId } },
          }),
        ]);
      if (consentError) throw consentError;
      if (revokeError) throw revokeError;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
      toast.add({
        title: "Disconnected",
        description: "It can no longer read or change your data.",
        type: "success",
        timeout: 4000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't disconnect",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}
