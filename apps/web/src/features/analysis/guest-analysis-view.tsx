"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useAuth } from "@/lib/auth-provider";
import { useTransactions } from "@/features/transactions/hooks";
import { useAccounts } from "@/features/accounts/hooks";
import { useCategories } from "@/features/categories/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

const CHART_CONFIG: ChartConfig = {
  income: { label: "Income", color: "var(--color-positive)" },
  expense: { label: "Expense", color: "var(--color-negative)" },
};

export function GuestAnalysisView() {
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: txPage } = useTransactions({});
  const transactions = useMemo(() => txPage?.items ?? [], [txPage?.items]);

  const [period, setPeriod] = useState<"this_month" | "all">("this_month");

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c._id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a._id, a])), [accounts]);

  // Compute stats from local transactions
  const { totalIncome, totalExpense, net, chartDays, catBreakdown, accBreakdown } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const dayMap = new Map<string, { income: number; expense: number }>();
    const catMap = new Map<string, number>();
    const accMap = new Map<string, number>();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    transactions.forEach((tx) => {
      if (period === "this_month" && tx.date < startOfMonth) return;

      const amt = tx.amount;
      const dayKey = tx.date.split("T")[0];

      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, { income: 0, expense: 0 });
      }
      const dayData = dayMap.get(dayKey)!;

      if (tx.type === "income") {
        inc += amt;
        dayData.income += amt;
      } else if (tx.type === "expense") {
        exp += amt;
        dayData.expense += amt;
        if (tx.categoryId) {
          catMap.set(tx.categoryId, (catMap.get(tx.categoryId) ?? 0) + amt);
        }
      }

      if (tx.accountId) {
        accMap.set(tx.accountId, (accMap.get(tx.accountId) ?? 0) + amt);
      }
    });

    const days = Array.from(dayMap.entries())
      .map(([date, values]) => ({ date, ...values }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const catItems = Array.from(catMap.entries())
      .map(([catId, amount]) => ({
        categoryId: catId,
        categoryName: categoryMap.get(catId)?.name ?? "Uncategorized",
        amount,
        percentage: exp > 0 ? Math.round((amount / exp) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const accItems = Array.from(accMap.entries())
      .map(([accId, amount]) => ({
        accountId: accId,
        accountName: accountMap.get(accId)?.name ?? "Account",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      totalIncome: inc,
      totalExpense: exp,
      net: inc - exp,
      chartDays: days,
      catBreakdown: catItems,
      accBreakdown: accItems,
    };
  }, [transactions, period, categoryMap, accountMap]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Income, expense, and category breakdown for your local ledger.
          </p>
        </div>
        <NativeSelect
          value={period}
          onChange={(e) => setPeriod(e.target.value as "this_month" | "all")}
          className="w-36"
        >
          <NativeSelectOption value="this_month">This month</NativeSelectOption>
          <NativeSelectOption value="all">All time</NativeSelectOption>
        </NativeSelect>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Income</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-positive">
              {formatCurrency(totalIncome, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expense</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-negative">
              {formatCurrency(totalExpense, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {formatCurrency(net, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Cash flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>Income vs. expense over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartDays.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No local records in this period yet.
            </p>
          ) : (
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-64 w-full">
              <AreaChart data={chartDays}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: string) => formatDate(val)}
                  minTickGap={24}
                />
                <ChartTooltip
                  content={<ChartTooltipContent labelFormatter={(val) => formatDate(String(val))} />}
                />
                <Area
                  dataKey="income"
                  type="monotone"
                  fill="var(--color-income)"
                  fillOpacity={0.15}
                  stroke="var(--color-income)"
                  strokeWidth={2}
                />
                <Area
                  dataKey="expense"
                  type="monotone"
                  fill="var(--color-expense)"
                  fillOpacity={0.15}
                  stroke="var(--color-expense)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Breakdowns */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>Where your money went</CardDescription>
          </CardHeader>
          <CardContent>
            {catBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No category expenses recorded yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {catBreakdown.map((item) => (
                  <div key={item.categoryId} className="flex items-center justify-between text-sm">
                    <span>{item.categoryName}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(item.amount, currency)} ({item.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account activity</CardTitle>
            <CardDescription>Volume across accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {accBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No account records found.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {accBreakdown.map((item) => (
                  <div key={item.accountId} className="flex items-center justify-between text-sm">
                    <span>{item.accountName}</span>
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
