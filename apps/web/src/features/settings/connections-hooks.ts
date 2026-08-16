"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
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
  // The client's inferred response type doesn't resolve `name` correctly
  // for this endpoint; asserting the shape the server actually returns
  // (OAuthClient.name?: string) instead of fighting that inference.
  const name = (data as { name?: string } | null)?.name;
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await authClient.oauth2.deleteConsent({ id });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
      toast.add({
        title: "Disconnected",
        description:
          "It can no longer read or change your data. Already-issued access may take up to an hour to fully expire.",
        type: "success",
        timeout: 5000,
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
