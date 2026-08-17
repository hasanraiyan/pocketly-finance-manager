"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { toast } from "@/components/ui/toast";

const SESSIONS_QUERY_KEY = ["auth-active-sessions"];

export function useActiveSessions() {
  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await authClient.getSessions();
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      const { error } = await authClient.revokeSession({ sessionId });
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
    onError: (err: any) => {
      toast.add({
        title: "Failed to revoke session",
        description: err?.message || "Please try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useRevokeOtherSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await authClient.revokeOtherSessions();
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.add({
        title: "Signed out other devices",
        description: "All other sessions have been terminated.",
        type: "success",
      });
    },
    onError: (err: any) => {
      toast.add({
        title: "Failed to sign out other devices",
        description: err?.message || "Please try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (params: { currentPassword?: string; newPassword: string }) => {
      const { error } = await authClient.changePassword(params);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.add({
        title: "Password updated",
        description: "Your password has been changed successfully.",
        type: "success",
      });
    },
    onError: (err: any) => {
      toast.add({
        title: "Couldn't update password",
        description: err?.message || "Please check your current password.",
        type: "error",
      });
    },
  });
}
