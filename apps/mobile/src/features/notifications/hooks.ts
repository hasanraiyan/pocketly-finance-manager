import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Constants, { ExecutionEnvironment } from "expo-constants";
import type { components } from "@pocketly/sdk";
import { usePocketlyClient } from "@/lib/api-client";

// Safely obtain the expo-notifications module only in non-Expo-Go environments
function getNotificationsModule() {
  try {
    // Remote notifications are permanently disabled from Expo Go in SDK 53+
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications");
  } catch {
    return null;
  }
}

// Configure how notifications appear when app is in foreground (in standalone APK)
const Notifications = getNotificationsModule();
if (Notifications && typeof Notifications.setNotificationHandler === "function") {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: Notifications.AndroidNotificationPriority?.HIGH ?? 4,
      }),
    });
  } catch {
    // Safe ignore in development environments
  }
}

export type NotificationItem =
  components["schemas"]["NotificationListDto"]["data"]["items"][number];

export const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useNotifications(unreadOnly = false) {
  const client = usePocketlyClient();

  return useQuery({
    queryKey: [...NOTIFICATIONS_KEY, { unreadOnly }],
    queryFn: async () => {
      const { data, error } = await client.GET("/notifications", {
        params: { query: { limit: 20, page: 1, unreadOnly } },
      });
      if (error || !data) {
        throw new Error("Failed to load notifications");
      }
      return data.data;
    },
    refetchInterval: 30_000,
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
      if (error || !data) {
        throw new Error("Failed to mark notification as read");
      }
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
      if (error || !data) {
        throw new Error("Failed to mark all as read");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

export function useSendTestNotification() {
  const client = usePocketlyClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await client.POST("/notifications/test");
      if (error || !data) {
        throw new Error("Failed to send test notification");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/**
 * Registers device push token with backend on login
 */
export function usePushNotificationSetup() {
  const client = usePocketlyClient();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function registerForPush() {
      const notifs = getNotificationsModule();
      if (!notifs) {
        return;
      }

      try {
        if (Platform.OS === "android" && notifs.setNotificationChannelAsync) {
          await notifs.setNotificationChannelAsync("default", {
            name: "Pocketly Financial Alerts",
            importance: notifs.AndroidImportance?.MAX ?? 5,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#10b981",
          }).catch(() => {});
        }

        if (!notifs.getPermissionsAsync) {
          return;
        }

        const { status: existingStatus } = await notifs.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await notifs.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== "granted") {
          if (isMounted) setPermissionGranted(false);
          return;
        }

        if (isMounted) setPermissionGranted(true);

        // Get device push token
        const tokenData = await notifs.getDevicePushTokenAsync().catch(
          async () => {
            return await notifs.getExpoPushTokenAsync().catch(() => null);
          },
        );

        const token =
          typeof tokenData === "string"
            ? tokenData
            : tokenData?.data;

        if (token && isMounted) {
          setPushToken(token);
          // Register with Pocketly backend
          await client.POST("/notifications/devices", {
            body: {
              token,
              platform: Platform.OS === "ios" ? "ios" : "android",
              userAgent: `Pocketly Native App (${Platform.OS})`,
            },
          }).catch(() => {});
        }
      } catch (err) {
        console.warn("Could not register push notifications:", err);
      }
    }

    registerForPush();

    return () => {
      isMounted = false;
    };
  }, [client]);

  return { permissionGranted, pushToken };
}
