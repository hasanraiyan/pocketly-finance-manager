"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
} from "recharts";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/features/categories/hooks";
import {
  useAccountBreakdown,
  useAnalysisOverview,
  useCashFlow,
  useCategoryBreakdown,
  type AccountBreakdown,
  type AnalysisPeriod,
  type CashFlow,
  type CategoryBreakdown,
  type Overview,
} from "./hooks";

const PERIOD_OPTIONS: Array<{ value: AnalysisPeriod; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "3m", label: "Last 3 months" },
  { value: "6m", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
];

const CHART_CONFIG: ChartConfig = {
  income: { label: "Income", color: "var(--color-positive)" },
  expense: { label: "Expense", color: "var(--color-negative)" },
};

export function AnalysisView({
  initialOverview,
  initialCashFlow,
  initialCategoryBreakdown,
  initialAccountBreakdown,
  categories,
  currency,
}: {
  initialOverview: Overview;
  initialCashFlow: CashFlow;
  initialCategoryBreakdown: CategoryBreakdown;
  initialAccountBreakdown: AccountBreakdown;
  categories: Category[];
  currency: string;
}) {
  const [period, setPeriod] = useState<AnalysisPeriod>("this_month");
  const isDefault = period === "this_month";

  const { data: overview } = useAnalysisOverview(
    period,
    isDefault ? initialOverview : undefined,
  );
  const { data: cashFlow } = useCashFlow(
    period,
    isDefault ? initialCashFlow : undefined,
  );
  const { data: categoryBreakdown } = useCategoryBreakdown(
    period,
    isDefault ? initialCategoryBreakdown : undefined,
  );
  const { data: accountBreakdown } = useAccountBreakdown(
    period,
    isDefault ? initialAccountBreakdown : undefined,
  );

  const categoryMap = new Map(categories.map((c) => [c._id, c]));
  const maxCategoryTotal = Math.max(
    1,
    ...categoryBreakdown.categories.map((c) => c.total),
  );
  const maxAccountTotal = Math.max(
    1,
    ...accountBreakdown.accounts.map((a) => Math.max(a.income, a.expense)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground">Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Cash flow and spending patterns, without the spreadsheet.
          </p>
        </div>
        <NativeSelect
          value={period}
          onChange={(e) => setPeriod(e.target.value as AnalysisPeriod)}
        >
          {PERIOD_OPTIONS.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Income</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-positive">
              {formatCurrency(overview.income, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Expense</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-negative">
              {formatCurrency(overview.expense, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Net</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums text-foreground">
              {formatCurrency(overview.net, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>Income vs. expense over time</CardDescription>
        </CardHeader>
        <CardContent>
          {cashFlow.days.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No records in this period yet.
            </p>
          ) : (
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-64 w-full">
              <AreaChart data={cashFlow.days}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value: string) => formatDate(value)}
                  minTickGap={24}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatDate(String(value))}
                    />
                  }
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By category</CardTitle>
            <CardDescription>Where it&apos;s going</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {categoryBreakdown.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No records in this period yet.
              </p>
            ) : (
              categoryBreakdown.categories
                .sort((a, b) => b.total - a.total)
                .map((c) => {
                  const category = categoryMap.get(c.categoryId);
                  return (
                    <div key={c.categoryId} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">
                          {category?.name ?? "Unknown"}
                        </span>
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            c.type === "expense"
                              ? "text-negative"
                              : "text-positive",
                          )}
                        >
                          {formatCurrency(c.total, currency)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted">
                        <div
                          className={cn(
                            "h-full",
                            c.type === "expense" ? "bg-negative" : "bg-positive",
                          )}
                          style={{
                            width: `${(c.total / maxCategoryTotal) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>By account</CardTitle>
            <CardDescription>Income and expense per account</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {accountBreakdown.accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No records in this period yet.
              </p>
            ) : (
              accountBreakdown.accounts.map((a) => (
                <div key={a.accountId} className="flex flex-col gap-1">
                  <span className="text-sm text-foreground">{a.name}</span>
                  <div className="flex h-1.5 w-full gap-0.5 bg-muted">
                    <div
                      className="h-full bg-positive"
                      style={{
                        width: `${(a.income / maxAccountTotal) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-negative"
                      style={{
                        width: `${(a.expense / maxAccountTotal) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-xs tabular-nums text-muted-foreground">
                    <span>+{formatCurrency(a.income, currency)}</span>
                    <span>-{formatCurrency(a.expense, currency)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
