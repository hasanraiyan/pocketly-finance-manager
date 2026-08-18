import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "./Button";
import { Card, CardContent } from "./Card";
import { useAuth } from "@/lib/auth-provider";
import { theme } from "@/lib/theme";

export function GuestUpgradeCard() {
  const { isGuest, exitGuestMode } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  if (!isGuest) {
    return null;
  }

  function handleProceedToAuth() {
    setModalVisible(false);
    exitGuestMode();
    router.replace("/(auth)/sign-up");
  }

  return (
    <>
      <Card className="bg-primary/5 border border-primary/30">
        <CardContent className="gap-3.5 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                <Feather name="cloud-lightning" size={14} color={theme.primary} />
              </View>
              <Text className="text-xs font-bold uppercase tracking-wider text-primary">
                Local-First Mode
              </Text>
            </View>

            <View className="rounded bg-primary/15 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-primary">
                Offline Safe
              </Text>
            </View>
          </View>

          <View>
            <Text className="text-sm font-semibold text-foreground">
              Unlock Multi-Device Sync & AI with MCP
            </Text>
            <Text className="text-xs text-muted-foreground mt-1 leading-relaxed">
              You are using Pocketly locally. Create a free account to back up your data to the cloud, and connect AI tools like <Text className="font-semibold text-foreground">Claude, Cursor, and ChatGPT</Text> directly to your financial ledger.
            </Text>
          </View>

          <Button
            onPress={() => setModalVisible(true)}
            className="flex-row items-center gap-2"
          >
            <Feather name="cpu" size={14} color={theme.primaryForeground} />
            <Text className="text-xs font-semibold text-primaryForeground">
              Enable Cloud & AI MCP
            </Text>
          </Button>
        </CardContent>
      </Card>

      {/* Cloud & MCP Explainer Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/60 p-5">
          <View className="w-full max-w-md rounded-3xl bg-background border border-border p-6 gap-5 shadow-xl">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 self-center">
              <Feather name="cpu" size={24} color={theme.primary} />
            </View>

            <View className="items-center text-center">
              <Text className="font-heading text-xl text-foreground text-center">
                Supercharge Pocketly with AI
              </Text>
              <Text className="text-xs text-muted-foreground text-center mt-1 px-2 leading-relaxed">
                Connect your personal finance ledger to Cursor, Claude Desktop, Antigravity, and other AI agents via our Model Context Protocol (MCP) server.
              </Text>
            </View>

            <View className="gap-3 bg-muted/30 rounded-2xl p-4 border border-border/60">
              <View className="flex-row items-start gap-2.5">
                <Feather name="check-circle" size={15} color={theme.positive} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-foreground">
                    Ask AI Anything About Your Money
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    &quot;How much did I spend on dining this week?&quot; or &quot;Will I hit my savings goal?&quot;
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start gap-2.5">
                <Feather name="check-circle" size={15} color={theme.positive} className="mt-0.5" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-foreground">
                    Automatic Multi-Device Backup
                  </Text>
                  <Text className="text-[11px] text-muted-foreground">
                    Access your balances and budgets seamlessly across mobile and web.
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-2.5">
              <Button onPress={handleProceedToAuth}>
                Create Free Account / Sign In
              </Button>
              <Button variant="ghost" onPress={() => setModalVisible(false)}>
                Continue in Local Mode
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
