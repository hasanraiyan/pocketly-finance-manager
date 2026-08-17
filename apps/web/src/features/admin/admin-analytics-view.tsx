"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  Users,
  Activity,
  Wallet,
  Receipt,
  Target,
  Flag,
  BellRing,
  Bot,
  MessageSquare,
  TrendingUp,
  Sparkles,
  Layers,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { useAdminAnalytics, type AdminAnalytics } from "./hooks";

const USER_GROWTH_CHART_CONFIG: ChartConfig = {
  cumulativeUsers: { label: "Total Users", color: "var(--color-primary)" },
  newUsers: { label: "New Signups", color: "var(--color-positive)" },
};

const VOLUME_CHART_CONFIG: ChartConfig = {
  incomeTotal: { label: "Aggregated Inflow", color: "var(--color-positive)" },
  expenseTotal: { label: "Aggregated Outflow", color: "var(--color-negative)" },
};

export function AdminAnalyticsView({
  initialData,
}: {
  initialData?: AdminAnalytics;
}) {
  const { data, isLoading } = useAdminAnalytics(initialData);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const { overview, userGrowth, transactionVolumeTrends, featureAdoption, feedbackBreakdown } = data;

  const statCards = [
    {
      title: "Total Registered Users",
      value: overview.totalUsers,
      subtext: `+${overview.newUsers30d} new in last 30d`,
      icon: Users,
      tone: "text-foreground",
    },
    {
      title: "30-Day Active Users",
      value: overview.activeUsers30d,
      subtext: `${Math.round((overview.activeUsers30d / (overview.totalUsers || 1)) * 100)}% 30d retention signal`,
      icon: Activity,
      tone: "text-positive",
    },
    {
      title: "Accounts Connected",
      value: overview.totalAccounts,
      subtext: `${(overview.totalAccounts / (overview.totalUsers || 1)).toFixed(1)} avg per user`,
      icon: Wallet,
      tone: "text-foreground",
    },
    {
      title: "Transactions Recorded",
      value: overview.totalTransactions,
      subtext: "Aggregated platform total",
      icon: Receipt,
      tone: "text-foreground",
    },
    {
      title: "Budgets Configured",
      value: overview.totalBudgets,
      subtext: "Active financial envelopes",
      icon: Target,
      tone: "text-foreground",
    },
    {
      title: "Goals Tracked",
      value: overview.totalGoals,
      subtext: `${overview.completedGoals} goals fully reached`,
      icon: Flag,
      tone: "text-foreground",
    },
    {
      title: "Money Rules Active",
      value: overview.activeMoneyRules,
      subtext: `${overview.totalMoneyRules} total configured`,
      icon: BellRing,
      tone: "text-foreground",
    },
    {
      title: "MCP AI Connections",
      value: overview.mcpConnections,
      subtext: "Active AI assistant clients",
      icon: Bot,
      tone: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription className="text-xs font-medium">
                  {stat.title}
                </CardDescription>
                <Icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="font-mono text-2xl font-bold tabular-nums">
                  {stat.value.toLocaleString()}
                </div>
                <p className="text-2xs text-muted-foreground mt-1">
                  {stat.subtext}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">User Growth (30 Days)</CardTitle>
                <CardDescription className="text-xs">
                  Daily signups and cumulative registered user base
                </CardDescription>
              </div>
              <TrendingUp className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            {userGrowth.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                No user growth data recorded yet.
              </div>
            ) : (
              <ChartContainer config={USER_GROWTH_CHART_CONFIG} className="h-64 w-full">
                <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value.slice(5)}
                    className="text-2xs font-mono"
                  />
                  <YAxis tickLine={false} axisLine={false} className="text-2xs font-mono" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="cumulativeUsers"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#userGrad)"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Aggregate Transaction Flow Volume */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Platform Volume Trends (6 Months)</CardTitle>
                <CardDescription className="text-xs">
                  Aggregated anonymized income and expense flow totals
                </CardDescription>
              </div>
              <Receipt className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {transactionVolumeTrends.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
                No transaction volume trends recorded yet.
              </div>
            ) : (
              <ChartContainer config={VOLUME_CHART_CONFIG} className="h-64 w-full">
                <BarChart data={transactionVolumeTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-2xs font-mono"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}k`}
                    className="text-2xs font-mono"
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{name}:</span>
                            <span className="font-mono font-medium">
                              {formatCurrency(Number(value), "INR")}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Bar dataKey="incomeTotal" fill="var(--color-positive)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenseTotal" fill="var(--color-negative)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feature Adoption & Feedback Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Feature Adoption Rates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Feature Adoption & Penetration</CardTitle>
            <CardDescription className="text-xs">
              Percentage of user base actively using key product modules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {featureAdoption.map((item) => (
              <div key={item.feature} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{item.feature}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-mono text-2xs">
                      {item.activeUsers} users ({item.totalItems} items)
                    </span>
                    <span className="font-mono font-semibold tabular-nums">
                      {item.adoptionRate}%
                    </span>
                  </div>
                </div>
                <Progress value={item.adoptionRate} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Feedback & Roadmap Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Feedback & Roadmap Metrics</CardTitle>
                <CardDescription className="text-xs">
                  Community feedback volume by category and status
                </CardDescription>
              </div>
              <MessageSquare className="size-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                By Category
              </h4>
              <div className="flex flex-wrap gap-2">
                {feedbackBreakdown.byCategory.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No submissions yet</span>
                ) : (
                  feedbackBreakdown.byCategory.map((cat) => (
                    <Badge key={cat.category} variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
                      <span className="capitalize">{cat.category.replace(/_/g, " ")}</span>
                      <span className="font-mono font-bold bg-background/80 rounded px-1.5 py-0.2">
                        {cat.count}
                      </span>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                By Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {feedbackBreakdown.byStatus.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No items</span>
                ) : (
                  feedbackBreakdown.byStatus.map((st) => (
                    <Badge key={st.status} variant="outline" className="gap-1.5 text-xs py-1 px-2.5 capitalize">
                      <span>{st.status.replace(/_/g, " ")}</span>
                      <span className="font-mono font-bold text-foreground">
                        {st.count}
                      </span>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
