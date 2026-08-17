"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
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
import { ErrorState } from "@/components/error-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Category } from "@/features/categories/hooks";
import {
  AccountBreakdownSkeleton,
  CashFlowCardSkeleton,
  CategoryBreakdownSkeleton,
  StatCardsSkeleton,
} from "./skeletons";
import { usePeriod } from "./period-context";
import {
  useAccountBreakdown,
  useAnalysisOverview,
  useCashFlow,
  useCategoryBreakdown,
  type AccountBreakdown,
  type CashFlow,
  type CategoryBreakdown,
  type Overview,
} from "./hooks";

/**
 * One component per card. Each owns its query, its error state, and its
 * own retry, so a single failing endpoint no longer blanks the whole page
 * -- the sections that did load stay on screen.
 *
 * `initialData` is what the server rendered for the default period, so it
 * only seeds the query while the selection still matches. When there is
 * nothing to seed with, the section shows its skeleton rather than an
 * empty or zeroed version of itself.
 *
 * While a newly picked period is loading, `isPlaceholderData` marks the
 * figures still belonging to the previous one, and they dim until the
 * fresh ones arrive.
 */

/** Dims a section whose figures are still the previously selected period's. */
const stale = (isPlaceholderData: boolean) =>
  isPlaceholderData ? "opacity-50 transition-opacity" : "transition-opacity";

const CHART_CONFIG: ChartConfig = {
  income: { label: "Income", color: "var(--color-positive)" },
  expense: { label: "Expense", color: "var(--color-negative)" },
};

export function StatCards({
  initialData,
  currency,
}: {
  initialData?: Overview;
  currency: string;
}) {
  const { period, isDefault } = usePeriod();
  const { data, isError, isPlaceholderData } = useAnalysisOverview(
    period,
    isDefault ? initialData : undefined,
  );

  if (!data && !isError) return <StatCardsSkeleton />;

  const stats = [
    { label: "Income", value: data?.income, tone: "text-positive" },
    { label: "Expense", value: data?.expense, tone: "text-negative" },
    { label: "Net", value: data?.net, tone: "text-foreground" },
  ];

  return (
    <div className={cn("grid gap-4 sm:grid-cols-3", stale(isPlaceholderData))}>
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader className="pb-2">
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle
              className={cn("font-mono text-2xl tabular-nums", stat.tone)}
            >
              {/* A dash rather than 0.00 -- a wrong figure reads as real. */}
              {stat.value === undefined
                ? "—"
                : formatCurrency(stat.value, currency)}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function CashFlowCard({ initialData }: { initialData?: CashFlow }) {
  const { period, isDefault } = usePeriod();
  const { data, isError, isFetching, isPlaceholderData, refetch } = useCashFlow(
    period,
    isDefault ? initialData : undefined,
  );

  if (!data && !isError) return <CashFlowCardSkeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <CardDescription>Income vs. expense over time</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorState
            title="Couldn't load cash flow"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : data!.days.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No records in this period yet.
          </p>
        ) : (
          <ChartContainer
            config={CHART_CONFIG}
            className={cn("aspect-auto h-64 w-full", stale(isPlaceholderData))}
          >
            <AreaChart data={data!.days}>
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
  );
}

export function CategoryBreakdownCard({
  initialData,
  categories,
  currency,
}: {
  initialData?: CategoryBreakdown;
  categories: Category[];
  currency: string;
}) {
  const { period, isDefault } = usePeriod();
  const { data, isError, isFetching, isPlaceholderData, refetch } =
    useCategoryBreakdown(period, isDefault ? initialData : undefined);

  if (!data && !isError) return <CategoryBreakdownSkeleton />;

  const categoryMap = new Map(categories.map((c) => [c._id, c]));
  const rows = [...(data?.categories ?? [])].sort((a, b) => b.total - a.total);
  const maxTotal = Math.max(1, ...rows.map((c) => c.total));

  return (
    <Card>
      <CardHeader>
        <CardTitle>By category</CardTitle>
        <CardDescription>Where it&apos;s going</CardDescription>
      </CardHeader>
      <CardContent
        className={cn("flex flex-col gap-3", stale(isPlaceholderData))}
      >
        {isError ? (
          <ErrorState
            title="Couldn't load categories"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No records in this period yet.
          </p>
        ) : (
          rows.map((c) => (
            <div key={c.categoryId} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">
                  {categoryMap.get(c.categoryId)?.name ?? "Unknown"}
                </span>
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    c.type === "expense" ? "text-negative" : "text-positive",
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
                  style={{ width: `${(c.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function AccountBreakdownCard({
  initialData,
  currency,
}: {
  initialData?: AccountBreakdown;
  currency: string;
}) {
  const { period, isDefault } = usePeriod();
  const { data, isError, isFetching, isPlaceholderData, refetch } =
    useAccountBreakdown(period, isDefault ? initialData : undefined);

  if (!data && !isError) return <AccountBreakdownSkeleton />;

  const accounts = data?.accounts ?? [];
  const maxTotal = Math.max(
    1,
    ...accounts.map((a) => Math.max(a.income, a.expense)),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>By account</CardTitle>
        <CardDescription>Income and expense per account</CardDescription>
      </CardHeader>
      <CardContent
        className={cn("flex flex-col gap-3", stale(isPlaceholderData))}
      >
        {isError ? (
          <ErrorState
            title="Couldn't load accounts"
            onRetry={() => refetch()}
            retrying={isFetching}
          />
        ) : accounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No records in this period yet.
          </p>
        ) : (
          accounts.map((a) => (
            <div key={a.accountId} className="flex flex-col gap-1">
              <span className="text-sm text-foreground">{a.name}</span>
              <div className="flex h-1.5 w-full gap-0.5 bg-muted">
                <div
                  className="h-full bg-positive"
                  style={{ width: `${(a.income / maxTotal) * 100}%` }}
                />
                <div
                  className="h-full bg-negative"
                  style={{ width: `${(a.expense / maxTotal) * 100}%` }}
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
  );
}
