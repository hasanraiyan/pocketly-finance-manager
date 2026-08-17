import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Text, View } from "react-native";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { useAuth } from "@/lib/auth-provider";
import { theme } from "@/lib/theme";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <View className="flex-1 bg-background px-6 pt-16">
      <View className="mb-6">
        <Text className="font-heading text-2xl text-foreground">
          Settings
        </Text>
        <Text className="text-sm text-muted-foreground">
          Manage your account preferences
        </Text>
      </View>

      <Card className="mb-6">
        <CardContent className="p-4 gap-4">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Feather name="user" size={22} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-foreground">
                {user?.name ?? "User"}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {user?.email ?? ""}
              </Text>
            </View>
          </View>

          <View className="border-t border-border pt-3 gap-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-muted-foreground">Currency</Text>
              <Text className="text-xs font-medium text-foreground">
                {user?.currency ?? "USD"}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-muted-foreground">Timezone</Text>
              <Text className="text-xs font-medium text-foreground">
                {user?.timezone ?? "UTC"}
              </Text>
            </View>
          </View>
        </CardContent>
      </Card>

      <Text className="mb-6 text-sm text-muted-foreground">
        Category customization, multi-currency conversion, and security controls are coming soon.
      </Text>

      <Button
        variant="outline"
        loading={loggingOut}
        onPress={handleLogout}
      >
        Sign out
      </Button>
    </View>
  );
}
