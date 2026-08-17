"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { toast } from "@/components/ui/toast";

export type AdminAnalytics =
  components["schemas"]["AdminAnalyticsDto"]["data"];
export type AdminFeedbackItem =
  components["schemas"]["AdminFeedbackListDto"]["data"]["items"][number];
export type AdminUpdateFeedbackInput =
  components["schemas"]["AdminUpdateFeedbackDto"];
export type AdminAuditLogItem =
  components["schemas"]["AdminAuditLogListDto"]["data"]["items"][number];
export type AdminUserItem =
  components["schemas"]["AdminUserListDto"]["data"]["items"][number];

export const ADMIN_ANALYTICS_KEY = ["admin-analytics"] as const;
export const ADMIN_FEEDBACK_KEY = ["admin-feedback"] as const;
export const ADMIN_AUDIT_LOGS_KEY = ["admin-audit-logs"] as const;
export const ADMIN_USERS_KEY = ["admin-users"] as const;

export function useAdminAnalytics(initialData?: AdminAnalytics) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: ADMIN_ANALYTICS_KEY,
    queryFn: async () => {
      const { data, error } = await client.GET("/admin/analytics");
      if (error) throw error;
      return data.data;
    },
    initialData,
  });
}

export function useAdminFeedbackList(
  query: {
    category?: AdminFeedbackItem["category"];
    status?: AdminFeedbackItem["status"];
    type?: "feedback" | "feature_request";
    search?: string;
    sortBy?: "recent" | "upvotes";
    limit?: number;
    offset?: number;
  } = {},
  initialData?: AdminFeedbackItem[],
) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: [...ADMIN_FEEDBACK_KEY, query],
    queryFn: async () => {
      const { data, error } = await client.GET("/admin/feedback", {
        params: { query },
      });
      if (error) throw error;
      return data.data;
    },
    initialData: initialData
      ? {
          items: initialData,
          nextCursor: null,
        }
      : undefined,
  });
}

export function useAdminUpdateFeedback() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: AdminUpdateFeedbackInput;
    }) => {
      const { data, error } = await client.PATCH("/admin/feedback/{id}", {
        params: { path: { id } },
        body: input,
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_FEEDBACK_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_ANALYTICS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_AUDIT_LOGS_KEY });
      toast.add({
        title: "Feedback updated",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update feedback",
        type: "error",
      });
    },
  });
}

export function useAdminDeleteFeedback() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.DELETE("/admin/feedback/{id}", {
        params: { path: { id } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_FEEDBACK_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_ANALYTICS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_AUDIT_LOGS_KEY });
      toast.add({
        title: "Feedback item removed",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't delete feedback",
        type: "error",
      });
    },
  });
}

export function useAdminAuditLogs(query: { action?: string; limit?: number; offset?: number } = {}) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: [...ADMIN_AUDIT_LOGS_KEY, query],
    queryFn: async () => {
      const { data, error } = await client.GET("/admin/audit-logs", {
        params: { query },
      });
      if (error) throw error;
      return data.data;
    },
  });
}

export function useAdminUsers(query: { search?: string; limit?: number; offset?: number } = {}) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, query],
    queryFn: async () => {
      const { data, error } = await client.GET("/admin/users", {
        params: { query },
      });
      if (error) throw error;
      return data.data;
    },
  });
}

export function useAdminUpdateUserRole() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      role,
    }: {
      id: string;
      role: "user" | "admin";
    }) => {
      const { data, error } = await client.PATCH("/admin/users/{id}/role", {
        params: { path: { id } },
        body: { role },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      queryClient.invalidateQueries({ queryKey: ADMIN_AUDIT_LOGS_KEY });
      toast.add({
        title: "User role updated",
        type: "success",
        timeout: 3000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't update user role",
        type: "error",
      });
    },
  });
}
