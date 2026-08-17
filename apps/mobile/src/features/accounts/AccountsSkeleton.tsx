import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";

export function AccountsSkeleton() {
  return (
    <View className="gap-6">
      {/* Total Balance Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </View>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-3 w-56" />
        </CardContent>
      </Card>

      {/* Filter pills skeleton */}
      <View className="flex-row gap-2">
        <Skeleton className="h-7 w-12 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-16 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
      </View>

      {/* Account rows skeleton */}
      <View className="gap-3">
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            className="flex-row items-center justify-between rounded-xl bg-card border border-border/80 p-4"
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-2">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <View className="flex-1 gap-2">
                <Skeleton className={`h-4 ${i % 2 === 0 ? "w-32" : "w-40"}`} />
                <Skeleton className="h-3 w-20" />
              </View>
            </View>
            <View className="items-end gap-2">
              <Skeleton className="h-4 w-20" />
              <View className="flex-row gap-1">
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
