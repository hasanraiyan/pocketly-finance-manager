import React from "react";
import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import { theme } from "@/lib/theme";

type Variant = "default" | "outline" | "ghost";

export function Button({
  children,
  variant = "default",
  loading = false,
  disabled,
  className,
  ...props
}: PressableProps & {
  children: React.ReactNode;
  variant?: Variant;
  loading?: boolean;
  className?: string;
}) {
  const base = "h-11 items-center justify-center rounded-lg px-4 flex-row gap-2";
  const variants: Record<Variant, string> = {
    default: "bg-primary",
    outline: "border border-border bg-transparent",
    ghost: "bg-transparent",
  };
  const textVariants: Record<Variant, string> = {
    default: "text-primary-foreground",
    outline: "text-foreground",
    ghost: "text-foreground",
  };

  return (
    <Pressable
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${disabled || loading ? "opacity-50" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === "default" ? theme.primaryForeground : theme.foreground}
        />
      )}
      {typeof children === "string" || typeof children === "number" ? (
        <Text className={`text-sm font-medium ${textVariants[variant]}`}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
