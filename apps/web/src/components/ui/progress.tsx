"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/utils"

export type ProgressMode = "budget" | "goal" | "health" | "task" | "default"

interface ExtendedProgressProps extends ProgressPrimitive.Root.Props {
  indicatorClassName?: string
  trackClassName?: string
  size?: "sm" | "md" | "lg"
  mode?: ProgressMode
  adaptiveColor?: boolean | ProgressMode
}

function Progress({
  className,
  children,
  value = 0,
  indicatorClassName,
  trackClassName,
  size = "md",
  mode,
  adaptiveColor = false,
  ...props
}: ExtendedProgressProps) {
  const numericValue = typeof value === "number" ? value : 0
  const clamped = Math.min(100, Math.max(0, numericValue))

  const effectiveMode: ProgressMode =
    mode ??
    (typeof adaptiveColor === "string"
      ? adaptiveColor
      : adaptiveColor
        ? "budget"
        : "default")

  const isAdaptive = Boolean(adaptiveColor) || Boolean(mode)

  let dynamicIndicatorClass = "bg-primary"
  let dynamicTrackClass = "bg-muted"

  if (!indicatorClassName && isAdaptive && effectiveMode !== "default") {
    if (effectiveMode === "goal" || effectiveMode === "health" || effectiveMode === "task") {
      // HIGHER IS BETTER (Savings Goal, Health Score, Task Checklist)
      if (clamped >= 90) {
        dynamicIndicatorClass = "bg-emerald-500"
        dynamicTrackClass = "bg-emerald-500/15"
      } else if (clamped >= 50) {
        dynamicIndicatorClass = "bg-sky-500"
        dynamicTrackClass = "bg-sky-500/15"
      } else {
        dynamicIndicatorClass = "bg-indigo-500"
        dynamicTrackClass = "bg-indigo-500/15"
      }
    } else {
      // LOWER IS BETTER (Category Budgets / Expense Limits)
      if (clamped >= 90) {
        dynamicIndicatorClass = "bg-rose-500"
        dynamicTrackClass = "bg-rose-500/15"
      } else if (clamped >= 70) {
        dynamicIndicatorClass = "bg-amber-500"
        dynamicTrackClass = "bg-amber-500/15"
      } else {
        dynamicIndicatorClass = "bg-emerald-500"
        dynamicTrackClass = "bg-emerald-500/15"
      }
    }
  }

  const heightClass =
    size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2"

  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-col gap-1.5 w-full", className)}
      {...props}
    >
      {children}
      <ProgressTrack className={cn("rounded-full overflow-hidden", heightClass, dynamicTrackClass, trackClassName)}>
        <ProgressIndicator className={cn("rounded-full", dynamicIndicatorClass, indicatorClassName)} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-2 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-xs", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-xs text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
