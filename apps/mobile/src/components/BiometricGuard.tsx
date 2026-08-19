import React, { useEffect, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  AppState,
  type AppStateStatus,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
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
        <View className="flex-1 bg-background items-center justify-between px-6 py-16">
          <View className="items-center w-full pt-8">
            {/* Pocketly Icon with Biometric Badge */}
            <View className="relative mb-6">
              <View className="h-24 w-24 items-center justify-center rounded-3xl bg-card border border-border shadow-md overflow-hidden p-3.5">
                <Image
                  source={require("../../assets/pocketly-icon.png")}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="contain"
                />
              </View>
              <View className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full bg-primary items-center justify-center border-2 border-background shadow-sm">
                <Feather
                  name={
                    bioStatus.biometricType === "Face ID"
                      ? "smile"
                      : "shield"
                  }
                  size={16}
                  color="#ffffff"
                />
              </View>
            </View>

            <Text className="font-heading text-3xl font-bold text-foreground text-center">
              Pocketly
            </Text>
            <View className="flex-row items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-muted/60 border border-border">
              <Feather name="lock" size={12} color={theme.mutedForeground} />
              <Text className="text-xs font-medium text-muted-foreground">
                App Locked
              </Text>
            </View>

            <Text className="mt-6 text-sm text-muted-foreground text-center max-w-xs leading-relaxed">
              Biometric protection is active. Authenticate with {bioStatus.biometricType} to access your financial OS.
            </Text>
          </View>

          {/* Action Trigger */}
          <View className="w-full max-w-sm gap-4 pb-4">
            <Button
              onPress={performUnlock}
              className="w-full shadow-sm"
            >
              <View className="flex-row items-center justify-center gap-2">
                <Feather
                  name={
                    bioStatus.biometricType === "Face ID"
                      ? "smile"
                      : "user-check"
                  }
                  size={18}
                  color="#ffffff"
                />
                <Text className="text-base font-semibold text-white">
                  Unlock with {bioStatus.biometricType}
                </Text>
              </View>
            </Button>
            <Pressable
              onPress={performUnlock}
              className="py-2.5 items-center justify-center"
            >
              <Text className="text-xs font-medium text-muted-foreground">
                Tap to retry scan
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
