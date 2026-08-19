import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";
import { safeStorage } from "@/lib/safe-storage";

const BIOMETRICS_ENABLED_KEY = "POCKETLY_BIOMETRICS_ENABLED";

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: "Face ID" | "Fingerprint" | "Biometrics";
}

export async function checkBiometricsStatus(): Promise<BiometricStatus> {
  if (Platform.OS === "web") {
    return {
      isAvailable: false,
      isEnrolled: false,
      biometricType: "Biometrics",
    };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

    let biometricType: "Face ID" | "Fingerprint" | "Biometrics" = "Biometrics";
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      biometricType = "Face ID";
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      biometricType = "Fingerprint";
    }

    return {
      isAvailable: hasHardware && isEnrolled,
      isEnrolled,
      biometricType,
    };
  } catch {
    return {
      isAvailable: false,
      isEnrolled: false,
      biometricType: "Biometrics",
    };
  }
}

export async function isBiometricsEnabled(): Promise<boolean> {
  try {
    const val = await safeStorage.getItem(BIOMETRICS_ENABLED_KEY);
    return val === "true";
  } catch {
    return false;
  }
}

export async function setBiometricsEnabled(enabled: boolean): Promise<void> {
  await safeStorage.setItem(BIOMETRICS_ENABLED_KEY, enabled ? "true" : "false");
}

export async function authenticateWithBiometrics(
  promptMessage = "Unlock Pocketly to view your ledger"
): Promise<boolean> {
  if (Platform.OS === "web") return true;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: "Cancel",
      fallbackLabel: "Use Passcode",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch {
    return false;
  }
}
