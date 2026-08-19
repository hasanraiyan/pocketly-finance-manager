"use client";

import { useAuth } from "@/lib/auth-provider";
import { useAccounts } from "@/features/accounts/hooks";
import { useBudgets } from "@/features/budgets/hooks";
import { useCategories } from "@/features/categories/hooks";
import { useTransactions } from "@/features/transactions/hooks";
import { useGoals } from "@/features/goals/hooks";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function GuestDashboardView() {
  const { user } = useAuth();
  const { data: accounts = [] } = useAccounts();
  const { data: budgets = [] } = useBudgets();
  const { data: categories = [] } = useCategories();
  const { data: txPage } = useTransactions({});
  const { data: goals = [] } = useGoals();

  const transactions = txPage?.items ?? [];
  const currency = user?.currency ?? "USD";

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  let income = 0;
  let expense = 0;
  transactions.forEach((tx) => {
    if (tx.type === "income") income += tx.amount;
    if (tx.type === "expense") expense += tx.amount;
  });
  const net = income - expense;

  const categoryMap = new Map(categories.map((c) => [c._id, c.name]));
  const recentTxs = transactions.slice(0, 6);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-heading text-2xl text-foreground">
          Hi {user?.name || "Guest"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s where your offline ledger stands.
        </p>
      </div>

      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total balance</CardTitle>
          <CardDescription>Across every account</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <span className="font-heading text-3xl tabular-nums">
            {formatCurrency(totalBalance, currency)}
          </span>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 font-mono text-sm">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="size-4 text-positive" />
              Income {formatCurrency(income, currency)}
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="size-4 text-negative" />
              Expenses {formatCurrency(expense, currency)}
            </span>
            <span>Net {formatCurrency(net, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Goals Card if any */}
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            <CardDescription>{goals.length} active goal{goals.length === 1 ? "" : "s"}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {goals.slice(0, 4).map((goal) => {
              const saved = goal.savedAmount ?? 0;
              const pct = Math.min(Math.round((saved / (goal.targetAmount || 1)) * 100), 100);
              return (
                <div key={goal._id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40">
                  <div className="flex items-center justify-between text-sm gap-2">
                    <span className="truncate flex-1 font-medium">{goal.name}</span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                      {formatCurrency(saved, currency)} of {formatCurrency(goal.targetAmount, currency)}
                    </span>
                  </div>
                  <Progress value={pct} mode="goal" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pct >= 90 ? "On track" : "In progress"}</span>
                    <span className={cn(
                      "font-mono font-bold px-1.5 py-0.5 rounded text-[11px]",
                      pct >= 90 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : pct >= 50 ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                    )}>
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
            <Button render={<Link href="/goals" />} variant="outline" size="sm" className="self-start">
              All goals
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Accounts & Budgets grid */}
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
                  <EmptyDescription>Add your first account to start tracking.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button render={<Link href="/accounts" />} size="sm">
                    Add an account
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              accounts.slice(0, 5).map((account) => (
                <div
                  key={account._id}
                  className="flex items-center justify-between border-l-2 border-primary py-2 pl-3 gap-2"
                >
                  <span className="text-sm truncate flex-1">{account.name}</span>
                  <span className="font-mono text-sm tabular-nums shrink-0">
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
                  <EmptyTitle>No budgets set</EmptyTitle>
                  <EmptyDescription>Set a monthly limit for categories you want to watch.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button render={<Link href="/planning" />} size="sm">
                    Set a budget
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              budgets.map((budget) => {
                const categoryName = categoryMap.get(budget.categoryId) ?? "Budget";
                const spent = budget.spent || 0;
                const limit = budget.amount || 1;
                const isOver = spent > limit;
                const pct = Math.round((spent / limit) * 100);
                return (
                  <div key={budget._id} className="flex flex-col gap-1.5 p-2 rounded-lg bg-muted/20 border border-border/40">
                    <div className="flex items-center justify-between text-sm gap-2">
                      <span className="truncate flex-1 font-medium">{categoryName}</span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                        {formatCurrency(spent, currency)} of {formatCurrency(limit, currency)}
                      </span>
                    </div>
                    <Progress value={Math.min(pct, 100)} mode="budget" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className={cn(isOver && "text-rose-600 dark:text-rose-400 font-semibold")}>
                        {isOver ? `Over budget by ${formatCurrency(spent - limit, currency)}` : `${formatCurrency(Math.max(0, limit - spent), currency)} remaining`}
                      </span>
                      <span className={cn(
                        "font-mono font-bold px-1.5 py-0.5 rounded text-[11px]",
                        isOver ? "bg-rose-500/15 text-rose-600 dark:text-rose-400" : pct >= 70 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      )}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent records */}
      <Card className="py-0">
        <CardHeader className="pt-6">
          <CardTitle>Recent records</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pb-2">
          {recentTxs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No records yet</EmptyTitle>
                <EmptyDescription>Add your first transaction to see it here.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link href="/records" />} size="sm">
                  Add a record
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {recentTxs.map((tx) => (
                <li key={tx._id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex flex-col">
                    <span className="text-sm">{tx.note || tx.type}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(tx.date)}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-sm tabular-nums ${
                      tx.type === "expense" ? "text-negative" : "text-positive"
                    }`}
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
