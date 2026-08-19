import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Card, CardContent } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { AnalysisSkeleton } from "@/features/analysis/AnalysisSkeleton";
import {
  PERIOD_OPTIONS,
  useAccountBreakdown,
  useAnalysisOverview,
  useCashFlow,
  useCategoryBreakdown,
  type AccountBreakdown,
  type AnalysisPeriod,
  type CashFlow,
  type CategoryBreakdown,
  type Overview,
} from "@/features/analysis/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useAuth } from "@/lib/auth-provider";
import { formatCurrency } from "@/lib/format";
import { theme } from "@/lib/theme";

export default function AnalysisScreen() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AnalysisPeriod>("this_month");

  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
    isRefetching: overviewRefetching,
  } = useAnalysisOverview(period);

  const {
    data: categoryData,
    isLoading: categoryLoading,
    refetch: refetchCategory,
    isRefetching: categoryRefetching,
  } = useCategoryBreakdown(period);

  const {
    data: trendData,
    isLoading: trendLoading,
    refetch: refetchTrend,
    isRefetching: trendRefetching,
  } = useCashFlow(period);

  const {
    data: accountData,
    isLoading: accountLoading,
    refetch: refetchAccount,
    isRefetching: accountRefetching,
  } = useAccountBreakdown(period);

  const { data: categories = [] } = useCategories();

  const isRefetching =
    overviewRefetching ||
    categoryRefetching ||
    trendRefetching ||
    accountRefetching;

  const isLoading =
    (overviewLoading ||
      categoryLoading ||
      trendLoading ||
      accountLoading) &&
    !isRefetching;

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c._id, c.name]));
  }, [categories]);

  // Aggregate Metrics
  const income = overview?.income ?? 0;
  const expense = overview?.expense ?? 0;
  const net = overview?.net ?? 0;
  const savingsRate =
    income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;

  // Sorted Expense Categories
  const expenseCategories = useMemo(() => {
    return (categoryData?.categories ?? [])
      .filter((c) => c.type === "expense")
      .slice(0, 8);
  }, [categoryData]);

  const totalCategoryExpense = useMemo(() => {
    return (
      expenseCategories.reduce((sum: number, item) => sum + item.total, 0) || 1
    );
  }, [expenseCategories]);

  // Daily Trends for Timeline
  const recentDays = useMemo(() => {
    return (trendData?.days ?? []).slice(-7);
  }, [trendData]);

  const maxDayVolume = useMemo(() => {
    let max = 1;
    recentDays.forEach((d) => {
      if (d.income > max) max = d.income;
      if (d.expense > max) max = d.expense;
    });
    return max;
  }, [recentDays]);

  async function handleRefresh() {
    await Promise.all([
      refetchOverview(),
      refetchCategory(),
      refetchTrend(),
      refetchAccount(),
    ]);
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="w-full border-b border-border bg-background">
        <View className="w-full max-w-5xl mx-auto px-5 md:px-8 pt-4 pb-4">
          <Text className="font-heading text-2xl text-foreground">Analysis</Text>
          <Text className="text-xs text-muted-foreground mt-0.5">
            Cash flow trends, savings rate & spending breakdown
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="items-center px-4 md:px-8 py-5 pb-32"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        <View className="w-full max-w-5xl gap-5">
          {/* Period Filter Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="-mx-1"
          >
            <View className="flex-row gap-2 px-1">
              {PERIOD_OPTIONS.map((opt) => {
                const isSelected = period === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => setPeriod(opt.value)}
                    className={`rounded-full px-4 py-2 border shrink-0 ${
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    }`}
                  >
                    <Text
                      numberOfLines={1}
                      className={`text-xs font-semibold shrink-0 ${
                        isSelected
                          ? "text-primary-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Content / Skeleton */}
          {isLoading ? (
            <AnalysisSkeleton />
          ) : (
            <View className="gap-5">
              {/* 3 Core Metric Stat Cards */}
              <View className="flex-row gap-3">
                <Card className="flex-1 bg-card border border-border/80">
                  <CardContent className="p-3.5 gap-1">
                    <Text className="text-[11px] font-medium uppercase text-muted-foreground">
                      Income
                    </Text>
                    <Text className="font-mono text-base font-bold text-positive">
                      {formatCurrency(income, user?.currency ?? "USD")}
                    </Text>
                  </CardContent>
                </Card>

                <Card className="flex-1 bg-card border border-border/80">
                  <CardContent className="p-3.5 gap-1">
                    <Text className="text-[11px] font-medium uppercase text-muted-foreground">
                      Expense
                    </Text>
                    <Text className="font-mono text-base font-bold text-negative">
                      {formatCurrency(expense, user?.currency ?? "USD")}
                    </Text>
                  </CardContent>
                </Card>

                <Card className="flex-1 bg-card border border-border/80">
                  <CardContent className="p-3.5 gap-1">
                    <Text className="text-[11px] font-medium uppercase text-muted-foreground">
                      Net Cash
                    </Text>
                    <Text
                      className={`font-mono text-base font-bold ${
                        net >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {net >= 0 ? "+" : ""}
                      {formatCurrency(net, user?.currency ?? "USD")}
                    </Text>
                  </CardContent>
                </Card>
              </View>

              {/* Savings Rate & Financial Health Card */}
              <Card className="bg-card border border-border/80">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Feather name="shield" size={14} color={theme.primary} />
                      </View>
                      <Text className="text-sm font-semibold text-foreground">
                        Savings Efficiency
                      </Text>
                    </View>
                    <View
                      className={`rounded-md px-2.5 py-0.5 ${
                        net >= 0 ? "bg-positive/10" : "bg-negative/10"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          net >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {net >= 0 ? `${savingsRate}% Saved` : "Deficit"}
                      </Text>
                    </View>
                  </View>

                  <ProgressBar
                    value={savingsRate}
                    max={100}
                    color={savingsRate >= 20 ? theme.positive : "#d97706"}
                  />

                  <View className="flex-row justify-between items-center text-xs">
                    <Text className="text-xs text-muted-foreground">
                      {net >= 0
                        ? savingsRate >= 20
                          ? "Great job! Exceeding the 20% savings rule."
                          : "Aim to save at least 20% of your income."
                        : "Expenses exceeded total income this period."}
                    </Text>
                  </View>
                </CardContent>
              </Card>

              {/* 2-Column Grid on Tablet / Landscape */}
              <View className="flex-col md:flex-row gap-5">
                {/* Left Column: Category Breakdown */}
                <View className="flex-1 gap-5">
                  <Card className="bg-card border border-border/80">
                    <CardContent className="p-5 gap-4">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-negative/10">
                            <Feather name="pie-chart" size={14} color={theme.negative} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Spending by Category
                          </Text>
                        </View>
                        <Text className="font-mono text-xs font-semibold text-muted-foreground">
                          {expenseCategories.length} categories
                        </Text>
                      </View>

                      {expenseCategories.length === 0 ? (
                        <View className="items-center justify-center py-6">
                          <Text className="text-xs text-muted-foreground">
                            No expense records recorded in this period.
                          </Text>
                        </View>
                      ) : (
                        <View className="gap-3.5">
                          {expenseCategories.map((item) => {
                            const name =
                              categoryMap.get(item.categoryId) ?? "General Expense";
                            const pct = Math.round(
                              (item.total / totalCategoryExpense) * 100,
                            );

                            return (
                              <View key={item.categoryId} className="gap-1.5">
                                <View className="flex-row justify-between items-center">
                                  <Text className="text-xs font-semibold text-foreground">
                                    {name}
                                  </Text>
                                  <View className="flex-row items-center gap-2">
                                    <Text className="font-mono text-xs font-bold text-foreground">
                                      {formatCurrency(item.total, user?.currency ?? "USD")}
                                    </Text>
                                    <Text className="font-mono text-[11px] text-muted-foreground w-9 text-right">
                                      {pct}%
                                    </Text>
                                  </View>
                                </View>
                                <ProgressBar value={item.total} max={totalCategoryExpense} />
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </CardContent>
                  </Card>
                </View>

                {/* Right Column: Timeline & Accounts */}
                <View className="flex-1 gap-5">
                  {/* Cash Flow Daily Timeline Bars */}
                  {recentDays.length > 0 && (
                    <Card className="bg-card border border-border/80">
                      <CardContent className="p-5 gap-4">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                              <Feather name="bar-chart-2" size={14} color={theme.primary} />
                            </View>
                            <Text className="text-sm font-semibold text-foreground">
                              Cash Flow Timeline
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-3">
                            <View className="flex-row items-center gap-1.5">
                              <View className="h-2.5 w-2.5 rounded-sm bg-positive" />
                              <Text className="text-[10px] text-muted-foreground">Income</Text>
                            </View>
                            <View className="flex-row items-center gap-1.5">
                              <View className="h-2.5 w-2.5 rounded-sm bg-negative" />
                              <Text className="text-[10px] text-muted-foreground">Expense</Text>
                            </View>
                          </View>
                        </View>

                        <View className="flex-row items-end justify-between h-32 pt-4 border-b border-border/60 pb-2">
                          {recentDays.map((day) => {
                            const incHeight = Math.max(
                              4,
                              Math.round((day.income / maxDayVolume) * 80),
                            );
                            const expHeight = Math.max(
                              4,
                              Math.round((day.expense / maxDayVolume) * 80),
                            );
                            const dayLabel = new Date(day.date).toLocaleDateString(
                              undefined,
                              { weekday: "short" },
                            );

                            return (
                              <View key={day.date} className="items-center gap-1 flex-1">
                                <View className="flex-row items-end gap-1 h-24">
                                  {day.income > 0 ? (
                                    <View
                                      style={{ height: incHeight }}
                                      className="w-2.5 rounded-t bg-positive"
                                    />
                                  ) : null}
                                  {day.expense > 0 ? (
                                    <View
                                      style={{ height: expHeight }}
                                      className="w-2.5 rounded-t bg-negative"
                                    />
                                  ) : null}
                                </View>
                                <Text className="text-[10px] text-muted-foreground">
                                  {dayLabel}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </CardContent>
                    </Card>
                  )}

                  {/* Account Distribution Card */}
                  {Boolean(accountData?.accounts?.length) && (
                    <Card className="bg-card border border-border/80">
                      <CardContent className="p-5 gap-3.5">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Feather name="credit-card" size={14} color={theme.primary} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Account Activity Distribution
                          </Text>
                        </View>

                        <View className="gap-3">
                          {accountData!.accounts.map((acc) => (
                            <View
                              key={acc.accountId}
                              className="flex-row items-center justify-between rounded-lg bg-muted/40 p-3"
                            >
                              <View className="flex-1 pr-2">
                                <Text className="text-xs font-semibold text-foreground">
                                  {acc.name}
                                </Text>
                              </View>
                              <View className="flex-row items-center gap-3">
                                <Text className="font-mono text-xs font-semibold text-positive">
                                  +{formatCurrency(acc.income, user?.currency ?? "USD")}
                                </Text>
                                <Text className="font-mono text-xs font-semibold text-negative">
                                  -{formatCurrency(acc.expense, user?.currency ?? "USD")}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </CardContent>
                    </Card>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
