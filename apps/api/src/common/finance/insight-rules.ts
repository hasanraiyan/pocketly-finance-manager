import type { GoalStatus } from './goal-projection';

export const INSIGHT_KINDS = [
  'budget_pace',
  'category_spike',
  'net_negative',
  'recurring_load',
  'largest_expense',
  'forecast_shortfall',
  'goal_delay',
  'recurring_growth',
  'savings_opportunity',
  'positive_trend',
] as const;

export type InsightKind = (typeof INSIGHT_KINDS)[number];

export interface Insight {
  kind: InsightKind;
  /** Ranking only. Higher is more worth the user's attention. */
  weight: number;
  title: string;
  detail: string;
  /**
   * What the user can do about it. Optional because a few insights are
   * genuinely just information -- but an insight that *could* name an action
   * and doesn't is the difference between a dashboard and a decision.
   */
  action?: string;
}

/** Formats integer minor units for display. Injected so rules stay pure. */
export type MoneyFormatter = (minorUnits: number) => string;

/**
 * Below this, a percentage is arithmetically true and practically noise:
 * ₹30 -> ₹50 is "a 67% spike" and nobody cares. Every ratio rule pairs with
 * an absolute floor for this reason -- percentage-only thresholds are why
 * this class of feature gets ignored.
 */
export const MATERIAL_AMOUNT = 50_000; // ₹500.00 in minor units

/** A category has to exceed its own average by this much to be worth saying. */
export const SPIKE_RATIO = 1.3;

/** Fewer months than this and an "average" is not an average. */
export const MIN_MONTHS_OF_HISTORY = 2;

export interface CategorySpend {
  categoryId: string;
  name: string;
  total: number;
  /** Mean spend for this category over the preceding complete months. */
  averageTotal: number;
  monthsOfHistory: number;
}

export interface BudgetPace {
  categoryName: string;
  limit: number;
  spent: number;
  daysElapsed: number;
  daysInPeriod: number;
}

/**
 * A category well above its own recent average.
 *
 * Compared against the category's own history rather than against other
 * categories: rent being the biggest line every month is not news.
 */
export function categorySpikeInsight(
  spend: CategorySpend,
  format: MoneyFormatter,
): Insight | null {
  if (spend.monthsOfHistory < MIN_MONTHS_OF_HISTORY) return null;
  if (spend.averageTotal <= 0) return null;
  if (spend.total < MATERIAL_AMOUNT) return null;

  const ratio = spend.total / spend.averageTotal;
  if (ratio < SPIKE_RATIO) return null;

  const percentAbove = Math.round((ratio - 1) * 100);

  return {
    kind: 'category_spike',
    // Bigger overshoots rank higher, but a huge ratio on a small base
    // shouldn't outrank a moderate one on a large base.
    weight: Math.min(percentAbove, 200) + spend.total / MATERIAL_AMOUNT,
    title: `${spend.name} is up ${percentAbove}%`,
    detail: `${format(spend.total)} so far, against an average of ${format(
      Math.round(spend.averageTotal),
    )}.`,
    action: `Check what changed in ${spend.name} this period.`,
  };
}

/**
 * On track to blow a budget before the period ends.
 *
 * Projects at the current daily rate. Deliberately silent in the first days
 * of a period: one big shop on the 2nd projects to an absurd month and would
 * fire this every single month.
 */
export function budgetPaceInsight(
  pace: BudgetPace,
  format: MoneyFormatter,
): Insight | null {
  if (pace.daysElapsed < 5 || pace.daysElapsed >= pace.daysInPeriod) {
    return null;
  }
  if (pace.spent <= 0 || pace.limit <= 0) return null;

  const projected = Math.round(
    (pace.spent / pace.daysElapsed) * pace.daysInPeriod,
  );
  if (projected <= pace.limit) return null;

  const overBy = projected - pace.limit;
  if (overBy < MATERIAL_AMOUNT) return null;

  // Days until the limit is reached at the current rate.
  const dailyRate = pace.spent / pace.daysElapsed;
  const daysToLimit = Math.max(
    0,
    Math.ceil((pace.limit - pace.spent) / dailyRate),
  );

  return {
    kind: 'budget_pace',
    // The most actionable insight in the set -- it is about money not yet
    // spent -- so it outranks the rest by default.
    weight: 300 + Math.min(overBy / MATERIAL_AMOUNT, 100),
    title:
      daysToLimit === 0
        ? `${pace.categoryName} budget is already spent`
        : `${pace.categoryName} budget runs out in ${daysToLimit} day${
            daysToLimit === 1 ? '' : 's'
          }`,
    detail: `${format(pace.spent)} of ${format(
      pace.limit,
    )} used. At this pace you'll finish the period around ${format(projected)}.`,
    action: `Hold ${pace.categoryName} to ${format(
      Math.max(
        0,
        Math.round(
          (pace.limit - pace.spent) /
            Math.max(1, pace.daysInPeriod - pace.daysElapsed),
        ),
      ),
    )} a day to stay inside it.`,
  };
}

