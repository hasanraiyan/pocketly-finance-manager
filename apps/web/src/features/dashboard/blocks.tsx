import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Flag,
  Flame,
  Gauge,
  Lightbulb,
  PiggyBank,
  Receipt,
  Repeat,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
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
import { GetStartedChecklist } from "@/features/onboarding/get-started-checklist";
import { WelcomeDialog } from "@/features/onboarding/welcome-dialog";
import { ScenarioDialog } from "@/features/intelligence/scenario-dialog";
import {
  getAccounts,
  getBudgets,
  getConnections,
  getCurrency,
  getForecast,
  getGoals,
  getHealth,
  getInsights,
  getOverview,
  getProfile,
  getRecentTransactions,
  getSafeToSpend,
} from "./data";

/** One line per band, so the score always arrives with a reading of it. */
const HEALTH_BAND_COPY = {
  strong: "Comfortable, with room to spare.",
  steady: "Holding together, with a couple of soft spots.",
  fragile: "Working, but there's not much slack.",
  strained: "Under pressure — worth a look at the components below.",
} as const;

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

  // Plain card styling since safe-to-spend took the hero slot: two
  // full-bleed primary cards on one page compete rather than rank.
  return (
    <Card>
      <CardHeader>
        <CardTitle>Total balance</CardTitle>
        <CardDescription>Across every account</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <span className="font-heading text-3xl tabular-nums">
          {balanceUnavailable ? "—" : formatCurrency(totalBalance, currency)}
        </span>
        {balanceUnavailable ? (
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your balances just now. Refresh to try again.
          </p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 font-mono text-sm">
            <span className="flex items-center gap-1.5">
              <ArrowUpRight className="size-4 text-positive" />
              Income {formatCurrency(overview?.income ?? 0, currency)}
            </span>
            <span className="flex items-center gap-1.5">
              <ArrowDownRight className="size-4 text-negative" />
              Expenses {formatCurrency(overview?.expense ?? 0, currency)}
            </span>
            <span>Net {formatCurrency(overview?.net ?? 0, currency)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The number the product now leads with.
 *
 * A balance says what you have; safe-to-spend says what you can actually use
 * once the bills, budgets and goals already committed are taken off. It sits
 * inside the balance card rather than beside it because the two are one
 * thought -- and the deductions are itemised because a figure the user
 * can't reconstruct is a figure they won't trust.
 */
export async function SafeToSpendCard() {
  const [safeRes, currency] = await Promise.all([
    getSafeToSpend(),
    getCurrency(),
  ]);
  const safe = safeRes.data?.data;

  if (safeRes.error || !safe) return null;

  return (
    <Card className="overflow-hidden border-none bg-primary text-primary-foreground py-0">
      <CardContent className="flex flex-col gap-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm tracking-wide text-primary-foreground/70 uppercase">
            Safe to spend
          </span>
          <ScenarioDialog currency={currency} />
        </div>

        <span className="font-heading text-5xl tabular-nums sm:text-6xl">
          {formatCurrency(safe.amount, currency)}
        </span>

        {safe.shortfall > 0 && (
          <p className="-mt-3 text-sm text-primary-foreground/80">
            You&apos;re {formatCurrency(safe.shortfall, currency)} short of what
            you&apos;ve committed this month.
          </p>
        )}

        <dl className="flex flex-col gap-1 border-t border-primary-foreground/15 pt-4 font-mono text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-sans text-primary-foreground/70">Balance</dt>
            <dd className="tabular-nums">
              {formatCurrency(safe.totalBalance, currency)}
            </dd>
          </div>
          {safe.expectedIncome > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="font-sans text-primary-foreground/70">
                Still coming in
              </dt>
              <dd className="tabular-nums">
                +{formatCurrency(safe.expectedIncome, currency)}
              </dd>
            </div>
          )}
          {safe.deductions.map((deduction) => (
            <div key={deduction.key} className="flex justify-between gap-4">
              <dt className="font-sans text-primary-foreground/70">
                {deduction.label}
              </dt>
              <dd className="tabular-nums">
                -{formatCurrency(deduction.amount, currency)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * Where the month ends up, and the first day it goes wrong.
 *
 * The closing figure alone hides the fortnight in the middle where the
 * account is actually empty, so the dip gets its own line whenever there is
 * one.
 */
export async function ForecastCard() {
  const [forecastRes, currency] = await Promise.all([
    getForecast(),
    getCurrency(),
  ]);
  const forecast = forecastRes.data?.data;

  if (forecastRes.error || !forecast) return null;

  const direction =
    forecast.projectedBalance >= forecast.openingBalance ? "up" : "down";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Where this month ends</CardTitle>
        <CardDescription>
          Your repeats on their own dates, plus what you usually spend.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-3xl tabular-nums">
            {formatCurrency(forecast.projectedBalance, currency)}
          </span>
          {direction === "up" ? (
            <TrendingUp className="size-4 text-positive" />
          ) : (
            <TrendingDown className="size-4 text-negative" />
          )}
        </div>

        {forecast.shortfallDate && (
          <p className="text-sm text-negative">
            You dip below zero around {formatDate(forecast.shortfallDate)},
            bottoming out at {formatCurrency(forecast.lowestBalance, currency)}.
          </p>
        )}

        <dl className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between gap-2">
            <dt>Coming in</dt>
            <dd className="tabular-nums">
              {formatCurrency(forecast.projectedIncome, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Repeats going out</dt>
            <dd className="tabular-nums">
              {formatCurrency(forecast.projectedExpense, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Everything else, at your usual rate</dt>
            <dd className="tabular-nums">
              {formatCurrency(forecast.projectedDiscretionary, currency)}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

/**
 * The score, and the six statements behind it.
 *
 * Every component carries its own reason, so the number is never the whole
 * message -- the point of a health score people trust is that they can see
 * what moved it.
 */
export async function HealthCard() {
  const healthRes = await getHealth();
  const health = healthRes.data?.data;

  // Nothing to judge yet: a "0 out of 100" for a new account is a worse
  // welcome than no card at all.
  if (healthRes.error || !health || health.components.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial health</CardTitle>
        <CardDescription>{HEALTH_BAND_COPY[health.band]}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl tabular-nums">
            {health.score}
          </span>
          <span className="text-sm text-muted-foreground">out of 100</span>
        </div>

        <div className="flex flex-col gap-3">
          {health.components.map((component) => (
            <div key={component.key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>{component.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {component.score}
                </span>
              </div>
              <Progress value={component.score} />
              <span className="text-xs text-muted-foreground">
                {component.reason}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Renders nothing without goals -- the /goals empty state already makes the
 * case, and a second empty card on the dashboard only teaches people to skip
 * past this spot.
 */
export async function GoalsCard() {
  const [goalsRes, currency] = await Promise.all([getGoals(), getCurrency()]);
  const goals = goalsRes.data?.data.items ?? [];

  if (goalsRes.error || goals.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goals</CardTitle>
        <CardDescription>
          {goals.filter((goal) => goal.onTrack).length} of {goals.length} on
          track
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {goals.slice(0, 4).map((goal) => (
          <div key={goal._id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate">{goal.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {formatCurrency(goal.progress, currency)} of{" "}
                {formatCurrency(goal.targetAmount, currency)}
              </span>
            </div>
            <Progress value={goal.percentComplete} />
          </div>
        ))}
        <Button
          render={<Link href="/goals" />}
          variant="outline"
          size="sm"
          className="self-start"
        >
          All goals
        </Button>
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

const INSIGHT_ICONS: Record<string, LucideIcon> = {
  budget_pace: Gauge,
  category_spike: Flame,
  net_negative: TrendingDown,
  recurring_load: Repeat,
  largest_expense: Receipt,
  forecast_shortfall: TrendingDown,
  goal_delay: Flag,
  recurring_growth: Repeat,
  savings_opportunity: PiggyBank,
  positive_trend: TrendingUp,
};

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
          // The server's list of kinds can grow ahead of this deploy, so an
          // unrecognised kind falls back rather than blanking the card.
          const Icon = INSIGHT_ICONS[insight.kind] ?? Lightbulb;
          return (
            <div key={insight.kind + insight.title} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex min-w-0 flex-col">
                <span className="text-sm text-foreground">{insight.title}</span>
                <span className="text-xs text-muted-foreground">
                  {insight.detail}
                </span>
                {/* What to do about it, when there is something to do --
                    the difference between a dashboard and a decision. */}
                {insight.action && (
                  <span className="mt-1 text-xs text-foreground/80">
                    {insight.action}
                  </span>
                )}
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
 * an empty ledger just teaches people to dismiss things.
 *
 * Rendered with no Suspense fallback on purpose -- see the note in page.tsx.
 */
export async function GetStartedCard() {
  const [
    profileRes,
    accountsRes,
    transactionsRes,
    budgetsRes,
    goalsRes,
    connectionsRes,
  ] = await Promise.all([
    getProfile(),
    getAccounts(),
    getRecentTransactions(),
    getBudgets(),
    getGoals(),
    getConnections(),
  ]);

  // A failed request is not a completed step, but it is also not a reason to
  // tell someone to redo work they may already have done -- so if anything
  // failed to load, say nothing rather than guess.
  if (
    profileRes.error ||
    accountsRes.error ||
    transactionsRes.error ||
    budgetsRes.error ||
    goalsRes.error ||
    connectionsRes.error
  ) {
    return null;
  }

  if (profileRes.data?.data.checklistDismissedAt) return null;

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
      title: "Set a goal",
      detail: "What you're saving for — Pocketly holds it back from what's spendable.",
      href: "/goals",
      done: (goalsRes.data?.data.items.length ?? 0) > 0,
    },
    {
      title: "Connect an AI client",
      detail: "Ask Claude or ChatGPT about your money, using your own plan.",
      href: "/mcp-guide",
      done: (connectionsRes.data?.data.items.length ?? 0) > 0,
    },
  ];

  return <GetStartedChecklist steps={steps} />;
}

/**
 * First-run walkthrough. Reads the flag server-side from the profile that
 * `Greeting` already fetched, so this costs no extra request, and mounts
 * the dialog only for someone who hasn't seen it.
 */
export async function Welcome() {
  const profileRes = await getProfile();
  // If the profile can't be read, say nothing: showing a first-run
  // walkthrough to an existing user is worse than showing it to nobody.
  if (profileRes.error) return null;

  return (
    <WelcomeDialog
      onboarded={Boolean(profileRes.data?.data.onboardedAt)}
    />
  );
}
