import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Circle,
  Flame,
  Gauge,
  Receipt,
  Repeat,
  TrendingDown,
} from "lucide-react";
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
  getConnections,
  getCurrency,
  getInsights,
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
  const firstName = data?.data?.name?.split(" ")[0];

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

const INSIGHT_ICONS = {
  budget_pace: Gauge,
  category_spike: Flame,
  net_negative: TrendingDown,
  recurring_load: Repeat,
  largest_expense: Receipt,
} as const;

/**
 * Arithmetic over the user's own data -- no model, no inference cost, and
 * no chance of inventing a figure.
 *
 * Renders nothing at all when no rule fired. An insights card that says
 * "no insights" is worse than no card: it takes up the same space and
 * teaches the user to skip past it. A new account with two transactions
 * should simply not see this yet.
 */
export async function InsightsCard() {
  const insightsRes = await getInsights();
  const insights = insightsRes.data?.data.insights ?? [];

  if (insightsRes.error || insights.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worth knowing</CardTitle>
        <CardDescription>From your records this period</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {insights.map((insight) => {
          const Icon = INSIGHT_ICONS[insight.kind];
          return (
            <div key={insight.kind + insight.title} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-foreground">{insight.title}</span>
                <span className="text-xs text-muted-foreground">
                  {insight.detail}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * The path through the product for someone who just signed up, and the only
 * place a new user is told the MCP server exists at all -- until now that
 * lived in a single footer link, which is no discovery at all for the one
 * feature nothing else on the market has.
 *
 * A checklist rather than a one-shot tour: connecting an AI client is only
 * worth doing once there is data to connect it to, and a tour that fires on
 * an empty ledger just teaches people to dismiss things. This persists,
 * shows what's left, and disappears on its own when the work is done.
 */
export async function GetStartedCard() {
  const [accountsRes, transactionsRes, budgetsRes, connectionsRes] =
    await Promise.all([
      getAccounts(),
      getRecentTransactions(),
      getBudgets(),
      getConnections(),
    ]);

  // A failed request is not a completed step, but it is also not a reason to
  // tell someone to redo work they may already have done -- so if anything
  // failed to load, say nothing rather than guess.
  if (
    accountsRes.error ||
    transactionsRes.error ||
    budgetsRes.error ||
    connectionsRes.error
  ) {
    return null;
  }

  const steps = [
    {
      title: "Add an account",
      detail: "A bank account, wallet, or card to track.",
      href: "/accounts",
      done: (accountsRes.data?.data.items.length ?? 0) > 0,
    },
    {
      title: "Log a record",
      detail: "Your first expense or income.",
      href: "/records",
      done: (transactionsRes.data?.data.items.length ?? 0) > 0,
    },
    {
      title: "Set a budget",
      detail: "A monthly limit for a category you want to watch.",
      href: "/planning",
      done: (budgetsRes.data?.data.items.length ?? 0) > 0,
    },
    {
      title: "Connect an AI client",
      detail: "Ask Claude or ChatGPT about your money, using your own plan.",
      href: "/mcp-guide",
      done: (connectionsRes.data?.data.items.length ?? 0) > 0,
    },
  ];

  const completed = steps.filter((step) => step.done).length;
  // Nothing left to say once it's all done.
  if (completed === steps.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get started</CardTitle>
        <CardDescription>
          {completed} of {steps.length} done
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <Progress
          value={(completed / steps.length) * 100}
          className="mb-3"
        />
        {steps.map((step) => (
          <div
            key={step.href}
            className="flex items-center justify-between gap-3 py-1.5"
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {step.done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-positive" />
              ) : (
                <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              )}
              <div className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "text-sm",
                    step.done ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.title}
                </span>
                {!step.done && (
                  <span className="text-xs text-muted-foreground">
                    {step.detail}
                  </span>
                )}
              </div>
            </div>
            {!step.done && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                render={<Link href={step.href} />}
              >
                Go
                <ArrowRight />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
