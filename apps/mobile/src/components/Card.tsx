import React from "react";
import { Text, View, type ViewProps } from "react-native";

export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`rounded-2xl border border-border/80 bg-card overflow-hidden ${className ?? ""}`}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return <View className={`gap-1 p-5 pb-2 ${className ?? ""}`} {...props} />;
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <Text className="font-heading text-base text-foreground">{children}</Text>;
}

export function CardDescription({ children }: { children: React.ReactNode }) {
  return <Text className="text-xs text-muted-foreground">{children}</Text>;
}

export function CardContent({
  className,
  ...props
}: ViewProps & { className?: string }) {
  return <View className={`p-5 ${className ?? ""}`} {...props} />;
}
