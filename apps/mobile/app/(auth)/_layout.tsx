import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";
import { View } from "react-native";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <View className="flex-1 bg-background" />;
  }

  if (isSignedIn) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
