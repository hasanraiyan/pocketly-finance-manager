import React from "react";
import { View } from "react-native";

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /** If true, dynamically colors the bar based on percentage: <70% Green, 70-90% Amber, >90% Rose */
  adaptiveColor?: boolean;
}

export function ProgressBar({
  value,
  max,
  color,
  trackColor,
  className,
  size = "md",
  adaptiveColor = false,
}: ProgressBarProps) {
  const percentage = max !== undefined && max > 0 ? (value / max) * 100 : value;
  const clamped = Math.min(100, Math.max(0, percentage));

  // Determine dynamic color if adaptiveColor is enabled and no explicit color is passed
  let resolvedColor = color;
  let defaultTrackClass = "bg-muted/80";

  if (!resolvedColor && adaptiveColor) {
    if (clamped >= 90) {
      resolvedColor = "#ef4444"; // Rose-500 Danger
      defaultTrackClass = "bg-rose-500/15";
    } else if (clamped >= 70) {
      resolvedColor = "#f59e0b"; // Amber-500 Warning
      defaultTrackClass = "bg-amber-500/15";
    } else {
      resolvedColor = "#10b981"; // Emerald-500 Healthy
      defaultTrackClass = "bg-emerald-500/15";
    }
  }

  const heightClass =
    size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <View
      className={`w-full overflow-hidden rounded-full ${defaultTrackClass} ${heightClass} ${className ?? ""}`}
      style={trackColor ? { backgroundColor: trackColor } : undefined}
    >
      <View
        className={`h-full rounded-full ${resolvedColor ? "" : "bg-primary"}`}
        style={{
          width: `${clamped}%`,
          backgroundColor: resolvedColor,
        }}
      />
    </View>
  );
}
