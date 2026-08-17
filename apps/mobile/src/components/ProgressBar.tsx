import React from "react";
import { View } from "react-native";

export function ProgressBar({
  value,
  max,
  color,
  className,
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const percentage = max !== undefined && max > 0 ? (value / max) * 100 : value;
  const clamped = Math.min(100, Math.max(0, percentage));

  return (
    <View className={`h-1.5 w-full overflow-hidden rounded-full bg-muted ${className ?? ""}`}>
      <View
        className={`h-full rounded-full ${color ? "" : "bg-primary"}`}
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </View>
  );
}
