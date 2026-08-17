import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { theme } from "@/lib/theme";

export interface PasswordInputProps extends Omit<TextInputProps, "secureTextEntry"> {
  label?: string;
  error?: string;
  className?: string;
}

export function PasswordInput({
  label,
  error,
  className,
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-foreground">{label}</Text>
      )}
      <View className="relative justify-center">
        <TextInput
          placeholderTextColor={theme.mutedForeground}
          secureTextEntry={!showPassword}
          className={`h-11 rounded-lg border border-border bg-card pl-3 pr-11 text-base text-foreground ${className ?? ""}`}
          {...props}
        />
        <Pressable
          hitSlop={8}
          onPress={() => setShowPassword((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          className="absolute right-3 h-8 w-8 items-center justify-center rounded-md"
        >
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={18}
            color={theme.mutedForeground}
          />
        </Pressable>
      </View>
      {error && <Text className="text-xs text-negative">{error}</Text>}
    </View>
  );
}
