import "../global.css";

import { useEffect } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
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
import { AuthProvider } from "@/lib/auth-provider";
import { asyncStoragePersister, queryClient } from "@/lib/query-persister";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
    >
      <AuthProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Slot />
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}
