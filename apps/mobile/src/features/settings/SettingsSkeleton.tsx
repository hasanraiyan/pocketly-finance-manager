import React from "react";
import { View } from "react-native";
import { Card, CardContent } from "@/components/Card";
import { Skeleton } from "@/components/Skeleton";

export function SettingsSkeleton() {
  return (
    <View className="gap-5">
      {/* Profile Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-4">
          <View className="flex-row items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <View className="gap-2 flex-1">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-48" />
            </View>
          </View>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Security Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Sessions Card Skeleton */}
      <Card className="bg-card border border-border/80">
        <CardContent className="p-5 gap-3">
          <View className="flex-row justify-between items-center">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-20" />
          </View>
          <View className="gap-2.5 mt-2">
            {[1, 2].map((i) => (
              <View
                key={i}
                className="flex-row justify-between items-center p-3 rounded-lg bg-muted/40"
              >
                <View className="gap-1.5 flex-1 pr-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-44" />
                </View>
                <Skeleton className="h-6 w-16 rounded" />
              </View>
            ))}
          </View>
        </CardContent>
      </Card>
    </View>
  );
}
