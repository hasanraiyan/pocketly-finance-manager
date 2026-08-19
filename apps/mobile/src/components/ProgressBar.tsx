import React from "react";
import { View } from "react-native";

export type ProgressMode = "budget" | "goal" | "health" | "task" | "default";

export interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  trackColor?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  /**
   * Progress semantics:
   * - "budget" (default when adaptiveColor is true without mode): Spending limit. Lower is better (<70% Green, 70-90% Amber, >=90% Red).
   * - "goal" / "health" / "task": Savings target or health score. Higher is better (>=90% Green, 50-89% Blue/Primary, <50% Indigo/Muted).
   */
  mode?: ProgressMode;
  /** Enables dynamic adaptive coloring based on mode */
  adaptiveColor?: boolean | ProgressMode;
}

export function ProgressBar({
  value,
  max,
  color,
  trackColor,
  className,
  size = "md",
  mode,
  adaptiveColor = false,
}: ProgressBarProps) {
  const percentage = max !== undefined && max > 0 ? (value / max) * 100 : value;
  const clamped = Math.min(100, Math.max(0, percentage));

  // Determine active mode
  const effectiveMode: ProgressMode =
    mode ??
    (typeof adaptiveColor === "string"
      ? adaptiveColor
      : adaptiveColor
        ? "budget"
        : "default");

  const isAdaptive = Boolean(adaptiveColor) || Boolean(mode);

  let resolvedColor = color;
  let defaultTrackClass = "bg-muted/80";

  if (!resolvedColor && isAdaptive && effectiveMode !== "default") {
    if (effectiveMode === "goal" || effectiveMode === "health" || effectiveMode === "task") {
      // HIGHER IS BETTER (Savings Goal, Health Score, Checklist)
      if (clamped >= 90) {
        resolvedColor = "#10b981"; // Emerald-500: Reached / Excellent!
        defaultTrackClass = "bg-emerald-500/15";
      } else if (clamped >= 50) {
        resolvedColor = "#0ea5e9"; // Sky-500: Strong progress
        defaultTrackClass = "bg-sky-500/15";
      } else {
        resolvedColor = "#6366f1"; // Indigo-500: In progress
        defaultTrackClass = "bg-indigo-500/15";
      }
    } else {
      // LOWER IS BETTER (Category Budgets / Expense Limits)
      if (clamped >= 90) {
        resolvedColor = "#ef4444"; // Rose-500: Critical / Over limit
        defaultTrackClass = "bg-rose-500/15";
      } else if (clamped >= 70) {
        resolvedColor = "#f59e0b"; // Amber-500: Warning
        defaultTrackClass = "bg-amber-500/15";
      } else {
        resolvedColor = "#10b981"; // Emerald-500: Safe & Healthy
        defaultTrackClass = "bg-emerald-500/15";
      }
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
