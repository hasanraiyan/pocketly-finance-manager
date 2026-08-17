import { useAuth } from "@/lib/auth-provider";
import { Redirect } from "expo-router";
import { View } from "react-native";

export default function Index() {
  const { isLoading, isSignedIn } = useAuth();

  if (isLoading) {
    return <View className="flex-1 bg-background" />;
  }

  return <Redirect href={isSignedIn ? "/(app)/dashboard" : "/(auth)/sign-in"} />;
}
