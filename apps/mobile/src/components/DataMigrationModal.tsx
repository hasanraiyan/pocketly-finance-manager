import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import { Button } from "./Button";
import { clearAllLocalGuestData } from "@/lib/local-storage-adapter";
import {
  migrateLocalDataToCloud,
  type MigrationSummary,
} from "@/lib/migration-service";
import { usePocketlyClient } from "@/lib/api-client";
import { theme } from "@/lib/theme";

interface DataMigrationModalProps {
  visible: boolean;
  summary: MigrationSummary;
  onComplete: () => void;
}

export function DataMigrationModal({
  visible,
  summary,
  onComplete,
}: DataMigrationModalProps) {
  const client = usePocketlyClient();
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  const details = [
    summary.transactionCount > 0
      ? `${summary.transactionCount} transaction${summary.transactionCount === 1 ? "" : "s"}`
      : null,
    summary.accountCount > 0
      ? `${summary.accountCount} account${summary.accountCount === 1 ? "" : "s"}`
      : null,
    summary.goalCount > 0
      ? `${summary.goalCount} goal${summary.goalCount === 1 ? "" : "s"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  async function handleMerge() {
    try {
      setLoading(true);
      setProgressMsg("Connecting to cloud ledger...");
      await migrateLocalDataToCloud(client, (step) => setProgressMsg(step));
      setLoading(false);
      onComplete();
    } catch {
      setLoading(false);
      onComplete();
    }
  }

  async function handleDiscard() {
    try {
      setLoading(true);
      await clearAllLocalGuestData();
      setLoading(false);
      onComplete();
    } catch {
      setLoading(false);
      onComplete();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/65 p-5">
        <View className="w-full max-w-md rounded-3xl bg-background border border-border p-6 gap-5 shadow-2xl">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 self-center">
            <Feather name="cloud-lightning" size={24} color={theme.primary} />
          </View>

          <View className="items-center text-center">
            <Text className="font-heading text-xl text-foreground text-center">
              Offline Records Found
            </Text>
            <Text className="text-xs text-muted-foreground text-center mt-1.5 px-2 leading-relaxed">
              You created{" "}
              <Text className="font-semibold text-foreground">
                {details || "offline financial records"}
              </Text>{" "}
              on this device. How would you like to proceed?
            </Text>
          </View>

          {loading ? (
            <View className="items-center justify-center py-6 gap-3">
              <ActivityIndicator size="large" color={theme.primary} />
              <Text className="text-xs font-medium text-foreground text-center">
                {progressMsg || "Syncing data..."}
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              <Button onPress={handleMerge} className="flex-row items-center gap-2">
                <Feather name="upload-cloud" size={16} color={theme.primaryForeground} />
                <Text className="text-sm font-semibold text-primaryForeground">
                  Merge & Upload to Cloud
                </Text>
              </Button>

              <Button
                variant="outline"
                onPress={handleDiscard}
                className="flex-row items-center gap-2"
              >
                <Feather name="trash-2" size={15} color={theme.mutedForeground} />
                <Text className="text-sm font-medium text-foreground">
                  Use Cloud Data Only (Discard Local)
                </Text>
              </Button>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
