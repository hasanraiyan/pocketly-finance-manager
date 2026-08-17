import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import { Card, CardContent } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { useAccounts } from "@/features/accounts/hooks";
import { BudgetModal } from "@/features/budgets/BudgetModal";
import {
  useBudgets,
  useDeleteBudget,
  type Budget,
} from "@/features/budgets/hooks";
import { PlanningSkeleton } from "@/features/budgets/PlanningSkeleton";
import { useCategories } from "@/features/categories/hooks";
import { ContributeModal } from "@/features/goals/ContributeModal";
import { GoalModal } from "@/features/goals/GoalModal";
import {
  useDeleteGoal,
  useGoals,
  type Goal,
} from "@/features/goals/hooks";
import {
  useDeleteMoneyRule,
  useMoneyRules,
  useUpdateMoneyRule,
  type MoneyRule,
} from "@/features/money-rules/hooks";
import { MoneyRuleModal } from "@/features/money-rules/MoneyRuleModal";
import { useAuth } from "@/lib/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { theme } from "@/lib/theme";

type PlanningTab = "budgets" | "goals" | "alerts";

const STATUS_CONFIG: Record<
  Goal["status"],
  { label: string; bg: string; text: string }
> = {
  complete: { label: "Done", bg: "bg-positive/10", text: "text-positive" },
  on_track: { label: "On Track", bg: "bg-primary/10", text: "text-primary" },
  at_risk: { label: "Behind", bg: "bg-negative/10", text: "text-negative" },
  overdue: { label: "Overdue", bg: "bg-negative/15", text: "text-negative" },
  stalled: { label: "Stalled", bg: "bg-muted", text: "text-muted-foreground" },
};

function describeRule(
  rule: MoneyRule,
  currency: string,
  categoryName?: string,
): string {
  const amount = formatCurrency(rule.threshold ?? 0, currency);
  switch (rule.kind) {
    case "balance_under":
      return `Balance drops below ${amount}`;
    case "category_over":
      return `${categoryName ?? "Category"} spending exceeds ${amount}`;
    case "large_transaction":
      return `Any single expense greater than ${amount}`;
    case "weekly_summary":
      return rule.cadenceDays === 7
        ? "Weekly financial summary digest"
        : `Financial summary every ${rule.cadenceDays} days`;
    case "goal_progress":
      return rule.cadenceDays === 7
        ? "Weekly savings goals check-in"
        : `Goals check-in every ${rule.cadenceDays} days`;
    default:
      return rule.kind;
  }
}

