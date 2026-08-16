import { Text, TextInput, View, type TextInputProps } from "react-native";
import { theme } from "@/lib/theme";

export function TextField({
  label,
  error,
  className,
  ...props
}: TextInputProps & { label: string; error?: string; className?: string }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        placeholderTextColor={theme.mutedForeground}
        className={`h-11 rounded-lg border border-border bg-card px-3 text-base text-foreground ${className ?? ""}`}
        {...props}
      />
      {error && <Text className="text-xs text-negative">{error}</Text>}
    </View>
  );
}
