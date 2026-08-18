"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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

export interface AdminPage<T> {
  items: T[];
  nextCursor: string | null;
}

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

export interface AdminFeedbackFilters {
  category?: AdminFeedbackItem["category"];
  status?: AdminFeedbackItem["status"];
  type?: "feedback" | "feature_request";
  search?: string;
  sortBy?: "recent" | "upvotes";
}

function adminFeedbackKey(filters: AdminFeedbackFilters) {
  return [...ADMIN_FEEDBACK_KEY, filters] as const;
}

export function useAdminFeedbackList(filters: AdminFeedbackFilters = {}) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: adminFeedbackKey(filters),
    queryFn: async (): Promise<AdminPage<AdminFeedbackItem>> => {
      const { data, error } = await client.GET("/admin/feedback", {
        params: { query: { ...filters, limit: 20 } },
      });
      if (error) throw error;
      return { items: data.data.items, nextCursor: data.data.nextCursor };
    },
    placeholderData: keepPreviousData,
  });
}

export function useLoadMoreAdminFeedback(filters: AdminFeedbackFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = adminFeedbackKey(filters);
  return useMutation({
    mutationFn: async (cursor: string) => {
      const { data, error } = await client.GET("/admin/feedback", {
        params: { query: { ...filters, cursor, limit: 20 } },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (page) => {
      queryClient.setQueryData<AdminPage<AdminFeedbackItem>>(key, (old) => ({
        items: [...(old?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      }));
    },
    onError: () => {
      toast.add({
        title: "Couldn't load more feedback",
        description: "Try again in a moment.",
        type: "error",
      });
    },
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

export interface AdminAuditLogFilters {
  action?: string;
}

function adminAuditLogsKey(filters: AdminAuditLogFilters) {
  return [...ADMIN_AUDIT_LOGS_KEY, filters] as const;
}

export function useAdminAuditLogs(filters: AdminAuditLogFilters = {}) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: adminAuditLogsKey(filters),
    queryFn: async (): Promise<AdminPage<AdminAuditLogItem>> => {
      const { data, error } = await client.GET("/admin/audit-logs", {
        params: { query: { ...filters, limit: 20 } },
      });
      if (error) throw error;
      return { items: data.data.items, nextCursor: data.data.nextCursor };
    },
    placeholderData: keepPreviousData,
  });
}

export function useLoadMoreAdminAuditLogs(filters: AdminAuditLogFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = adminAuditLogsKey(filters);
  return useMutation({
    mutationFn: async (cursor: string) => {
      const { data, error } = await client.GET("/admin/audit-logs", {
        params: { query: { ...filters, cursor, limit: 20 } },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (page) => {
      queryClient.setQueryData<AdminPage<AdminAuditLogItem>>(key, (old) => ({
        items: [...(old?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      }));
    },
    onError: () => {
      toast.add({
        title: "Couldn't load more audit entries",
        description: "Try again in a moment.",
        type: "error",
      });
    },
  });
}

export interface AdminUserFilters {
  search?: string;
}

function adminUsersKey(filters: AdminUserFilters) {
  return [...ADMIN_USERS_KEY, filters] as const;
}

export function useAdminUsers(filters: AdminUserFilters = {}) {
  const client = usePocketlyClient();
  return useQuery({
    queryKey: adminUsersKey(filters),
    queryFn: async (): Promise<AdminPage<AdminUserItem>> => {
      const { data, error } = await client.GET("/admin/users", {
        params: { query: { ...filters, limit: 20 } },
      });
      if (error) throw error;
      return { items: data.data.items, nextCursor: data.data.nextCursor };
    },
    placeholderData: keepPreviousData,
  });
}

export function useLoadMoreAdminUsers(filters: AdminUserFilters) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();
  const key = adminUsersKey(filters);
  return useMutation({
    mutationFn: async (cursor: string) => {
      const { data, error } = await client.GET("/admin/users", {
        params: { query: { ...filters, cursor, limit: 20 } },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: (page) => {
      queryClient.setQueryData<AdminPage<AdminUserItem>>(key, (old) => ({
        items: [...(old?.items ?? []), ...page.items],
        nextCursor: page.nextCursor,
      }));
    },
    onError: () => {
      toast.add({
        title: "Couldn't load more users",
        description: "Try again in a moment.",
        type: "error",
      });
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
