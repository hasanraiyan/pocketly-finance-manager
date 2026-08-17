import { useAuth } from "@/lib/auth-provider";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

export default function AuthLayout() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return <View className="flex-1 bg-background" />;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
