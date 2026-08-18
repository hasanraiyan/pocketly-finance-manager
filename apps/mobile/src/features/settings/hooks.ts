import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import { clearAllLocalGuestData } from "@/lib/local-storage-adapter";
import { safeStorage } from "@/lib/safe-storage";

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

const GUEST_PROFILE_STORAGE_KEY = "POCKETLY_GUEST_PROFILE";

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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: [...USER_PROFILE_KEY, isGuest],
    queryFn: async (): Promise<UserProfile> => {
      if (isGuest) {
        const saved = await safeStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
        return {
          _id: "local_guest_user",
          name: "Guest User",
          email: "guest@pocketly.local",
          currency: "USD",
          timezone: "UTC",
          role: "user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UserProfile;
      }

      const { data, error } = await client.GET("/users/me");
      if (error || !data) {
        throw new Error("Failed to load user profile");
      }
      return data.data;
    },
  });
}

export function useUpdateProfile() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput): Promise<UserProfile> => {
      if (isGuest) {
        const currentRaw = await safeStorage.getItem(GUEST_PROFILE_STORAGE_KEY);
        const current: UserProfile = currentRaw
          ? JSON.parse(currentRaw)
          : {
              _id: "local_guest_user",
              name: "Guest User",
              email: "guest@pocketly.local",
              currency: "USD",
              timezone: "UTC",
              role: "user",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

        const updated: UserProfile = {
          ...current,
          name: input.name ?? current.name,
          currency: input.currency ?? current.currency,
          updatedAt: new Date().toISOString(),
        };

        await safeStorage.setItem(GUEST_PROFILE_STORAGE_KEY, JSON.stringify(updated));
        return updated;
      }

      const { data, error } = await client.PATCH("/users/me", {
        body: input,
      });
      if (error || !data) {
        throw new Error("Failed to update profile");
      }
      return data.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData([...USER_PROFILE_KEY, isGuest], updated);
      queryClient.invalidateQueries({ queryKey: USER_PROFILE_KEY });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["analysis"] });
    },
  });
}

export function useActiveSessions() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: [...SESSIONS_QUERY_KEY, isGuest],
    queryFn: async (): Promise<ActiveSession[]> => {
      if (isGuest) {
        return [
          {
            id: "local_device",
            userAgent: "Current Device (Offline Guest Mode)",
            ipAddress: "Local",
            createdAt: new Date().toISOString(),
            isCurrent: true,
          },
        ];
      }

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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      if (isGuest) return;
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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (isGuest) return;
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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useQuery({
    queryKey: [...CONNECTIONS_QUERY_KEY, isGuest],
    queryFn: async (): Promise<OAuthConnection[]> => {
      if (isGuest) return [];
      const { data, error } = await client.GET("/mcp-connections");
      if (error || !data) {
        return [];
      }
      return data.data?.items ?? [];
    },
  });
}

export function useDisconnectOAuthClient() {
  const { isGuest } = useAuth();
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ clientId }: { clientId: string }) => {
      if (isGuest) return;
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
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  return useMutation({
    mutationFn: async (params: {
      currentPassword: string;
      newPassword: string;
    }) => {
      if (isGuest) {
        throw new Error("Password management requires a cloud account. Please sign up to secure your account.");
      }
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
  const { isGuest, exitGuestMode } = useAuth();
  const client = usePocketlyClient();

  return useMutation({
    mutationFn: async () => {
      if (isGuest) {
        await clearAllLocalGuestData();
        await exitGuestMode();
        return;
      }
      const { error } = await client.DELETE("/users/me", {
        body: { confirm: true },
      });
      if (error) {
        throw new Error("Failed to delete account");
      }
    },
  });
}
