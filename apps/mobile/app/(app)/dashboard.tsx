import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { GuestWelcomeModal } from "@/components/GuestWelcomeModal";
import { ProgressBar } from "@/components/ProgressBar";
import { AccountModal } from "@/features/accounts/AccountModal";
import {
  resolveAccountIconKey,
  ACCOUNT_ICONS,
  type AccountType,
} from "@/features/accounts/account-icons";
import { type Account } from "@/features/accounts/hooks";
import { BudgetModal } from "@/features/budgets/BudgetModal";
import { type Budget } from "@/features/budgets/hooks";
import { DashboardSkeleton } from "@/features/dashboard/DashboardSkeleton";
import { GoalModal } from "@/features/goals/GoalModal";
import { type Goal } from "@/features/goals/hooks";
import {
  useCreateTransaction,
  useTransactions,
  type Transaction,
} from "@/features/transactions/hooks";
import { TransactionModal } from "@/features/transactions/TransactionModal";
import { usePocketlyClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getLocalAccounts,
  getLocalBudgets,
  getLocalCategories,
  getLocalGoals,
  getLocalOverview,
  getLocalTransactions,
} from "@/lib/local-storage-adapter";
import { safeStorage } from "@/lib/safe-storage";
import { theme } from "@/lib/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const { isGuest } = useAuth();
  const client = usePocketlyClient();

  const [checklistDismissed, setChecklistDismissed] = useState(false);

  // Modals state for dashboard quick actions
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard", isGuest],
    queryFn: async () => {
      if (isGuest) {
        const [
          accounts,
          budgets,
          transactions,
          goals,
          categories,
          overview,
        ] = await Promise.all([
          getLocalAccounts(),
          getLocalBudgets(),
          getLocalTransactions(),
          getLocalGoals(),
          getLocalCategories(),
          getLocalOverview(),
        ]);

        const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
        const totalBudgeted = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
        const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);

        const savedProfileRaw = await safeStorage.getItem("POCKETLY_GUEST_PROFILE");
        const savedProfile = savedProfileRaw ? JSON.parse(savedProfileRaw) : null;
        const currency = savedProfile?.currency || "USD";
        const name = savedProfile?.name || "Guest User";

        return {
          currency,
          name,
          firstName: name.split(" ")[0],
          overview: {
            income: overview.income,
            expense: overview.expense,
            net: overview.net,
            savingsRate: overview.income > 0 ? ((overview.income - overview.expense) / overview.income) * 100 : 0,
          },
          accounts: accounts as unknown as Account[],
          budgets: budgets as unknown as Budget[],
          transactions: transactions as unknown as Transaction[],
          goals: goals as unknown as Goal[],
          categories,
          forecast: null,
          totalBalance,
          totalBudgeted,
          totalSpent,
        };
      }

      const [
        profileRes,
        overviewRes,
        accountsRes,
        budgetsRes,
        transactionsRes,
        goalsRes,
        categoriesRes,
        forecastRes,
      ] = await Promise.all([
        client.GET("/users/me"),
        client.GET("/analysis", { params: { query: { period: "this_month" } } }),
        client.GET("/accounts", { params: { query: { limit: 100 } } }),
        client.GET("/budgets", { params: { query: { limit: 100 } } }),
        client.GET("/transactions", { params: { query: { limit: 10 } } }),
        client.GET("/goals", { params: { query: { limit: 100 } } }),
        client.GET("/categories", { params: { query: { limit: 100 } } }),
        client.GET("/intelligence/forecast").catch(() => ({ data: null })),
      ]);

      if (profileRes.error || !profileRes.data) {
        throw new Error("Couldn't load dashboard data");
      }

      const profile = profileRes.data.data;
      const accounts = accountsRes.data?.data?.items ?? [];
      const budgets = budgetsRes.data?.data?.items ?? [];
      const transactions = transactionsRes.data?.data?.items ?? [];
      const goals = goalsRes.data?.data?.items ?? [];
      const categories = categoriesRes.data?.data?.items ?? [];
      const overview = overviewRes.data?.data;
      const rawForecast = forecastRes?.data?.data;

      // Do NOT show forecast if all 3 projected numbers are 0
      const hasMeaningfulForecast =
        rawForecast &&
        !(
          rawForecast.projectedIncome === 0 &&
          rawForecast.projectedExpense === 0 &&
          rawForecast.projectedDiscretionary === 0
        );

      const forecast = hasMeaningfulForecast ? rawForecast : null;

      const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
      const totalBudgeted = budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
      const totalSpent = budgets.reduce((sum, b) => sum + (b.spent || 0), 0);

      return {
        currency: profile.currency ?? "USD",
        name: profile.name ?? "User",
        firstName: (profile.name ?? "User").split(" ")[0],
        overview,
        accounts,
        budgets,
        transactions,
        goals,
        categories,
        forecast,
        totalBalance,
        totalBudgeted,
        totalSpent,
      };
    },
  });

  const categoryMap = useMemo(() => {
    return new Map((data?.categories ?? []).map((c) => [c._id, c]));
  }, [data?.categories]);

  const accountMap = useMemo(() => {
    return new Map((data?.accounts ?? []).map((a) => [a._id, a.name]));
  }, [data?.accounts]);

  // Greeting time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Checklist items
  const checklist = useMemo(() => {
    if (!data) return [];
    return [
      {
        id: "account",
        label: "Link your first account",
        done: data.accounts.length > 0,
        action: () => setAccountModalVisible(true),
      },
      {
        id: "transaction",
        label: "Record your first expense or income",
        done: data.transactions.length > 0,
        action: () => setTxModalVisible(true),
      },
      {
        id: "budget",
        label: "Set a monthly category budget",
        done: data.budgets.length > 0,
        action: () => setBudgetModalVisible(true),
      },
      {
        id: "goal",
        label: "Create a savings goal",
        done: data.goals.length > 0,
        action: () => setGoalModalVisible(true),
      },
    ];
  }, [data]);

  const completedSteps = checklist.filter((s) => s.done).length;
  const isAllDone = completedSteps === checklist.length;

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="w-full border-b border-border bg-background">
        <View className="w-full max-w-5xl mx-auto flex-row items-center justify-between px-5 md:px-8 pt-16 pb-4">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {greeting}
            </Text>
            <Text className="font-heading text-2xl text-foreground">
              {data?.firstName ? `Hi ${data.firstName}` : "Dashboard"}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(app)/settings")}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-muted/60 active:opacity-75"
          >
            <Feather name="settings" size={18} color={theme.foreground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerClassName="items-center px-4 md:px-8 py-5 pb-32"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      >
        <View className="w-full max-w-5xl gap-5">
          {isLoading && !isRefetching ? (
            <DashboardSkeleton />
          ) : isError || !data ? (
            <View className="items-center justify-center rounded-2xl bg-card border border-border p-8 text-center">
              <Feather name="alert-circle" size={32} color={theme.negative} />
              <Text className="mt-3 font-heading text-lg text-foreground">
                Couldn&apos;t load dashboard
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground mb-4">
                Pull down or tap retry to connect with Pocketly.
              </Text>
              <Button variant="outline" onPress={() => refetch()}>
                Retry
              </Button>
            </View>
          ) : (
            <>
              {/* 1. Onboarding Checklist (if not complete & not dismissed) */}
              {!checklistDismissed && !isAllDone && (
                <Card className="bg-card border border-primary/30">
                  <CardContent className="gap-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-2">
                        <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                          <Feather name="check-circle" size={14} color={theme.primary} />
                        </View>
                        <Text className="text-sm font-semibold text-foreground">
                          Getting Started ({completedSteps}/{checklist.length})
                        </Text>
                      </View>

                      <Pressable
                        onPress={() => setChecklistDismissed(true)}
                        hitSlop={6}
                      >
                        <Text className="text-xs text-muted-foreground">Dismiss</Text>
                      </Pressable>
                    </View>

                    <ProgressBar value={completedSteps} max={checklist.length} />

                    <View className="flex-col md:flex-row gap-2 mt-1">
                      {checklist.map((step) => (
                        <Pressable
                          key={step.id}
                          onPress={step.done ? undefined : step.action}
                          className={`flex-1 flex-row items-center justify-between p-2.5 rounded-xl border ${
                            step.done
                              ? "bg-muted/20 border-border/40 opacity-60"
                              : "bg-card border-border active:opacity-75"
                          }`}
                        >
                          <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                            <View
                              className={`h-5 w-5 items-center justify-center rounded-full ${
                                step.done ? "bg-positive" : "border border-border"
                              }`}
                            >
                              {step.done && (
                                <Feather name="check" size={11} color="#ffffff" />
                              )}
                            </View>
                            <Text
                              className={`text-xs ${
                                step.done
                                  ? "text-muted-foreground line-through"
                                  : "font-medium text-foreground"
                              }`}
                            >
                              {step.label}
                            </Text>
                          </View>

                          {!step.done && (
                            <Feather
                              name="chevron-right"
                              size={14}
                              color={theme.mutedForeground}
                            />
                          )}
                        </Pressable>
                      ))}
                    </View>
                  </CardContent>
                </Card>
              )}

              {/* Responsive 2-Column Grid on Tablet / Landscape */}
              <View className="flex-col md:flex-row gap-5">
                {/* Left Column: Hero Balance & Quick Actions */}
                <View className="flex-1 gap-5">
                  <Card className="bg-card border border-border/80">
                    <CardContent className="gap-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Total Net Worth
                        </Text>
                        <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <Feather name="credit-card" size={14} color={theme.primary} />
                        </View>
                      </View>

                      <Text className="font-mono text-3xl font-bold tracking-tight text-foreground">
                        {formatCurrency(data.totalBalance, data.currency)}
                      </Text>

                      {/* Cash Flow summary ribbon */}
                      <View className="flex-row justify-between items-center pt-3 border-t border-border/60">
                        <View>
                          <Text className="text-[10px] uppercase font-medium text-muted-foreground">
                            This Month Income
                          </Text>
                          <Text className="font-mono text-xs font-bold text-positive mt-0.5">
                            +{formatCurrency(data.overview?.income ?? 0, data.currency)}
                          </Text>
                        </View>

                        <View>
                          <Text className="text-[10px] uppercase font-medium text-muted-foreground">
                            Expenses
                          </Text>
                          <Text className="font-mono text-xs font-bold text-negative mt-0.5">
                            -{formatCurrency(data.overview?.expense ?? 0, data.currency)}
                          </Text>
                        </View>

                        <View className="items-end">
                          <Text className="text-[10px] uppercase font-medium text-muted-foreground">
                            Net Flow
                          </Text>
                          <Text
                            className={`font-mono text-xs font-bold mt-0.5 ${
                              (data.overview?.net ?? 0) >= 0
                                ? "text-positive"
                                : "text-negative"
                            }`}
                          >
                            {(data.overview?.net ?? 0) >= 0 ? "+" : ""}
                            {formatCurrency(data.overview?.net ?? 0, data.currency)}
                          </Text>
                        </View>
                      </View>

                      {/* 4 Quick Action Buttons */}
                      <View className="flex-row gap-2 pt-2 border-t border-border/60">
                        <Pressable
                          onPress={() => setTxModalVisible(true)}
                          className="flex-1 items-center justify-center rounded-xl bg-primary py-2.5 active:opacity-80"
                        >
                          <Feather name="plus" size={14} color={theme.primaryForeground} />
                          <Text className="text-[11px] font-semibold text-primary-foreground mt-0.5">
                            Record
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setAccountModalVisible(true)}
                          className="flex-1 items-center justify-center rounded-xl bg-muted/70 py-2.5 active:opacity-80"
                        >
                          <Feather name="folder-plus" size={14} color={theme.foreground} />
                          <Text className="text-[11px] font-semibold text-foreground mt-0.5">
                            Account
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setBudgetModalVisible(true)}
                          className="flex-1 items-center justify-center rounded-xl bg-muted/70 py-2.5 active:opacity-80"
                        >
                          <Feather name="pie-chart" size={14} color={theme.foreground} />
                          <Text className="text-[11px] font-semibold text-foreground mt-0.5">
                            Budget
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setGoalModalVisible(true)}
                          className="flex-1 items-center justify-center rounded-xl bg-muted/70 py-2.5 active:opacity-80"
                        >
                          <Feather name="award" size={14} color={theme.foreground} />
                          <Text className="text-[11px] font-semibold text-foreground mt-0.5">
                            Goal
                          </Text>
                        </Pressable>
                      </View>
                    </CardContent>
                  </Card>

                  {/* Forecast Card (Rendered ONLY when projected values are non-zero) */}
                  {Boolean(data.forecast) && (
                    <Card className="bg-card border border-border/80">
                      <CardContent className="gap-3.5">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                              <Feather name="trending-up" size={14} color={theme.primary} />
                            </View>
                            <Text className="text-sm font-semibold text-foreground">
                              Where this month ends
                            </Text>
                          </View>
                        </View>

                        <Text className="text-xs text-muted-foreground leading-relaxed">
                          Your repeats on their own dates, plus your average daily spend held flat for the rest of the month.
                        </Text>

                        <Text className="font-mono text-2xl font-bold text-foreground">
                          {formatCurrency(data.forecast!.projectedBalance, data.currency)}
                        </Text>

                        <View className="gap-1.5 pt-2 border-t border-border/60">
                          <View className="flex-row justify-between items-center">
                            <Text className="text-xs text-muted-foreground">Coming in</Text>
                            <Text className="font-mono text-xs text-positive font-semibold">
                              +{formatCurrency(data.forecast!.projectedIncome, data.currency)}
                            </Text>
                          </View>
                          <View className="flex-row justify-between items-center">
                            <Text className="text-xs text-muted-foreground">Repeats going out</Text>
                            <Text className="font-mono text-xs text-negative font-semibold">
                              -{formatCurrency(data.forecast!.projectedExpense, data.currency)}
                            </Text>
                          </View>
                          <View className="flex-row justify-between items-center">
                            <Text className="text-xs text-muted-foreground">Everything else, usual rate</Text>
                            <Text className="font-mono text-xs text-muted-foreground font-semibold">
                              {formatCurrency(data.forecast!.projectedDiscretionary, data.currency)}
                            </Text>
                          </View>
                        </View>
                      </CardContent>
                    </Card>
                  )}

                  {/* Monthly Budgets Overview */}
                  <Card>
                    <CardContent className="gap-3.5">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Feather name="pie-chart" size={14} color={theme.primary} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Monthly Budgets
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => router.push("/(app)/planning")}
                          hitSlop={6}
                        >
                          <Text className="text-xs font-semibold text-primary">
                            Manage →
                          </Text>
                        </Pressable>
                      </View>

                      {data.budgets.length === 0 ? (
                        <View className="items-center justify-center py-4 rounded-xl bg-muted/20 border border-border/40">
                          <Text className="text-xs text-muted-foreground text-center">
                            No category budgets set for this month.
                          </Text>
                        </View>
                      ) : (
                        <View className="gap-3">
                          {data.budgets.slice(0, 4).map((b) => {
                            const catName =
                              categoryMap.get(b.categoryId)?.name ?? "Category";
                            const isOver = (b.spent || 0) > b.amount;
                            const remaining = Math.max(0, b.amount - (b.spent || 0));

                            return (
                              <View key={b._id} className="gap-1.5">
                                <View className="flex-row justify-between items-center">
                                  <Text className="text-xs font-medium text-foreground">
                                    {catName}
                                  </Text>
                                  <Text className="font-mono text-xs text-muted-foreground">
                                    {formatCurrency(b.spent || 0, data.currency)} /{" "}
                                    {formatCurrency(b.amount, data.currency)}
                                  </Text>
                                </View>

                                <ProgressBar
                                  value={b.spent || 0}
                                  max={b.amount}
                                  color={isOver ? theme.negative : undefined}
                                />

                                <View className="flex-row justify-between items-center">
                                  <Text className="text-[10px] text-muted-foreground">
                                    {isOver ? (
                                      <Text className="text-negative font-semibold">
                                        Over budget
                                      </Text>
                                    ) : (
                                      `${formatCurrency(remaining, data.currency)} remaining`
                                    )}
                                  </Text>
                                  <Text className="text-[10px] font-mono text-muted-foreground">
                                    {Math.round(((b.spent || 0) / (b.amount || 1)) * 100)}%
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </CardContent>
                  </Card>
                </View>

                {/* Right Column: Recent Records Feed */}
                <View className="flex-1 gap-5">
                  <Card>
                    <CardContent className="gap-3.5">
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-2">
                          <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                            <Feather name="clock" size={14} color={theme.primary} />
                          </View>
                          <Text className="text-sm font-semibold text-foreground">
                            Recent Records
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => router.push("/(app)/records")}
                          hitSlop={6}
                        >
                          <Text className="text-xs font-semibold text-primary">
                            All Records →
                          </Text>
                        </Pressable>
                      </View>

                      {data.transactions.length === 0 ? (
                        <View className="items-center justify-center py-4 rounded-xl bg-muted/20 border border-border/40">
                          <Text className="text-xs text-muted-foreground text-center">
                            No records logged yet.
                          </Text>
                        </View>
                      ) : (
                        <View className="gap-2">
                          {data.transactions.slice(0, 6).map((tx) => {
                            const isIncome = tx.type === "income";
                            const isTransfer = tx.type === "transfer";
                            const accountName = accountMap.get(tx.accountId) ?? "Account";
                            const categoryName = tx.categoryId
                              ? categoryMap.get(tx.categoryId)?.name
                              : undefined;

                            return (
                              <View
                                key={tx._id}
                                className="flex-row items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/60"
                              >
                                <View className="flex-row items-center gap-3 flex-1 pr-2">
                                  <View
                                    className={`h-9 w-9 items-center justify-center rounded-xl ${
                                      isTransfer
                                        ? "bg-muted"
                                        : isIncome
                                        ? "bg-positive/10"
                                        : "bg-negative/10"
                                    }`}
                                  >
                                    <Feather
                                      name={
                                        isTransfer
                                          ? "repeat"
                                          : isIncome
                                          ? "arrow-up-right"
                                          : "arrow-down-right"
                                      }
                                      size={16}
                                      color={
                                        isTransfer
                                          ? theme.foreground
                                          : isIncome
                                          ? theme.positive
                                          : theme.negative
                                      }
                                    />
                                  </View>

                                  <View className="flex-1">
                                    <Text
                                      numberOfLines={1}
                                      className="text-xs font-semibold text-foreground"
                                    >
                                      {tx.description ||
                                        (isTransfer
                                          ? "Account Transfer"
                                          : isIncome
                                          ? "Income"
                                          : "Expense")}
                                    </Text>
                                    <View className="flex-row items-center gap-1.5 mt-0.5">
                                      <Text className="text-[10px] text-muted-foreground">
                                        {formatDate(tx.date)}
                                      </Text>
                                      <Text className="text-[10px] text-muted-foreground/60">•</Text>
                                      <Text
                                        numberOfLines={1}
                                        className="text-[10px] text-muted-foreground"
                                      >
                                        {categoryName ?? accountName}
                                      </Text>
                                    </View>
                                  </View>
                                </View>

                                <Text
                                  className={`font-mono text-xs font-bold ${
                                    isTransfer
                                      ? "text-foreground"
                                      : isIncome
                                      ? "text-positive"
                                      : "text-negative"
                                  }`}
                                >
                                  {isTransfer ? "" : isIncome ? "+" : "-"}
                                  {formatCurrency(tx.amount, data.currency)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </CardContent>
                  </Card>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Quick Action Modals */}
      <TransactionModal
        visible={txModalVisible}
        onClose={() => setTxModalVisible(false)}
      />

      <AccountModal
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        defaultCurrency={data?.currency ?? "USD"}
      />

      <BudgetModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
      />

      <GoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
      />

      {/* One-time Guest Mode Welcome & Cloud Explainer Popup */}
      <GuestWelcomeModal />
    </View>
  );
}
