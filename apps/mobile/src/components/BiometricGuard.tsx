import React, { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { AppState, type AppStateStatus, Modal, Platform, Pressable, Text, View } from "react-native";
import { Button } from "@/components/Button";
import {
  authenticateWithBiometrics,
  checkBiometricsStatus,
  isBiometricsEnabled,
  type BiometricStatus,
} from "@/lib/biometrics";
import { haptics } from "@/lib/haptics";
import { theme } from "@/lib/theme";

interface BiometricGuardProps {
  children: React.ReactNode;
}

export function BiometricGuard({ children }: BiometricGuardProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [bioStatus, setBioStatus] = useState<BiometricStatus>({
    isAvailable: false,
    isEnrolled: false,
    biometricType: "Biometrics",
  });
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const performUnlock = async () => {
    const success = await authenticateWithBiometrics(
      `Unlock Pocketly with ${bioStatus.biometricType}`
    );
    if (success) {
      haptics.success();
      setIsLocked(false);
    } else {
      haptics.error();
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") return;

    // Check status and initial lock state on launch
    const initBiometrics = async () => {
      const status = await checkBiometricsStatus();
      setBioStatus(status);

      const enabled = await isBiometricsEnabled();
      if (enabled && status.isAvailable) {
        setIsLocked(true);
        const success = await authenticateWithBiometrics(
          `Unlock Pocketly with ${status.biometricType}`
        );
        if (success) {
          setIsLocked(false);
        }
      }
    };

    initBiometrics();

    // Listen to background -> foreground transitions
    const subscription = AppState.addEventListener("change", async (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const enabled = await isBiometricsEnabled();
        const status = await checkBiometricsStatus();
        if (enabled && status.isAvailable) {
          setIsLocked(true);
          const success = await authenticateWithBiometrics(
            `Unlock Pocketly with ${status.biometricType}`
          );
          if (success) {
            setIsLocked(false);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      {children}

      <Modal
        visible={isLocked}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-background items-center justify-center px-6">
          <View className="w-full max-w-sm items-center gap-6">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 border border-primary/20">
              <Feather
                name={
                  bioStatus.biometricType === "Face ID"
                    ? "smile"
                    : "shield"
                }
                size={38}
                color={theme.primary}
              />
            </View>

            <View className="items-center gap-2">
              <Text className="font-heading text-2xl font-bold text-foreground text-center">
                Pocketly is Locked
              </Text>
              <Text className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
                Biometric security is enabled. Verify your identity with {bioStatus.biometricType} to view your financial ledger.
              </Text>
            </View>

            <View className="w-full gap-3 pt-4">
              <Button onPress={performUnlock} className="w-full">
                Unlock with {bioStatus.biometricType}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
