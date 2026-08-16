import type { ComponentProps } from "react";
import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { theme } from "@/lib/theme";

export function ComingSoon({
  icon,
  title,
  description,
}: {
  icon: ComponentProps<typeof Feather>["name"];
  title: string;
  description: string;
}) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-background px-8">
      <View className="size-14 items-center justify-center rounded-full bg-secondary">
        <Feather name={icon} size={24} color={theme.mutedForeground} />
      </View>
      <Text className="font-heading text-xl text-foreground">{title}</Text>
      <Text className="text-center text-sm text-muted-foreground">
        {description}
      </Text>
    </View>
  );
}
