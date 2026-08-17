"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export interface ActiveSession {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  isCurrent: boolean;
}

const SESSIONS_QUERY_KEY = ["active-sessions"];

export function useActiveSessions() {
  const client = usePocketlyClient();

  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async (): Promise<ActiveSession[]> => {
      const { data, error } = await client.GET("/auth/sessions");
      if (error) throw error;
      return (data?.data?.items ?? []).map((session) => ({
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
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.add({
        title: "Session revoked",
        description: "That device has been logged out.",
        type: "success",
      });
    },
    onError: () => {
      toast.add({
        title: "Failed to revoke session",
        description: "Please try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useRevokeOtherSessions() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await client.POST("/auth/sessions/revoke-others");
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.add({
        title: "Other devices signed out",
        description: "Only this device stays signed in.",
        type: "success",
      });
    },
    onError: () => {
      toast.add({
        title: "Failed to sign out other devices",
        description: "Please try again in a moment.",
        type: "error",
      });
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
      if (error) throw error;
    },
    onSuccess: () => {
      toast.add({
        title: "Password updated",
        description: "Use your new password next time you sign in.",
        type: "success",
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update password",
        description: "Check your current password and try again.",
        type: "error",
      });
    },
  });
}
