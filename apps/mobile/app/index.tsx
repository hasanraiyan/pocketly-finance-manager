import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { View } from "react-native";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <View className="flex-1 bg-background" />;
  }

  return <Redirect href={isSignedIn ? "/(app)/dashboard" : "/(auth)/sign-in"} />;
}
