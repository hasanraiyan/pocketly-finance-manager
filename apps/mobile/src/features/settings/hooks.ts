import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

export type UpdateProfileInput = components["schemas"]["UpdateProfileDto"];
export type UserProfile = components["schemas"]["UserDto"]["data"];

export interface ActiveSession {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface OAuthConnection {
  id: string;
  clientId: string;
  clientName: string;
  scopes: string[];
  createdAt: string;
}

export const USER_PROFILE_KEY = ["user-profile"] as const;
export const SESSIONS_QUERY_KEY = ["active-sessions"] as const;
export const CONNECTIONS_QUERY_KEY = ["oauth-connections"] as const;

export const SUPPORTED_CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "CAD", symbol: "CA$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "AU$", label: "AUD ($) - Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { code: "SGD", symbol: "S$", label: "SGD ($) - Singapore Dollar" },
  { code: "CHF", symbol: "CHF", label: "CHF - Swiss Franc" },
];

export const SCOPE_LABELS: Record<string, string> = {
  "pocketly:read": "View your financial data",
  "pocketly:write": "Create, edit, and delete records",
  openid: "Confirm identity",
  profile: "Read profile name",
  email: "Read email address",
  offline_access: "Stay connected between sessions",
};

export function useUserProfile() {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: USER_PROFILE_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/users/me");
      if (error || !data) {
        throw new Error("Failed to load user profile");
      }
      return data.data;
    },
  });
}

export function useUpdateProfile() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data, error } = await client.PATCH("/users/me", {
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to update profile");
      }
      return data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(USER_PROFILE_KEY, updated);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}

export function useActiveSessions() {
  const client = usePocketlyClient();

  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async (): Promise<ActiveSession[]> => {
      const { data, error } = await client.GET("/auth/sessions");
      if (error || !data) {
        throw new Error("Failed to load active sessions");
      }
      return (data.data?.items ?? []).map((session) => ({
        id: session._id,
        userAgent: session.userAgent ?? undefined,
        ipAddress: session.ipAddress ?? undefined,
        createdAt: session.createdAt,
        isCurrent: session.current,
      }));
    },
  });
}

export function useRevokeSession() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await client.DELETE("/auth/sessions/{id}", {
        params: { path: { id: sessionId } },
      });
      if (error) {
        throw new Error("Failed to revoke session");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}

export function useRevokeOtherSessions() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client.POST("/auth/sessions/revoke-others");
      if (error) {
        throw new Error("Failed to revoke other sessions");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
    },
  });
}

export function useOAuthConnections() {
  const client = usePocketlyClient();

  return useQuery({
    queryKey: CONNECTIONS_QUERY_KEY,
    queryFn: async (): Promise<OAuthConnection[]> => {
      const { data, error } = await client.GET("/mcp-connections");
      if (error || !data) {
        return [];
      }
      return data.data?.items ?? [];
    },
  });
}

export function useDisconnectOAuthClient() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId }: { clientId: string }) => {
      const { error } = await client.DELETE("/mcp-connections/{clientId}", {
        params: { path: { clientId } },
      });
      if (error) {
        throw new Error("Failed to disconnect client");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_QUERY_KEY });
    },
  });
}

export function useChangePassword() {
  const client = usePocketlyClient();

  return useMutation({
    mutationFn: async (params: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const { error } = await client.PATCH("/auth/password", {
        body: params,
      });
      if (error) {
        throw new Error("Incorrect current password or invalid new password.");
      }
    },
  });
}

export function useDeleteMyAccount() {
  const client = usePocketlyClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client.DELETE("/users/me", {
        body: { confirm: true },
      });
      if (error) {
        throw new Error("Failed to delete account");
      }
    },
  });
}
