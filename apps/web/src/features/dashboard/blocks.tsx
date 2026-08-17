import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  getAccounts,
  getBudgets,
  getCurrency,
  getOverview,
  getProfile,
  getRecentTransactions,
} from "./data";

/**
 * Each block is an independent async Server Component behind its own
 * `<Suspense>` boundary in `page.tsx`, so a slow aggregate on one card
 * doesn't hold up the rest of the page.
 *
 * Blocks fail independently too. Where a missing figure would read as a
 * real number -- a balance of zero, an empty account list -- the block
 * says it couldn't load rather than quietly showing 0.00.
 */

export async function Greeting() {
  const { data } = await getProfile();
  const firstName = data?.data.name.split(" ")[0];

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground">
        {firstName ? `Hi ${firstName}` : "Hi"}
      </h1>
      <p className="text-sm text-muted-foreground">
        Here&apos;s where things stand.
      </p>
    </div>
  );
}

export async function BalanceCard() {
  const [accountsRes, overviewRes, currency] = await Promise.all([
    getAccounts(),
    getOverview(),
    getCurrency(),
  ]);

  // Sum every account, not just the handful the list below shows -- the
  // card used to total a truncated page of accounts and under-report.
  const accounts = accountsRes.data?.data.items ?? [];
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const overview = overviewRes.data?.data;
  const balanceUnavailable = Boolean(accountsRes.error);

  return (
    <Card className="overflow-hidden border-none bg-primary text-primary-foreground py-0">
      <CardContent className="flex flex-col gap-6 p-8">
        <span className="text-sm tracking-wide text-primary-foreground/70 uppercase">
          Total balance
        </span>
        <span className="font-heading text-5xl tabular-nums sm:text-6xl">
          {balanceUnavailable ? "—" : formatCurrency(totalBalance, currency)}
        </span>
        {balanceUnavailable ? (
          <p className="border-t border-primary-foreground/15 pt-4 text-sm text-primary-foreground/70">
            We couldn&apos;t load your balances just now. Refresh to try again.
          </p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}

export async function AccountsCard() {
  const [accountsRes, currency] = await Promise.all([
    getAccounts(),
    getCurrency(),
  ]);
  const accounts = accountsRes.data?.data.items ?? [];
  const shown = accounts.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>
          {accountsRes.error
            ? "Couldn't load"
            : `${accounts.length} account${accounts.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {accountsRes.error ? (
          <p className="py-4 text-sm text-muted-foreground">
            We couldn&apos;t load your accounts. Refresh to try again.
          </p>
        ) : accounts.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No accounts yet</EmptyTitle>
              <EmptyDescription>
                Add your first account to start tracking.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href="/accounts" />} size="sm">
                Add an account
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          shown.map((account) => (
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
  );
}

export async function BudgetsCard() {
  const [budgetsRes, currency] = await Promise.all([
    getBudgets(),
    getCurrency(),
  ]);
  const budgets = budgetsRes.data?.data.items ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budgets</CardTitle>
        <CardDescription>This period</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {budgetsRes.error ? (
          <p className="py-4 text-sm text-muted-foreground">
            We couldn&apos;t load your budgets. Refresh to try again.
          </p>
        ) : budgets.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No budgets yet</EmptyTitle>
              <EmptyDescription>
                Create a budget to start tracking your spending.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href="/planning" />} size="sm">
                Create a budget
              </Button>
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
  );
}

export async function RecentRecords() {
  const [transactionsRes, currency] = await Promise.all([
    getRecentTransactions(),
    getCurrency(),
  ]);
  const transactions = transactionsRes.data?.data.items ?? [];

  return (
    <Card className="py-0">
      <CardHeader className="pt-6">
        <CardTitle>Recent records</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {transactionsRes.error ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">
            We couldn&apos;t load your records. Refresh to try again.
          </p>
        ) : transactions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No records yet</EmptyTitle>
              <EmptyDescription>
                Add your first transaction to see it here.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href="/records" />} size="sm">
                Add a record
              </Button>
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
                  <span className="text-sm">{tx.description || tx.type}</span>
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
  );
}
