"use client";

import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { requestPushPermissionAndGetToken, onForegroundMessage } from "@/lib/firebase";
import { toast } from "@/components/ui/toast";

export type NotificationItem =
  components["schemas"]["NotificationListDto"]["data"]["items"][number];

export const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications(unreadOnly = false) {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  // Listen to incoming foreground FCM messages
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || "New notification";
      const description = payload.notification?.body || payload.data?.body;
      toast.add({
        title,
        description,
        type: "info",
        timeout: 5000,
      });
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { unreadOnly }],
    queryFn: async () => {
      const { data, error } = await client.GET("/notifications", {
        params: { query: { limit: 20, page: 1, unreadOnly } },
      });
      if (error) throw error;
      return data.data;
    },
    refetchInterval: 30_000, // Poll every 30 seconds as background sync
  });
}

export function useMarkNotificationRead() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await client.PATCH("/notifications/{id}/read", {
        params: { path: { id } },
      });
      if (error) throw error;
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST("/notifications/read-all");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast.add({
        title: "All marked as read",
        type: "success",
        timeout: 3000,
      });
    },
  });
}

export function useSendTestNotification() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST("/notifications/test");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast.add({
        title: "Test notification triggered! 🔔",
        description: "Check your device or notification tray.",
        type: "success",
        timeout: 4000,
      });
    },
    onError: () => {
      toast.add({
        title: "Couldn't send test notification",
        type: "error",
      });
    },
  });
}

export function usePushNotificationManager() {
  const client = usePocketlyClient();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeviceRegistered, setIsDeviceRegistered] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
      const savedToken = localStorage.getItem("pocketly_device_token");
      setIsDeviceRegistered(Boolean(savedToken && Notification.permission === "granted"));
    } else {
      setPermissionStatus("unsupported");
    }
  }, []);

  const enablePushNotifications = useCallback(async () => {
    setIsRegistering(true);
    try {
      const token = await requestPushPermissionAndGetToken();
      if (!token) {
        throw new Error("Unable to retrieve FCM token.");
      }

      setPermissionStatus("granted");
      localStorage.setItem("pocketly_device_token", token);
      setIsDeviceRegistered(true);

      // Register token with backend
      await client.POST("/notifications/devices", {
        body: {
          token,
          platform: "web",
          userAgent: navigator.userAgent,
        },
      });

      toast.add({
        title: "Notifications Enabled 🎉",
        description: "You'll receive reminders and budget warnings even when Pocketly is closed.",
        type: "success",
        timeout: 5000,
      });
    } catch (err: any) {
      if (typeof window !== "undefined" && "Notification" in window) {
        setPermissionStatus(Notification.permission);
      }
      toast.add({
        title: "Couldn't enable notifications",
        description: err?.message || "Please allow notifications in your browser settings.",
        type: "error",
      });
    } finally {
      setIsRegistering(false);
    }
  }, [client]);

  const disablePushNotifications = useCallback(async () => {
    setIsRegistering(true);
    try {
      const savedToken = localStorage.getItem("pocketly_device_token");
      if (savedToken) {
        await client.DELETE("/notifications/devices/{token}", {
          params: { path: { token: savedToken } },
        }).catch(() => {});
        localStorage.removeItem("pocketly_device_token");
      }

      setIsDeviceRegistered(false);
      toast.add({
        title: "Notifications disabled",
        description: "You will no longer receive background alerts on this device.",
        type: "info",
        timeout: 4000,
      });
    } catch {
      toast.add({
        title: "Couldn't disable notifications",
        type: "error",
      });
    } finally {
      setIsRegistering(false);
    }
  }, [client]);

  return {
    permissionStatus,
    isRegistering,
    isDeviceRegistered,
    enablePushNotifications,
    disablePushNotifications,
  };
}
