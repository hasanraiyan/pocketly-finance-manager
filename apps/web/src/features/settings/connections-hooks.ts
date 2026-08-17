"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useOAuthConnections() {
  const client = usePocketlyClient();

  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: async (): Promise<OAuthConnection[]> => {
      const { data, error } = await client.GET("/mcp-connections");
      if (error) throw error;
      return data?.data?.items ?? [];
    },
  });
}

export function useDisconnectOAuthClient() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId }: { id: string; clientId: string }) => {
      // Clerk owns the OAuth grant, but an access token already issued to
      // this client stays valid until it expires. This writes Pocketly's own
      // revocation marker (checked by McpAuthGuard on every request), so
      // disconnecting takes effect now rather than up to an hour from now.
      const { error } = await client.DELETE("/mcp-connections/{clientId}", {
        params: { path: { clientId } },
      });
      if (error) throw error;
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
