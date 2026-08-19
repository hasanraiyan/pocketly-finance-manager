import React, { useEffect, useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { useObserve } from "expo-observe";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import {
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
import { type Account } from "@/features/accounts/hooks";
import { BudgetModal } from "@/features/budgets/BudgetModal";
import { type Budget } from "@/features/budgets/hooks";
import { DashboardSkeleton } from "@/features/dashboard/DashboardSkeleton";
import { GoalModal } from "@/features/goals/GoalModal";
import { type Goal } from "@/features/goals/hooks";
import { type Transaction } from "@/features/transactions/hooks";
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

const HEALTH_BAND_COPY = {
  strong: "Comfortable, with room to spare.",
  steady: "Holding together, with a couple of soft spots.",
  fragile: "Working, but there's not much slack.",
  strained: "Under pressure — worth a look at the components below.",
} as const;

interface SafeToSpendData {
  amount: number;
  totalBalance: number;
  expectedIncome: number;
  shortfall: number;
  reserveIsDerived: boolean;
  deductions: {
    key: string;
    label: string;
    amount: number;
  }[];
}

interface HealthData {
  score: number;
  band: "strong" | "steady" | "fragile" | "strained";
  components: {
    key: string;
    label: string;
    score: number;
    weight: number;
    reason: string;
  }[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const { isGuest, user } = useAuth();
  const client = usePocketlyClient();

  const [checklistDismissed, setChecklistDismissed] = useState(false);

  // Modals state for dashboard quick actions
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [goalModalVisible, setGoalModalVisible] = useState(false);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard", isGuest, user?._id ?? "anon"],
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
        const currency = savedProfile?.currency || "INR";
        const name = savedProfile?.name || "Guest User";

        // Calculate Offline Safe to Spend for Guest mode
        const remainingBudgets = budgets.reduce((sum, b) => sum + Math.max(0, b.amount - (b.spent || 0)), 0);
        const safeAmount = Math.max(0, totalBalance - remainingBudgets);
        const safeShortfall = totalBalance < remainingBudgets ? remainingBudgets - totalBalance : 0;

        const safeToSpend: SafeToSpendData = {
          amount: safeAmount,
          totalBalance,
          expectedIncome: 0,
          shortfall: safeShortfall,
          reserveIsDerived: false,
          deductions: remainingBudgets > 0 ? [{
            key: "budget_commitments",
            label: "Remaining monthly budgets",
            amount: remainingBudgets,
          }] : [],
        };

        // Offline Health score estimation
        let healthScore = 70;
        if (overview.income > 0) {
          const savingsRate = ((overview.income - overview.expense) / overview.income) * 100;
          healthScore = Math.min(100, Math.max(20, Math.round(savingsRate * 1.5 + 40)));
        }
        const healthBand: "strong" | "steady" | "fragile" | "strained" =
          healthScore >= 80 ? "strong" : healthScore >= 60 ? "steady" : healthScore >= 40 ? "fragile" : "strained";

        const health: HealthData = {
          score: healthScore,
          band: healthBand,
          components: [
            {
              key: "budget_control",
              label: "Budget Control",
              score: totalSpent <= totalBudgeted ? 85 : 45,
              weight: 0.3,
              reason: totalBudgeted > 0 ? "Tracking against category budgets" : "Add budgets to improve control",
            },
            {
              key: "savings_rate",
              label: "Savings Rate",
              score: healthScore,
              weight: 0.35,
              reason: overview.income > 0 ? `${Math.round(overview.income > 0 ? ((overview.income - overview.expense) / overview.income) * 100 : 0)}% net income retained this month` : "Log income to track savings",
            },
          ],
        };

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
          safeToSpend,
          health,
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
        safeRes,
        healthRes,
        forecastRes,
      ] = await Promise.all([
        client.GET("/users/me"),
        client.GET("/analysis", { params: { query: { period: "this_month" } } }),
        client.GET("/accounts", { params: { query: { limit: 100 } } }),
        client.GET("/budgets", { params: { query: { limit: 100 } } }),
        client.GET("/transactions", { params: { query: { limit: 10 } } }),
        client.GET("/goals", { params: { query: { limit: 100 } } }),
        client.GET("/categories", { params: { query: { limit: 100 } } }),
        client.GET("/intelligence/safe-to-spend").catch(() => ({ data: null })),
        client.GET("/intelligence/health").catch(() => ({ data: null })),
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
      const rawSafe = safeRes?.data?.data;
      const rawHealth = healthRes?.data?.data;

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

      const safeToSpend: SafeToSpendData | null = rawSafe
        ? {
            amount: rawSafe.amount,
            totalBalance: rawSafe.totalBalance,
            expectedIncome: rawSafe.expectedIncome,
            shortfall: rawSafe.shortfall,
            reserveIsDerived: rawSafe.reserveIsDerived,
            deductions: rawSafe.deductions,
          }
        : {
            amount: totalBalance,
            totalBalance,
            expectedIncome: 0,
            shortfall: 0,
            reserveIsDerived: false,
            deductions: [],
          };

      const health: HealthData | null = rawHealth
        ? {
            score: rawHealth.score,
            band: rawHealth.band,
            components: rawHealth.components,
          }
        : null;

      return {
        currency: profile.currency ?? accounts[0]?.currency ?? "INR",
        name: profile.name ?? "User",
        firstName: (profile.name ?? "User").split(" ")[0],
        overview,
        accounts,
        budgets,
        transactions,
        goals,
        categories,
        safeToSpend,
        health,
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

  const { markInteractive } = useObserve();

  useEffect(() => {
    if (!isLoading) {
      markInteractive();
    }
  }, [isLoading, markInteractive]);

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
        <View className="w-full max-w-5xl mx-auto flex-row items-center justify-between px-5 md:px-8 pt-4 pb-4">
          <View>
            <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {greeting}
            </Text>
            <Text className="font-heading text-2xl text-foreground">
              {data?.firstName ? `Hi ${data.firstName}` : "Dashboard"}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/(app)/settings")}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full bg-card border border-border/80 active:opacity-75"
          >
            <Feather name="settings" size={17} color={theme.foreground} />
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

              {/* 2. Web-matching Safe to Spend Hero Emerald Card */}
              {Boolean(data.safeToSpend) && (
                <View className="w-full rounded-3xl bg-primary p-6 md:p-8 shadow-sm">
                  <View className="flex-col gap-5">
                    {/* Header Label */}
                    <View className="flex-row items-center justify-between">
                      <View className="gap-1">
                        <Text className="text-[11px] font-bold uppercase tracking-wider text-primary-foreground/75">
                          Safe to Spend
                        </Text>
                        <Text className="text-xs text-primary-foreground/60">
                          Your balance, after bills, budgets and goals still to come.
                        </Text>
                      </View>
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/10">
                        <Feather name="shield" size={15} color={theme.primaryForeground} />
                      </View>
                    </View>

                    {/* Big Amount */}
                    <Text className="font-heading text-4xl md:text-5xl font-bold tracking-tight text-primary-foreground tabular-nums">
                      {formatCurrency(data.safeToSpend.amount, data.currency)}
                    </Text>

                    {/* Shortfall warning if any */}
                    {data.safeToSpend.shortfall > 0 && (
                      <View className="rounded-xl bg-amber-500/20 border border-amber-400/30 p-2.5">
                        <Text className="text-xs text-amber-200">
                          You&apos;re {formatCurrency(data.safeToSpend.shortfall, data.currency)} short of what you&apos;ve committed this month.
                        </Text>
                      </View>
                    )}

                    {/* Deductions Breakdown */}
                    <View className="gap-2 border-t border-primary-foreground/15 pt-4">
                      <View className="flex-row justify-between items-center">
                        <Text className="text-xs text-primary-foreground/70">
                          Total Balance
                        </Text>
                        <Text className="font-mono text-xs font-semibold text-primary-foreground tabular-nums">
                          {formatCurrency(data.safeToSpend.totalBalance, data.currency)}
                        </Text>
                      </View>

                      {data.safeToSpend.expectedIncome > 0 && (
                        <View className="flex-row justify-between items-center">
                          <Text className="text-xs text-primary-foreground/70">
                            Still coming in
                          </Text>
                          <Text className="font-mono text-xs font-semibold text-emerald-300 tabular-nums">
                            +{formatCurrency(data.safeToSpend.expectedIncome, data.currency)}
                          </Text>
                        </View>
                      )}

                      {data.safeToSpend.deductions.map((d) => (
                        <View key={d.key} className="flex-row justify-between items-center">
                          <Text className="text-xs text-primary-foreground/70">
                            {d.label}
                          </Text>
                          <Text className="font-mono text-xs font-semibold text-rose-300 tabular-nums">
                            -{formatCurrency(d.amount, data.currency)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Quick Action Pills in Hero */}
                    <View className="flex-row gap-2 pt-3 border-t border-primary-foreground/15">
                      <Pressable
                        onPress={() => setTxModalVisible(true)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary-foreground/15 py-2.5 active:opacity-75"
                      >
                        <Feather name="plus" size={14} color={theme.primaryForeground} />
                        <Text className="text-xs font-semibold text-primary-foreground">
                          Record
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setAccountModalVisible(true)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary-foreground/15 py-2.5 active:opacity-75"
                      >
                        <Feather name="credit-card" size={14} color={theme.primaryForeground} />
                        <Text className="text-xs font-semibold text-primary-foreground">
                          Account
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setBudgetModalVisible(true)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary-foreground/15 py-2.5 active:opacity-75"
                      >
                        <Feather name="pie-chart" size={14} color={theme.primaryForeground} />
                        <Text className="text-xs font-semibold text-primary-foreground">
                          Budget
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => setGoalModalVisible(true)}
                        className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-primary-foreground/15 py-2.5 active:opacity-75"
                      >
                        <Feather name="award" size={14} color={theme.primaryForeground} />
                        <Text className="text-xs font-semibold text-primary-foreground">
                          Goal
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* 3. Two-Column Grid: Balance & Intelligence */}
              <View className="flex-col md:flex-row gap-5">
                {/* Left Column: Total Balance & Cash Flow Ribbon */}
                <View className="flex-1 gap-5">
                  <Card className="bg-card border border-border/80">
                    <CardContent className="gap-4">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Total Balance
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                          Across every account
                        </Text>
                      </View>

                      <Text className="font-mono text-3xl font-bold tracking-tight text-foreground">
                        {formatCurrency(data.totalBalance, data.currency)}
                      </Text>

                      {/* Cash Flow summary ribbon */}
                      <View className="flex-row justify-between items-center pt-3 border-t border-border/60">
                        <View>
                          <Text className="text-[10px] uppercase font-medium text-muted-foreground">
                            Income
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
                    </CardContent>
                  </Card>

                  {/* 4. Health Score Card */}
                  {Boolean(data.health) && (
                    <Card className="bg-card border border-border/80">
                      <CardContent className="gap-4">
                        <View className="flex-row items-center justify-between">
                          <View>
                            <Text className="text-sm font-semibold text-foreground">
                              Pocketly Health Score
                            </Text>
                            <Text className="text-xs text-muted-foreground mt-0.5">
                              {HEALTH_BAND_COPY[data.health!.band] ?? "Financial wellness reading"}
                            </Text>
                          </View>
                          <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                            <Feather name="activity" size={16} color={theme.primary} />
                          </View>
                        </View>

                        <View className="flex-row items-baseline gap-1.5">
                          <Text className="font-heading text-3xl font-bold text-foreground tabular-nums">
                            {data.health!.score}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            out of 100
                          </Text>
                        </View>

                        <View className="gap-3 border-t border-border/60 pt-3">
                          {data.health!.components.map((comp) => (
                            <View key={comp.key} className="gap-1">
                              <View className="flex-row justify-between items-center">
                                <Text className="text-xs font-medium text-foreground">
                                  {comp.label}
                                </Text>
                                <Text className="font-mono text-xs text-muted-foreground">
                                  {comp.score}%
                                </Text>
                              </View>
                              <ProgressBar value={comp.score} max={100} />
                              <Text className="text-[10px] text-muted-foreground">
                                {comp.reason}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </CardContent>
                    </Card>
                  )}

                  {/* 5. Forecast Card */}
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
                </View>

                {/* Right Column: Budgets, Goals & Recent Records */}
                <View className="flex-1 gap-5">
                  {/* Monthly Budgets */}
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

                  {/* Savings Goals */}
                  {data.goals.length > 0 && (
                    <Card>
                      <CardContent className="gap-3.5">
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <View className="h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                              <Feather name="award" size={14} color={theme.primary} />
                            </View>
                            <Text className="text-sm font-semibold text-foreground">
                              Savings Goals
                            </Text>
                          </View>

                          <Pressable
                            onPress={() => router.push("/(app)/planning")}
                            hitSlop={6}
                          >
                            <Text className="text-xs font-semibold text-primary">
                              View all →
                            </Text>
                          </Pressable>
                        </View>

                        <View className="gap-3">
                          {data.goals.slice(0, 3).map((goal) => {
                            const progress = goal.savedAmount || 0;
                            const target = goal.targetAmount || 1;
                            const pct = Math.min(100, Math.round((progress / target) * 100));

                            return (
                              <View key={goal._id} className="gap-1.5">
                                <View className="flex-row justify-between items-center">
                                  <Text className="text-xs font-medium text-foreground">
                                    {goal.name}
                                  </Text>
                                  <Text className="font-mono text-xs text-muted-foreground">
                                    {formatCurrency(progress, data.currency)} / {formatCurrency(target, data.currency)}
                                  </Text>
                                </View>
                                <ProgressBar value={progress} max={target} />
                                <View className="flex-row justify-between items-center">
                                  <Text className="text-[10px] text-muted-foreground">
                                    {goal.targetDate ? `Target: ${formatDate(goal.targetDate)}` : "Ongoing goal"}
                                  </Text>
                                  <Text className="text-[10px] font-mono font-medium text-foreground">
                                    {pct}%
                                  </Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Records Feed */}
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
                          {data.transactions.slice(0, 5).map((tx) => {
                            const isIncome = tx.type === "income";
                            const isTransfer = tx.type === "transfer";
                            const accountName = accountMap.get(tx.accountId) ?? "Account";
                            const categoryName = tx.categoryId
                              ? categoryMap.get(tx.categoryId)?.name
                              : undefined;

                            return (
                              <View
                                key={tx._id}
                                className="flex-row items-center justify-between p-3 rounded-xl bg-card border border-border/70"
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
                                  className={`font-mono text-xs font-bold tabular-nums ${
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
        defaultCurrency={data?.currency ?? "INR"}
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
