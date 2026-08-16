import { useAuth, useUser } from "@clerk/expo";
import { Text, View } from "react-native";
import { Button } from "@/components/Button";

export default function SettingsScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();

  return (
    <View className="flex-1 gap-6 bg-background px-6 pt-16">
      <View>
        <Text className="font-heading text-2xl text-foreground">
          Settings
        </Text>
        <Text className="text-sm text-muted-foreground">
          Signed in as {user?.primaryEmailAddress?.emailAddress}
        </Text>
      </View>
      <Text className="text-sm text-muted-foreground">
        Currency, timezone, and category management are coming soon.
      </Text>
      <Button variant="outline" onPress={() => signOut()}>
        Sign out
      </Button>
    </View>
  );
}
