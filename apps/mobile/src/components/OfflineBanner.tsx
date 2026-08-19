import React from "react";
import { Feather } from "@expo/vector-icons";
import { useNetInfo } from "@react-native-community/netinfo";
import { Text, View } from "react-native";
import { useAuth } from "@/lib/auth-provider";

export function OfflineBanner() {
  const { isGuest } = useAuth();
  const netInfo = useNetInfo();
  const isOffline =
    !isGuest &&
    Boolean(netInfo) &&
    (netInfo.isConnected === false || netInfo.isInternetReachable === false);

  if (!isOffline) {
    return null;
  }

  return (
    <View className="w-full bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex-row items-center justify-center gap-2">
      <Feather name="wifi-off" size={13} color="#d97706" />
      <Text className="text-xs font-medium text-amber-600 dark:text-amber-400">
        Offline Mode — Viewing saved local data
      </Text>
    </View>
  );
}
