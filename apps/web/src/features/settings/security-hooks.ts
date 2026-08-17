"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useReverification, useSession, useUser } from "@clerk/nextjs";
import { toast } from "@/components/ui/toast";

export interface ActiveSession {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  isCurrent: boolean;
}

const SESSIONS_QUERY_KEY = ["clerk-active-sessions"];

/**
 * Clerk's own session list, reshaped into what the Settings UI already
 * renders. `user.getSessions()` (rather than `useSessionList`) is what
 * returns sessions carrying device activity and a `revoke()`.
 */
export function useActiveSessions() {
  const { user } = useUser();
  const { session: currentSession } = useSession();

  return useQuery({
    queryKey: SESSIONS_QUERY_KEY,
    enabled: Boolean(user),
    queryFn: async (): Promise<ActiveSession[]> => {
      if (!user) return [];
      const sessions = await user.getSessions();

      return sessions.map((session) => {
        const activity = session.latestActivity;
        const label = [activity?.browserName, activity?.deviceType]
          .filter(Boolean)
          .join(" ");

        return {
          id: session.id,
          userAgent: label || undefined,
          ipAddress: activity?.ipAddress ?? undefined,
          createdAt: (session.lastActiveAt ?? new Date()).toString(),
          isCurrent: session.id === currentSession?.id,
        };
      });
    },
  });
}

export function useRevokeSession() {
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string }) => {
      if (!user) throw new Error("You need to be signed in.");
      const sessions = await user.getSessions();
      const session = sessions.find((item) => item.id === sessionId);
      if (!session) throw new Error("That session is no longer active.");
      await session.revoke();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.add({
        title: "Session revoked",
        description: "That device has been logged out.",
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Failed to revoke session",
        description: err.message || "Please try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useRevokeOtherSessions() {
  const { user } = useUser();
  const { session: currentSession } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You need to be signed in.");
      const sessions = await user.getSessions();
      await Promise.all(
        sessions
          .filter((session) => session.id !== currentSession?.id)
          .map((session) => session.revoke()),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_QUERY_KEY });
      toast.add({
        title: "Other devices signed out",
        description: "Only this device stays signed in.",
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Failed to sign out other devices",
        description: err.message || "Please try again in a moment.",
        type: "error",
      });
    },
  });
}

export function useChangePassword() {
  const { user } = useUser();
  // Clerk can require re-verification before a password change; this wrapper
  // surfaces that prompt instead of failing with an opaque error.
  const updatePassword = useReverification(
    (params: { currentPassword?: string; newPassword: string }) => {
      if (!user) throw new Error("You need to be signed in.");
      return user.updatePassword({
        currentPassword: params.currentPassword,
        newPassword: params.newPassword,
        signOutOfOtherSessions: false,
      });
    },
  );

  return useMutation({
    mutationFn: async (params: {
      currentPassword?: string;
      newPassword: string;
    }) => {
      await updatePassword(params);
    },
    onSuccess: () => {
      toast.add({
        title: "Password updated",
        description: "Use your new password next time you sign in.",
        type: "success",
      });
    },
    onError: (err: Error) => {
      toast.add({
        title: "Couldn't update password",
        description: err.message || "Please try again in a moment.",
        type: "error",
      });
    },
  });
}
