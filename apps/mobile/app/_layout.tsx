import "../global.css";

import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts, Fraunces_500Medium } from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { OfflineBanner } from "@/components/OfflineBanner";
import { AppUpdatePrompt } from "@/components/AppUpdatePrompt";
import { AuthProvider } from "@/lib/auth-provider";
import { queryClient } from "@/lib/query-persister";
import { useQuickActionsSetup } from "@/lib/use-quick-actions";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useQuickActionsSetup();

  const [fontsLoaded] = useFonts({
    Fraunces_500Medium,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <AppUpdatePrompt />
        <Slot />
      </AuthProvider>
    </QueryClientProvider>
  );
}
