import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";

export function RecordsSkeleton() {
  return (
    <View className="gap-4">
      {/* Search Input Skeleton */}
      <Skeleton className="h-11 w-full rounded-xl" />

      {/* Filter pills skeleton */}
      <View className="flex-row gap-2">
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-18 rounded-full" />
        <Skeleton className="h-7 w-18 rounded-full" />
        <Skeleton className="h-7 w-18 rounded-full" />
      </View>

      {/* Income & Expense stats card skeleton */}
      <View className="flex-row gap-3">
        <Card className="flex-1 bg-card border border-border/80">
          <CardContent className="p-3 flex-row items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <View className="gap-1.5 flex-1">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-4 w-20" />
            </View>
          </CardContent>
        </Card>
        <Card className="flex-1 bg-card border border-border/80">
          <CardContent className="p-3 flex-row items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <View className="gap-1.5 flex-1">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-4 w-20" />
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Records list rows skeleton */}
      <View className="gap-2.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View
            key={i}
            className="flex-row items-center justify-between rounded-xl bg-card border border-border/80 p-3.5"
          >
            <View className="flex-row items-center gap-3 flex-1 pr-2">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <View className="flex-1 gap-2">
                <Skeleton className={`h-4 ${i % 2 === 0 ? "w-36" : "w-48"}`} />
                <View className="flex-row items-center gap-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-14" />
                </View>
              </View>
            </View>
            <View className="items-end gap-1.5">
              <Skeleton className="h-4 w-16" />
              <View className="flex-row gap-1">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
