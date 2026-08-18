import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Modal, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "./Button";
import { useAuth } from "@/lib/auth-provider";
import { safeStorage } from "@/lib/safe-storage";
import { theme } from "@/lib/theme";

const GUEST_POPUP_SEEN_KEY = "POCKETLY_GUEST_POPUP_SEEN";

export function GuestWelcomeModal() {
  const { isGuest, exitGuestMode } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    async function checkPopup() {
      if (!isGuest) return;
      const seen = await safeStorage.getItem(GUEST_POPUP_SEEN_KEY);
      if (!seen) {
        setVisible(true);
      }
    }
    checkPopup();
  }, [isGuest]);

  async function handleDismiss() {
    setVisible(false);
    await safeStorage.setItem(GUEST_POPUP_SEEN_KEY, "true");
  }

  async function handleUpgrade() {
    setVisible(false);
    await safeStorage.setItem(GUEST_POPUP_SEEN_KEY, "true");
    await exitGuestMode();
    router.replace("/(auth)/sign-up");
  }

  if (!isGuest || !visible) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View className="flex-1 justify-center items-center bg-black/65 p-5">
        <View className="w-full max-w-md rounded-3xl bg-background border border-border p-6 gap-5 shadow-2xl">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 self-center">
            <Feather name="shield" size={24} color={theme.primary} />
          </View>

          <View className="items-center text-center">
            <Text className="font-heading text-xl text-foreground text-center">
              Welcome to Offline Mode
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1.5 px-2 leading-relaxed">
              Your financial records are stored securely on this device without requiring an account. You can optionally enable cloud backup and AI MCP tools anytime from <Text className="font-semibold text-foreground">Settings</Text>.
            </Text>
          </View>

          <View className="gap-2.5 mt-2">
            <Button onPress={handleDismiss} className="flex-row items-center gap-2">
              <Feather name="check" size={16} color={theme.primaryForeground} />
              <Text className="text-sm font-semibold text-primaryForeground">
                Got it, Start Logging
              </Text>
            </Button>

            <Button
              variant="outline"
              onPress={handleUpgrade}
              className="flex-row items-center gap-2"
            >
              <Feather name="cloud-lightning" size={15} color={theme.foreground} />
              <Text className="text-sm font-medium text-foreground">
                Enable Cloud Sync & AI MCP
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