export default function PlanningScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PlanningTab>("budgets");

  const {
    data: budgets = [],
    isLoading: budgetsLoading,
    refetch: refetchBudgets,
    isRefetching: budgetsRefetching,
  } = useBudgets();

  const {
    data: goals = [],
    isLoading: goalsLoading,
    refetch: refetchGoals,
    isRefetching: goalsRefetching,
  } = useGoals();

  const {
    data: moneyRules = [],
    isLoading: rulesLoading,
    refetch: refetchRules,
    isRefetching: rulesRefetching,
  } = useMoneyRules();

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  const deleteBudget = useDeleteBudget();
  const deleteGoal = useDeleteGoal();
  const updateRule = useUpdateMoneyRule();
  const deleteRule = useDeleteMoneyRule();

  // Modals state
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  const [goalModalVisible, setGoalModalVisible] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [contributeModalVisible, setContributeModalVisible] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<Goal | null>(null);

  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [selectedRule, setSelectedRule] = useState<MoneyRule | null>(null);

  const isRefetching = budgetsRefetching || goalsRefetching || rulesRefetching;
  const isLoading =
    (budgetsLoading || goalsLoading || rulesLoading) && !isRefetching;

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c._id, c.name]));
  }, [categories]);

  // Aggregate totals
  const totalBudgeted = useMemo(() => {
    return budgets.reduce((sum, b) => sum + (b.amount || 0), 0);
  }, [budgets]);

  const totalSpent = useMemo(() => {
    return budgets.reduce((sum, b) => sum + (b.spent || 0), 0);
  }, [budgets]);

  const totalGoalsTarget = useMemo(() => {
    return goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  }, [goals]);

  const totalGoalsSaved = useMemo(() => {
    return goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
  }, [goals]);

  function handleAddBudget() {
    setSelectedBudget(null);
    setBudgetModalVisible(true);
  }

  function handleEditBudget(b: Budget) {
    setSelectedBudget(b);
    setBudgetModalVisible(true);
  }

  function handleDeleteBudget(b: Budget) {
    const catName = categoryMap.get(b.categoryId) ?? "this category";
    Alert.alert(
      `Delete Budget for ${catName}?`,
      "Are you sure you want to remove this budget limit?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteBudget.mutateAsync(b._id);
            } catch {
              Alert.alert("Error", "Could not delete budget.");
            }
          },
        },
      ],
    );
  }

  function handleAddGoal() {
    setSelectedGoal(null);
    setGoalModalVisible(true);
  }

  function handleEditGoal(g: Goal) {
    setSelectedGoal(g);
    setGoalModalVisible(true);
  }

  function handleDeleteGoal(g: Goal) {
    Alert.alert(
      `Delete "${g.name}"?`,
      "Are you sure you want to delete this savings goal?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteGoal.mutateAsync(g._id);
            } catch {
              Alert.alert("Error", "Could not delete goal.");
            }
          },
        },
      ],
    );
  }

  function handleOpenContribute(g: Goal) {
    setContributeGoal(g);
    setContributeModalVisible(true);
  }

  function handleAddRule() {
    setSelectedRule(null);
    setRuleModalVisible(true);
  }

  function handleEditRule(r: MoneyRule) {
    setSelectedRule(r);
    setRuleModalVisible(true);
  }

  function handleToggleRule(r: MoneyRule) {
    updateRule.mutate({
      id: r._id,
      input: {
        enabled: !r.enabled,
      },
    });
  }

  function handleDeleteRule(r: MoneyRule) {
    const desc = describeRule(r, user?.currency ?? "USD", categoryMap.get(r.categoryId ?? ""));
    Alert.alert(
      "Delete Alert?",
      `Are you sure you want to remove alert: "${desc}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRule.mutateAsync(r._id);
            } catch {
              Alert.alert("Error", "Could not delete alert.");
            }
          },
        },
      ],
    );
  }

  async function handleRefresh() {
    await Promise.all([refetchBudgets(), refetchGoals(), refetchRules()]);
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header Bar */}
      <View className="w-full border-b border-border bg-background">
        <View className="w-full max-w-5xl mx-auto flex-row items-center justify-between px-5 md:px-8 pt-16 pb-4">
          <View>
            <Text className="font-heading text-2xl text-foreground">Planning</Text>
            <Text className="text-xs text-muted-foreground">
              Budgets, savings goals & automated alerts
            </Text>
          </View>

          {activeTab === "budgets" ? (
            <Pressable
              onPress={handleAddBudget}
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 shrink-0 active:opacity-80"
            >
              <Feather name="plus" size={16} color={theme.primaryForeground} />
              <Text className="text-xs font-semibold text-primary-foreground">
                Set Budget
              </Text>
            </Pressable>
          ) : activeTab === "goals" ? (
            <Pressable
              onPress={handleAddGoal}
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 shrink-0 active:opacity-80"
            >
              <Feather name="plus" size={16} color={theme.primaryForeground} />
              <Text className="text-xs font-semibold text-primary-foreground">
                New Goal
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAddRule}
              hitSlop={8}
              className="flex-row items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 shrink-0 active:opacity-80"
            >
              <Feather name="plus" size={16} color={theme.primaryForeground} />
              <Text className="text-xs font-semibold text-primary-foreground">
                Add Alert
              </Text>
            </Pressable>
          )}
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
        {/* Tab Segment Selector */}
        <View className="flex-row rounded-xl bg-card border border-border p-1">
          <Pressable
            onPress={() => setActiveTab("budgets")}
            className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
              activeTab === "budgets" ? "bg-primary" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === "budgets"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Budgets ({budgets.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("goals")}
            className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
              activeTab === "goals" ? "bg-primary" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === "goals"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Goals ({goals.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("alerts")}
            className={`flex-1 items-center justify-center rounded-lg py-2.5 ${
              activeTab === "alerts" ? "bg-primary" : "bg-transparent"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                activeTab === "alerts"
                  ? "text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              Alerts ({moneyRules.length})
            </Text>
          </Pressable>
        </View>

        {/* Content area */}
        {isLoading ? (
          <PlanningSkeleton />
        ) : activeTab === "budgets" ? (
          /* ===================================================
           * BUDGETS TAB
           * =================================================== */
          <View className="gap-5">
            {/* Overview Card */}
            <Card className="bg-card border border-border/80">
              <CardContent className="p-5 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Monthly Budget Overview
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Feather name="pie-chart" size={14} color={theme.primary} />
                  </View>
                </View>

                <View className="flex-row items-baseline justify-between">
                  <Text className="font-mono text-2xl font-bold text-foreground">
                    {formatCurrency(totalSpent, user?.currency ?? "USD")}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    of {formatCurrency(totalBudgeted, user?.currency ?? "USD")} limit
                  </Text>
                </View>

                <ProgressBar
                  value={totalSpent}
                  max={totalBudgeted > 0 ? totalBudgeted : 1}
                />
              </CardContent>
            </Card>

            {/* Budgets List */}
            {budgets.length === 0 ? (
              <View className="items-center justify-center rounded-2xl bg-card border border-border/80 p-8 text-center">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Feather name="target" size={32} color={theme.primary} />
                </View>
                <Text className="font-heading text-lg text-foreground">
                  No budgets set yet
                </Text>
                <Text className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
                  Set category limits to keep your monthly spending disciplined.
                </Text>
                <Button onPress={handleAddBudget} className="mt-5">
                  Set Your First Budget
                </Button>
              </View>
            ) : (
              <View className="flex-col md:flex-row md:flex-wrap gap-3">
                {budgets.map((b) => {
                  const catName = categoryMap.get(b.categoryId) ?? "Category";
                  const spent = b.spent || 0;
                  const limit = b.amount;
                  const ratio = limit > 0 ? spent / limit : 0;
                  const isOver = spent > limit;
                  const remaining = Math.max(0, limit - spent);

                  return (
                    <Card
                      key={b._id}
                      className="w-full md:w-[calc(50%-6px)] bg-card border border-border/80"
                    >
                      <CardContent className="p-4 gap-3">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-2">
                            <Text className="text-base font-semibold text-foreground">
                              {catName}
                            </Text>
                            <Text className="text-xs text-muted-foreground capitalize mt-0.5">
                              {b.period} Reset
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1">
                            <Pressable
                              onPress={() => handleEditBudget(b)}
                              hitSlop={6}
                              className="h-7 w-7 items-center justify-center rounded-md bg-muted/60"
                            >
                              <Feather name="edit-2" size={13} color={theme.foreground} />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeleteBudget(b)}
                              hitSlop={6}
                              className="h-7 w-7 items-center justify-center rounded-md bg-negative/10"
                            >
                              <Feather name="trash-2" size={13} color={theme.negative} />
                            </Pressable>
                          </View>
                        </View>

                        <ProgressBar value={spent} max={limit > 0 ? limit : 1} />

                        <View className="flex-row justify-between items-center text-xs">
                          <Text className="font-mono text-xs text-muted-foreground">
                            Spent:{" "}
                            <Text className={`font-semibold ${isOver ? "text-negative" : "text-foreground"}`}>
                              {formatCurrency(spent, user?.currency ?? "USD")}
                            </Text>
                          </Text>
                          <Text className="font-mono text-xs text-muted-foreground">
                            {isOver ? (
                              <Text className="text-negative font-semibold">
                                Over by {formatCurrency(spent - limit, user?.currency ?? "USD")}
                              </Text>
                            ) : (
                              <>
                                Left:{" "}
                                <Text className="font-semibold text-positive">
                                  {formatCurrency(remaining, user?.currency ?? "USD")}
                                </Text>
                              </>
                            )}
                          </Text>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        ) : activeTab === "goals" ? (
          /* ===================================================
           * SAVINGS GOALS TAB
           * =================================================== */
          <View className="gap-5">
            {/* Overview Goals Card */}
            <Card className="bg-card border border-border/80">
              <CardContent className="p-5 gap-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Savings Targets Progress
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Feather name="award" size={14} color={theme.primary} />
                  </View>
                </View>

                <View className="flex-row items-baseline justify-between">
                  <Text className="font-mono text-2xl font-bold text-foreground">
                    {formatCurrency(totalGoalsSaved, user?.currency ?? "USD")}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    of {formatCurrency(totalGoalsTarget, user?.currency ?? "USD")} target
                  </Text>
                </View>

                <ProgressBar
                  value={totalGoalsSaved}
                  max={totalGoalsTarget > 0 ? totalGoalsTarget : 1}
                />
              </CardContent>
            </Card>

            {/* Goals List */}
            {goals.length === 0 ? (
              <View className="items-center justify-center rounded-2xl bg-card border border-border/80 p-8 text-center">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Feather name="award" size={32} color={theme.primary} />
                </View>
                <Text className="font-heading text-lg text-foreground">
                  No savings goals yet
                </Text>
                <Text className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
                  Set targets for vacations, emergency funds, or big purchases.
                </Text>
                <Button onPress={handleAddGoal} className="mt-5">
                  Create Your First Goal
                </Button>
              </View>
            ) : (
              <View className="flex-col md:flex-row md:flex-wrap gap-3">
                {goals.map((g) => {
                  const pct = Math.min(
                    100,
                    Math.round(
                      g.targetAmount > 0
                        ? (g.savedAmount / g.targetAmount) * 100
                        : 0,
                    ),
                  );
                  const statusInfo = STATUS_CONFIG[g.status] ?? STATUS_CONFIG.stalled;

                  return (
                    <Card key={g._id} className="w-full md:w-[calc(50%-6px)] bg-card border border-border/80">
                      <CardContent className="p-4 gap-3">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-2">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-base font-semibold text-foreground">
                                {g.name}
                              </Text>
                              <View className={`rounded-md px-2 py-0.5 ${statusInfo.bg}`}>
                                <Text className={`text-[10px] font-semibold ${statusInfo.text}`}>
                                  {statusInfo.label}
                                </Text>
                              </View>
                            </View>
                            {Boolean(g.targetDate) && (
                              <Text className="text-xs text-muted-foreground mt-0.5">
                                Target: {formatDate(g.targetDate!)}
                              </Text>
                            )}
                          </View>

                          <View className="flex-row items-center gap-1">
                            <Pressable
                              onPress={() => handleOpenContribute(g)}
                              hitSlop={6}
                              className="flex-row items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1"
                            >
                              <Feather name="dollar-sign" size={12} color={theme.primary} />
                              <Text className="text-xs font-semibold text-primary">
                                Funds
                              </Text>
                            </Pressable>
                            <Pressable
                              onPress={() => handleEditGoal(g)}
                              hitSlop={6}
                              className="h-7 w-7 items-center justify-center rounded-md bg-muted/60"
                            >
                              <Feather name="edit-2" size={13} color={theme.foreground} />
                            </Pressable>
                            <Pressable
                              onPress={() => handleDeleteGoal(g)}
                              hitSlop={6}
                              className="h-7 w-7 items-center justify-center rounded-md bg-negative/10"
                            >
                              <Feather name="trash-2" size={13} color={theme.negative} />
                            </Pressable>
                          </View>
                        </View>

                        <ProgressBar value={g.savedAmount} max={g.targetAmount} />

                        <View className="flex-row justify-between items-center">
                          <Text className="font-mono text-xs text-muted-foreground">
                            Saved:{" "}
                            <Text className="font-semibold text-foreground">
                              {formatCurrency(g.savedAmount, user?.currency ?? "USD")}
                            </Text>{" "}
                            ({pct}%)
                          </Text>
                          <Text className="font-mono text-xs text-muted-foreground">
                            Target:{" "}
                            <Text className="font-semibold text-foreground">
                              {formatCurrency(g.targetAmount, user?.currency ?? "USD")}
                            </Text>
                          </Text>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        ) : (
          /* ===================================================
           * ALERTS & RULES TAB
           * =================================================== */
          <View className="gap-5">
            {/* Overview Card */}
            <Card className="bg-card border border-border/80">
              <CardContent className="p-5 gap-2">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Automated Rules & Thresholds
                  </Text>
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                    <Feather name="bell" size={14} color={theme.primary} />
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground leading-relaxed mt-1">
                  Get notified whenever account balances dip below a floor, category spending exceeds limits, or single big transactions occur.
                </Text>
              </CardContent>
            </Card>

            {/* Rules List */}
            {moneyRules.length === 0 ? (
              <View className="items-center justify-center rounded-2xl bg-card border border-border/80 p-8 text-center">
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                  <Feather name="bell" size={32} color={theme.primary} />
                </View>
                <Text className="font-heading text-lg text-foreground">
                  No alert rules yet
                </Text>
                <Text className="mt-1 max-w-xs text-center text-xs text-muted-foreground">
                  Create automated alerts to guard your spending and account balances.
                </Text>
                <Button onPress={handleAddRule} className="mt-5">
                  Set Up an Alert
                </Button>
              </View>
            ) : (
              <View className="flex-col md:flex-row md:flex-wrap gap-3">
                {moneyRules.map((rule) => {
                  const desc = describeRule(
                    rule,
                    user?.currency ?? "USD",
                    categoryMap.get(rule.categoryId ?? ""),
                  );

                  return (
                    <Card
                      key={rule._id}
                      className={`w-full md:w-[calc(50%-6px)] bg-card border ${
                        rule.enabled ? "border-border/80" : "border-border/40 opacity-70"
                      }`}
                    >
                      <CardContent className="p-4 gap-3">
                        <View className="flex-row items-start justify-between">
                          <View className="flex-1 pr-3">
                            <Text className="text-sm font-semibold text-foreground leading-snug">
                              {desc}
                            </Text>
                            <Text className="text-xs text-muted-foreground mt-1">
                              {!rule.enabled
                                ? "Disabled"
                                : rule.lastFiredAt
                                ? `Last sent ${new Date(rule.lastFiredAt).toLocaleDateString()}`
                                : "Active • Not triggered yet"}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-2">
                            <Pressable
                              onPress={() => handleToggleRule(rule)}
                              className={`h-6 w-11 rounded-full p-0.5 justify-center ${
                                rule.enabled ? "bg-primary" : "bg-muted"
                              }`}
                            >
                              <View
                                className={`h-5 w-5 rounded-full bg-white transition-all ${
                                  rule.enabled ? "self-end" : "self-start"
                                }`}
                              />
                            </Pressable>
                          </View>
                        </View>

                        <View className="flex-row justify-end items-center gap-2 pt-2 border-t border-border/50">
                          <Pressable
                            onPress={() => handleEditRule(rule)}
                            hitSlop={6}
                            className="flex-row items-center gap-1 rounded-md bg-muted/60 px-2.5 py-1"
                          >
                            <Feather name="edit-2" size={12} color={theme.foreground} />
                            <Text className="text-xs font-medium text-foreground">
                              Edit
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleDeleteRule(rule)}
                            hitSlop={6}
                            className="flex-row items-center gap-1 rounded-md bg-negative/10 px-2.5 py-1"
                          >
                            <Feather name="trash-2" size={12} color={theme.negative} />
                            <Text className="text-xs font-medium text-negative">
                              Delete
                            </Text>
                          </Pressable>
                        </View>
                      </CardContent>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        )}
        </View>
      </ScrollView>

      {/* Budget Modal */}
      <BudgetModal
        visible={budgetModalVisible}
        onClose={() => setBudgetModalVisible(false)}
        budget={selectedBudget}
      />

      {/* Goal Modal */}
      <GoalModal
        visible={goalModalVisible}
        onClose={() => setGoalModalVisible(false)}
        goal={selectedGoal}
      />

      {/* Contribute Modal */}
      <ContributeModal
        visible={contributeModalVisible}
        onClose={() => setContributeModalVisible(false)}
        goal={contributeGoal}
        currency={user?.currency ?? "USD"}
      />

      {/* Money Rule Modal */}
      <MoneyRuleModal
        visible={ruleModalVisible}
        onClose={() => setRuleModalVisible(false)}
        rule={selectedRule}
      />
    </View>
  );
}
