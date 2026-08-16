import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, WalletCards } from "lucide-react";
import { getServerApiClient } from "@/lib/api-client";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { NotificationPromptBanner } from "@/features/notifications/notification-prompt-banner";

export default async function DashboardPage() {
  const client = await getServerApiClient();

  const [profileRes, overviewRes, accountsRes, budgetsRes, transactionsRes] =
    await Promise.all([
      client.GET("/users/me"),
      client.GET("/analysis"),
      client.GET("/accounts", { params: { query: { limit: 5 } } }),
      client.GET("/budgets", { params: { query: { limit: 4 } } }),
      client.GET("/transactions", { params: { query: { limit: 6 } } }),
    ]);

  if (profileRes.error || !profileRes.data) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <WalletCards />
          </EmptyMedia>
          <EmptyTitle>Can&apos;t reach Pocketly right now</EmptyTitle>
          <EmptyDescription>
            We couldn&apos;t load your account. Try refreshing in a moment.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const { currency, name } = profileRes.data.data;
  const overview = overviewRes.data?.data;
  const accounts = accountsRes.data?.data.items ?? [];
  const budgets = budgetsRes.data?.data.items ?? [];
  const transactions = transactionsRes.data?.data.items ?? [];
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const firstName = name.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <NotificationPromptBanner />
      <div>
        <h1 className="font-heading text-2xl text-foreground">Hi {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s where things stand.
        </p>
      </div>

      <Card className="overflow-hidden border-none bg-primary text-primary-foreground py-0">
        <CardContent className="flex flex-col gap-6 p-8">
          <span className="text-sm tracking-wide text-primary-foreground/70 uppercase">
            Total balance
          </span>
          <span className="font-heading text-5xl tabular-nums sm:text-6xl">
            {formatCurrency(totalBalance, currency)}
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-primary-foreground/15 pt-4 font-mono text-sm">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="size-4" />
              Income {formatCurrency(overview?.income ?? 0, currency)}
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="size-4" />
              Expenses {formatCurrency(overview?.expense ?? 0, currency)}
            </span>
            <span>Net {formatCurrency(overview?.net ?? 0, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
            <CardDescription>
              {accounts.length} account{accounts.length === 1 ? "" : "s"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {accounts.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No accounts yet</EmptyTitle>
                  <EmptyDescription>
                    Add your first account to start tracking.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button render={<Link href="/accounts" />} size="sm">Add an account</Button>
                </EmptyContent>
              </Empty>
            ) : (
              accounts.map((account) => (
                <div
                  key={account._id}
                  className="flex items-center justify-between border-l-2 border-primary py-2 pl-3"
                >
                  <span className="text-sm">{account.name}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {formatCurrency(account.balance, currency)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budgets</CardTitle>
            <CardDescription>This period</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {budgets.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No budgets yet</EmptyTitle>
                  <EmptyDescription>
                    Create a budget to start tracking your spending.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button render={<Link href="/planning" />} size="sm">Create a budget</Button>
                </EmptyContent>
              </Empty>
            ) : (
              budgets.map((budget) => (
                <div key={budget._id} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      {formatCurrency(budget.spent, currency)} of{" "}
                      {formatCurrency(budget.amount, currency)}
                    </span>
                    <span
                      className={
                        budget.percentageUsed > 100
                          ? "text-negative"
                          : "text-muted-foreground"
                      }
                    >
                      {budget.percentageUsed}%
                    </span>
                  </div>
                  <Progress value={Math.min(budget.percentageUsed, 100)} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="py-0">
        <CardHeader className="pt-6">
          <CardTitle>Recent records</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {transactions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No records yet</EmptyTitle>
                <EmptyDescription>
                  Add your first transaction to see it here.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link href="/records" />} size="sm">Add a record</Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((tx) => (
                <li
                  key={tx._id}
                  className="flex items-center justify-between px-6 py-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm">
                      {tx.description || tx.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(tx.date)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-sm tabular-nums",
                      tx.type === "expense" ? "text-negative" : "text-positive",
                    )}
                  >
                    {tx.type === "expense" ? "-" : "+"}
                    {formatCurrency(tx.amount, currency)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
