import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";

export function PlanningSkeleton() {
  return (
    <View className="gap-5">
      {/* Overview header card skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-3">
          <View className="flex-row items-center justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-7 w-7 rounded-full" />
          </View>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardContent>
      </Card>

      {/* Segment tabs skeleton */}
      <View className="flex-row gap-2">
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
        <Skeleton className="h-9 flex-1 rounded-xl" />
      </View>

      {/* List items skeleton */}
      <View className="gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card border border-border/80">
            <CardContent className="p-4 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="gap-1.5 flex-1 pr-3">
                  <Skeleton className={`h-4 ${i % 2 === 0 ? "w-32" : "w-44"}`} />
                  <Skeleton className="h-3 w-20" />
                </View>
                <Skeleton className="h-4 w-20" />
              </View>
              <Skeleton className="h-2 w-full rounded-full" />
              <View className="flex-row justify-between items-center">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </View>
            </CardContent>
          </Card>
        ))}
      </View>
    </View>
  );
}