/** Spending more than came in over the period. */
export function netNegativeInsight(
  totals: { income: number; expense: number },
  format: MoneyFormatter,
): Insight | null {
  const net = totals.income - totals.expense;
  if (net >= 0) return null;
  if (Math.abs(net) < MATERIAL_AMOUNT) return null;
  // With no income recorded, "spent more than you earned" is a statement
  // about missing data rather than about spending.
  if (totals.income <= 0) return null;

  return {
    kind: 'net_negative',
    weight: 200 + Math.min(Math.abs(net) / MATERIAL_AMOUNT, 100),
    title: `You spent ${format(Math.abs(net))} more than you earned`,
    detail: `${format(totals.expense)} out against ${format(
      totals.income,
    )} in.`,
    action: 'The gap came out of savings — check which category grew.',
  };
}

/**
 * What the active repeats commit to each month.
 *
 * Not a warning -- a number most people have never added up, and one they
 * can only see once recurring rules exist.
 */
export function recurringLoadInsight(
  monthlyTotal: number,
  ruleCount: number,
  format: MoneyFormatter,
): Insight | null {
  if (ruleCount === 0 || monthlyTotal < MATERIAL_AMOUNT) return null;

  return {
    kind: 'recurring_load',
    weight: 100,
    title: `${format(monthlyTotal)} a month is already committed`,
    detail: `Across ${ruleCount} repeat${
      ruleCount === 1 ? '' : 's'
    } before anything else you spend.`,
    action: 'Worth a look if any of them have crept up.',
  };
}

/** The single biggest expense in the period. */
export function largestExpenseInsight(
  largest: { description: string; amount: number } | null,
  totalExpense: number,
  format: MoneyFormatter,
): Insight | null {
  if (!largest || largest.amount < MATERIAL_AMOUNT) return null;
  // Only interesting when it's a meaningful slice of the period.
  if (totalExpense <= 0 || largest.amount / totalExpense < 0.2) return null;

  const share = Math.round((largest.amount / totalExpense) * 100);

  return {
    kind: 'largest_expense',
    weight: 50 + share,
    title: `${largest.description} was your biggest expense`,
    detail: `${format(largest.amount)} — ${share}% of everything you spent.`,
  };
}

/**
 * The balance is projected to go negative before the period ends.
 *
 * Ranked above everything else: it is the only rule about money the user
 * still has time to not spend.
 */
export function forecastShortfallInsight(
  forecast: {
    shortfallDate: string | null;
    lowestBalance: number;
    projectedBalance: number;
  },
  format: MoneyFormatter,
): Insight | null {
  if (!forecast.shortfallDate) return null;

  const recovers = forecast.projectedBalance >= 0;

  return {
    kind: 'forecast_shortfall',
    weight: 400,
    title: `You're on track to run out around ${forecast.shortfallDate}`,
    detail: recovers
      ? `Money lands later in the period, but you dip to ${format(
          forecast.lowestBalance,
        )} first.`
      : `At this rate the period ends at ${format(forecast.projectedBalance)}.`,
    action: recovers
      ? 'Move a bill later or hold off on non-essentials until then.'
      : 'Cut back now, or bring income forward before that date.',
  };
}

/**
 * A goal that won't arrive on time, or isn't moving at all.
 *
 * Only fires for goals the user gave a deadline or a rate -- one with
 * neither is a wish, not a plan, and nagging about it is noise.
 */
