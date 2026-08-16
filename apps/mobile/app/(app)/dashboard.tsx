import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Button } from "@/components/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { formatCurrency, formatDate } from "@/lib/format";
import { theme } from "@/lib/theme";
import { usePocketlyClient } from "@/lib/api-client";

export default function DashboardScreen() {
  const client = usePocketlyClient();

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [profileRes, overviewRes, accountsRes, budgetsRes, transactionsRes] =
        await Promise.all([
          client.GET("/users/me"),
          client.GET("/analysis"),
          client.GET("/accounts", { params: { query: { limit: 5 } } }),
          client.GET("/budgets", { params: { query: { limit: 4 } } }),
          client.GET("/transactions", { params: { query: { limit: 6 } } }),
        ]);

      if (profileRes.error || !profileRes.data) {
        throw new Error("Couldn't load your account");
      }

      const { currency, name } = profileRes.data.data;
      const accounts = accountsRes.data?.data.items ?? [];

      return {
        currency,
        firstName: name.split(" ")[0],
        overview: overviewRes.data?.data,
        accounts,
        budgets: budgetsRes.data?.data.items ?? [],
        transactions: transactionsRes.data?.data.items ?? [],
        totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
      };
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center gap-2 bg-background px-8">
        <Text className="font-heading text-lg text-foreground">
          Can&apos;t reach Pocketly right now
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          We couldn&apos;t load your account. Pull down to try again.
        </Text>
      </View>
    );
  }

  const { currency, firstName, overview, accounts, budgets, transactions } =
    data;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 p-4 pt-16"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
      }
    >
      <View>
        <Text className="font-heading text-2xl text-foreground">
          Hi {firstName}
        </Text>
        <Text className="text-sm text-muted-foreground">
          Here&apos;s where things stand.
        </Text>
      </View>

      <View className="gap-6 rounded-xl bg-primary p-6">
        <Text className="text-xs tracking-wide text-primary-foreground/70 uppercase">
          Total balance
        </Text>
        <Text className="font-heading text-4xl text-primary-foreground">
          {formatCurrency(data.totalBalance, currency)}
        </Text>
        <View className="flex-row flex-wrap gap-x-5 gap-y-2 border-t border-primary-foreground/15 pt-4">
          <View className="flex-row items-center gap-1.5">
            <Feather name="arrow-up-right" size={14} color={theme.primaryForeground} />
            <Text className="text-sm text-primary-foreground">
              Income {formatCurrency(overview?.income ?? 0, currency)}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Feather name="arrow-down-right" size={14} color={theme.primaryForeground} />
            <Text className="text-sm text-primary-foreground">
              Expenses {formatCurrency(overview?.expense ?? 0, currency)}
            </Text>
          </View>
          <Text className="text-sm text-primary-foreground">
            Net {formatCurrency(overview?.net ?? 0, currency)}
          </Text>
        </View>
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            {accounts.length} account{accounts.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-1">
          {accounts.length === 0 ? (
            <View className="items-start gap-3 py-2">
              <Text className="text-sm text-muted-foreground">
                Add your first account to start tracking.
              </Text>
              <Link href="/(app)/accounts" asChild>
                <Button variant="outline">Add an account</Button>
              </Link>
            </View>
          ) : (
            accounts.map((account) => (
              <View
                key={account._id}
                className="flex-row items-center justify-between border-l-2 border-primary py-2 pl-3"
              >
                <Text className="text-sm text-foreground">{account.name}</Text>
                <Text className="text-sm text-foreground">
                  {formatCurrency(account.balance, currency)}
                </Text>
              </View>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
          <CardDescription>This period</CardDescription>
        </CardHeader>
        <CardContent className="gap-4">
          {budgets.length === 0 ? (
            <View className="items-start gap-3 py-2">
              <Text className="text-sm text-muted-foreground">
                Create a budget to start tracking your spending.
              </Text>
              <Link href="/(app)/planning" asChild>
                <Button variant="outline">Create a budget</Button>
              </Link>
            </View>
          ) : (
            budgets.map((budget) => (
              <View key={budget._id} className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-foreground">
                    {formatCurrency(budget.spent, currency)} of{" "}
                    {formatCurrency(budget.amount, currency)}
                  </Text>
                  <Text
                    className={`text-sm ${
                      budget.percentageUsed > 100
                        ? "text-negative"
                        : "text-muted-foreground"
                    }`}
                  >
                    {budget.percentageUsed}%
                  </Text>
                </View>
                <ProgressBar value={budget.percentageUsed} />
              </View>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent records</CardTitle>
        </CardHeader>
        <CardContent className="gap-0 p-0 pb-2">
          {transactions.length === 0 ? (
            <View className="items-start gap-3 px-4 py-2">
              <Text className="text-sm text-muted-foreground">
                Add your first transaction to see it here.
              </Text>
              <Link href="/(app)/records" asChild>
                <Button variant="outline">Add a record</Button>
              </Link>
            </View>
          ) : (
            transactions.map((tx, i) => (
              <View
                key={tx._id}
                className={`flex-row items-center justify-between px-4 py-3 ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <View>
                  <Text className="text-sm text-foreground">
                    {tx.description || tx.type}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatDate(tx.date)}
                  </Text>
                </View>
                <Text
                  className={`text-sm ${
                    tx.type === "expense" ? "text-negative" : "text-positive"
                  }`}
                >
                  {tx.type === "expense" ? "-" : "+"}
                  {formatCurrency(tx.amount, currency)}
                </Text>
              </View>
            ))
          )}
        </CardContent>
      </Card>
    </ScrollView>
  );
}
