import React, { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Linking from "expo-linking";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { safeStorage } from "@/lib/safe-storage";
import { theme } from "@/lib/theme";

const SNOOZE_KEY = "POCKETLY_UPDATE_PROMPT_SNOOZED";
const SNOOZE_HOURS = 24;

export function AppUpdatePrompt() {
  const [modalVisible, setModalVisible] = useState(false);
  const [updateNotes, setUpdateNotes] = useState<string | null>(null);

  const currentVersion = Constants.expoConfig?.version ?? "1.0.0";
  const packageName = "app.hasanraiyan.pocketly";

  const openPlayStore = async () => {
    const marketUrl = `market://details?id=${packageName}`;
    const webUrl = `https://play.google.com/store/apps/details?id=${packageName}`;

    try {
      const supported = await Linking.canOpenURL(marketUrl);
      if (supported && Platform.OS === "android") {
        await Linking.openURL(marketUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      await Linking.openURL(webUrl);
    }
    setModalVisible(false);
  };

  const handleDismiss = async () => {
    setModalVisible(false);
    await safeStorage.setItem(SNOOZE_KEY, Date.now().toString());
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View className="flex-1 bg-black/60 items-center justify-center p-5">
        <View className="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl gap-4">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 self-center">
            <Feather name="arrow-up-circle" size={24} color={theme.primary} />
          </View>

          <View className="gap-1 items-center">
            <Text className="font-heading text-xl font-bold text-foreground text-center">
              New Update Available
            </Text>
            <Text className="text-xs text-muted-foreground text-center">
              A newer version of Pocketly is available on Google Play with improved features and performance.
            </Text>
          </View>

          {updateNotes && (
            <View className="rounded-xl bg-muted/40 border border-border/60 p-3">
              <Text className="text-xs text-foreground font-medium">What&apos;s New:</Text>
              <Text className="text-[11px] text-muted-foreground mt-0.5">{updateNotes}</Text>
            </View>
          )}

          <View className="gap-2 pt-2">
            <Button onPress={openPlayStore}>
              Update on Google Play
            </Button>
            <Button variant="ghost" onPress={handleDismiss}>
              Remind Me Later
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
