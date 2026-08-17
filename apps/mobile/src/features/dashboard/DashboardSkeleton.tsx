import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";

export function DashboardSkeleton() {
  return (
    <View className="gap-5">
      {/* Greeting Skeleton */}
      <View className="gap-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3.5 w-52" />
      </View>

      {/* Balance Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="gap-4">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-48" />
          <View className="flex-row gap-2 pt-2 border-t border-border/60">
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </View>
        </CardContent>
      </Card>

      {/* Health & Safe to spend Skeleton */}
      <View className="flex-row gap-3">
        <Card className="flex-1 bg-card border border-border/80">
          <CardContent className="gap-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
        <Card className="flex-1 bg-card border border-border/80">
          <CardContent className="gap-2 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-full rounded-full" />
          </CardContent>
        </Card>
      </View>

      {/* Budgets Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="gap-3.5">
          <View className="flex-row justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </View>
          <View className="gap-2.5">
            {[1, 2].map((i) => (
              <View key={i} className="gap-1.5">
                <View className="flex-row justify-between items-center">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3.5 w-20" />
                </View>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </View>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Recent Records Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="gap-3">
          <View className="flex-row justify-between items-center">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-16" />
          </View>
          <View className="gap-2.5">
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                className="flex-row justify-between items-center p-2.5 rounded-lg bg-muted/30"
              >
                <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <View className="gap-1.5 flex-1">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-2.5 w-16" />
                  </View>
                </View>
                <Skeleton className="h-4 w-16" />
              </View>
            ))}
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