export function goalDelayInsight(
  goal: {
    name: string;
    status: GoalStatus;
    monthlyShortfall: number;
    requiredMonthly: number | null;
  },
  format: MoneyFormatter,
): Insight | null {
  if (goal.status === 'overdue') {
    return {
      kind: 'goal_delay',
      // Above at_risk's band -- the deadline itself has already passed,
      // which is more urgent than merely being behind pace for one.
      weight: 320,
      title: `${goal.name}'s date has already passed`,
      detail: `${format(goal.requiredMonthly ?? 0)} would close it out today.`,
      action: "Add what's left, or set a new date.",
    };
  }

  if (goal.status === 'at_risk' && goal.monthlyShortfall >= MATERIAL_AMOUNT) {
    return {
      kind: 'goal_delay',
      weight: 250 + Math.min(goal.monthlyShortfall / MATERIAL_AMOUNT, 50),
      title: `${goal.name} won't make its date`,
      detail: `You'd need ${format(
        goal.requiredMonthly ?? 0,
      )} a month — that's ${format(goal.monthlyShortfall)} more than you're putting in.`,
      action: `Raise the monthly amount, or move the date out.`,
    };
  }

  if (goal.status === 'stalled') {
    return {
      kind: 'goal_delay',
      weight: 220,
      title: `${goal.name} isn't moving`,
      detail:
        'Nothing is being put aside for it, so it has no completion date.',
      action: 'Set a monthly amount to give it one.',
    };
  }

  return null;
}

/** Fixed commitments climbing against their own recent level. */
export function recurringGrowthInsight(
  current: number,
  average: number,
  format: MoneyFormatter,
): Insight | null {
  if (average <= 0 || current < MATERIAL_AMOUNT) return null;

  const increase = current - average;
  if (increase < MATERIAL_AMOUNT) return null;
  if (current / average < SPIKE_RATIO) return null;

  return {
    kind: 'recurring_growth',
    weight: 150 + Math.min(increase / MATERIAL_AMOUNT, 50),
    title: `Your fixed costs are up ${format(increase)} a month`,
    detail: `${format(current)} in repeats now, against ${format(
      Math.round(average),
    )} before.`,
    action: 'Check your repeats for a subscription you no longer use.',
  };
}

/**
 * Money left over that nothing has a claim on.
 *
 * Deliberately silent for anyone already saving towards a goal -- telling
 * someone with a plan that they should have a plan is how insight panels get
 * ignored.
 */
export function savingsOpportunityInsight(
  totals: { income: number; expense: number },
  goalCommitments: number,
  format: MoneyFormatter,
): Insight | null {
  if (goalCommitments > 0) return null;

  const surplus = totals.income - totals.expense;
  if (surplus < MATERIAL_AMOUNT) return null;

  return {
    kind: 'savings_opportunity',
    weight: 80 + Math.min(surplus / MATERIAL_AMOUNT, 50),
    title: `${format(surplus)} is sitting spare`,
    detail: 'You came out ahead this period and none of it is earmarked.',
    action: 'Set a goal so it goes somewhere on purpose.',
  };
}

/**
 * Spending genuinely down against the user's own recent months.
 *
 * `expectedByNow` must already be pro-rated for how much of the period has
 * elapsed -- comparing a half-finished month against a whole one would
 * congratulate everybody on the 10th.
 *
 * The one rule here that exists to say something good. Without it every
 * insight is a warning, and a product that only ever tells you off gets
 * closed.
 */
export function positiveTrendInsight(
  currentExpense: number,
  expectedByNow: number,
  format: MoneyFormatter,
): Insight | null {
  if (expectedByNow <= 0 || currentExpense <= 0) return null;

  const saved = expectedByNow - currentExpense;
  if (saved < MATERIAL_AMOUNT) return null;

  const percentBelow = Math.round((saved / expectedByNow) * 100);
  if (percentBelow < 10) return null;

  return {
    kind: 'positive_trend',
    weight: 40 + Math.min(percentBelow, 40),
    title: `Spending is down ${percentBelow}%`,
    detail: `${format(currentExpense)} so far, against ${format(
      Math.round(expectedByNow),
    )} expected by now.`,
  };
}

/**
 * Highest-weight first, capped.
 *
 * A wall of insights is noise: three is enough to be worth reading and few
 * enough that the top one is actually seen.
 */
export function rankInsights(
  insights: Array<Insight | null>,
  limit = 3,
): Insight[] {
  return insights
    .filter((insight): insight is Insight => insight !== null)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit);
}
