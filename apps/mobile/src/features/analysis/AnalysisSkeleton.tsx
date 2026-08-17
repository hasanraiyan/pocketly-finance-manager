import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";

export function AnalysisSkeleton() {
  return (
    <View className="gap-5">
      {/* 3 Metric Stat Cards Skeleton */}
      <View className="flex-row gap-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex-1 bg-card border border-border/80">
            <CardContent className="p-3.5 gap-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </View>

      {/* Savings & Health Ribbon Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-4 gap-3">
          <View className="flex-row justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12" />
          </View>
          <Skeleton className="h-2 w-full rounded-full" />
          <View className="flex-row justify-between items-center">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-24" />
          </View>
        </CardContent>
      </Card>

      {/* Category Breakdown Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-4">
          <View className="flex-row justify-between items-center">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3.5 w-16" />
          </View>
          <View className="gap-3">
            {[1, 2, 3, 4].map((i) => (
              <View key={i} className="gap-2">
                <View className="flex-row justify-between items-center">
                  <Skeleton className={`h-3.5 ${i % 2 === 0 ? "w-28" : "w-36"}`} />
                  <Skeleton className="h-3.5 w-16" />
                </View>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Cash Flow Timeline Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-4">
          <Skeleton className="h-4 w-32" />
          <View className="flex-row items-end justify-between h-28 pt-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className="items-center gap-1.5 flex-1">
                <Skeleton
                  className={`w-4 rounded-t ${
                    i % 2 === 0 ? "h-16" : "h-22"
                  }`}
                />
                <Skeleton className="h-2.5 w-6" />
              </View>
            ))}
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
