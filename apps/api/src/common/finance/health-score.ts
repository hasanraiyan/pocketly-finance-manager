import type { GoalStatus } from './goal-projection';

export const HEALTH_COMPONENTS = [
  'savings_rate',
  'reserve_level',
  'cash_flow_stability',
  'budget_control',
  'goal_progress',
  'spending_consistency',
] as const;

export type HealthComponentKey = (typeof HEALTH_COMPONENTS)[number];

export const HEALTH_BANDS = [
  'strong',
  'steady',
  'fragile',
  'strained',
] as const;
export type HealthBand = (typeof HEALTH_BANDS)[number];

export interface HealthComponent {
  key: HealthComponentKey;
  label: string;
  /** 0–100. */
  score: number;
  /** Share of the total this component carries, before renormalisation. */
  weight: number;
  /** Why it scored what it scored, in the user's own numbers. */
  reason: string;
}

export interface HealthScore {
  /** 0–100, the weighted mean of the components that could be computed. */
  score: number;
  band: HealthBand;
  components: HealthComponent[];
  /** Components with no data to judge, and why they were left out. */
  unavailable: Array<{ key: HealthComponentKey; reason: string }>;
}

export interface MonthTotals {
  income: number;
  expense: number;
}

export interface HealthInputs {
  /** Complete months, oldest first. */
  months: MonthTotals[];
  totalBalance: number;
  budgets: Array<{ limit: number; spent: number }>;
  goals: Array<{ status: GoalStatus }>;
}

const WEIGHTS: Record<HealthComponentKey, number> = {
  savings_rate: 25,
  reserve_level: 20,
  cash_flow_stability: 20,
  budget_control: 15,
  goal_progress: 15,
  spending_consistency: 5,
};

/** Saving 30% of income is the top of the scale, not the average. */
const SAVINGS_RATE_CEILING = 0.3;

/** Six months of expenses covered is a full reserve. */
const RESERVE_MONTHS_CEILING = 6;

/** Below this many complete months, an average is not an average. */
const MIN_MONTHS = 2;

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * A transparent 0–100 read on the user's finances.
 *
 * Every component reports its own score, its weight and a reason in the
 * user's actual numbers -- the score is a summary of six statements, not an
 * oracle. A component with nothing to judge (no budgets, no goals, no
 * history) is *excluded* and its weight redistributed, rather than scored
 * zero: someone who has set no goals is not thereby unhealthy, and punishing
 * them for it makes the number meaningless.
 */
export function calculateHealthScore({
  months,
  totalBalance,
  budgets,
  goals,
}: HealthInputs): HealthScore {
  const components: HealthComponent[] = [];
  const unavailable: HealthScore['unavailable'] = [];

  const hasHistory = months.length >= MIN_MONTHS;
  const totalIncome = months.reduce((sum, m) => sum + m.income, 0);
  const totalExpense = months.reduce((sum, m) => sum + m.expense, 0);
  const averageExpense = mean(months.map((m) => m.expense));

  // --- savings rate ---
  if (hasHistory && totalIncome > 0) {
    const rate = (totalIncome - totalExpense) / totalIncome;
    components.push({
      key: 'savings_rate',
      label: 'Savings rate',
      score: clamp((rate / SAVINGS_RATE_CEILING) * 100),
      weight: WEIGHTS.savings_rate,
      reason:
        rate >= 0
          ? `You keep ${percent(rate)} of what you earn.`
          : `You spend ${percent(-rate)} more than you earn.`,
    });
  } else {
    unavailable.push({
      key: 'savings_rate',
      reason: 'No recorded income to measure against yet.',
    });
  }

  // --- reserve level ---
  if (averageExpense > 0) {
    const monthsCovered = totalBalance / averageExpense;
    components.push({
      key: 'reserve_level',
      label: 'Reserve',
      score: clamp((monthsCovered / RESERVE_MONTHS_CEILING) * 100),
      weight: WEIGHTS.reserve_level,
      reason: `Your balance covers ${monthsCovered.toFixed(1)} months of spending.`,
    });
  } else {
    unavailable.push({
      key: 'reserve_level',
      reason: 'Not enough spending history to size a reserve.',
    });
  }

  // --- cash-flow stability ---
  if (hasHistory) {
    const positive = months.filter((m) => m.income - m.expense >= 0).length;
    components.push({
      key: 'cash_flow_stability',
      label: 'Cash flow',
      score: clamp((positive / months.length) * 100),
      weight: WEIGHTS.cash_flow_stability,
      reason: `${positive} of the last ${months.length} months ended in the black.`,
    });
  } else {
    unavailable.push({
      key: 'cash_flow_stability',
      reason: 'Needs at least two complete months.',
    });
  }

  // --- budget control ---
  if (budgets.length > 0) {
    const within = budgets.filter((b) => b.spent <= b.limit).length;
    components.push({
      key: 'budget_control',
      label: 'Budget control',
      score: clamp((within / budgets.length) * 100),
      weight: WEIGHTS.budget_control,
      reason: `${within} of ${budgets.length} budgets are still within their limit.`,
    });
  } else {
    unavailable.push({
      key: 'budget_control',
      reason: 'No budgets set.',
    });
  }

  // --- goal progress ---
  if (goals.length > 0) {
    const scoreByStatus: Record<GoalStatus, number> = {
      complete: 100,
      on_track: 100,
      at_risk: 50,
      stalled: 25,
      // Worse than merely at_risk -- the deadline itself has already passed.
      overdue: 0,
    };
    const onTrack = goals.filter(
      (g) => g.status === 'on_track' || g.status === 'complete',
    ).length;
    components.push({
      key: 'goal_progress',
      label: 'Goals',
      score: clamp(mean(goals.map((g) => scoreByStatus[g.status]))),
      weight: WEIGHTS.goal_progress,
      reason: `${onTrack} of ${goals.length} goals are on track.`,
    });
  } else {
    unavailable.push({ key: 'goal_progress', reason: 'No goals set.' });
  }

  // --- spending consistency ---
  if (hasHistory && averageExpense > 0) {
    const variance = mean(months.map((m) => (m.expense - averageExpense) ** 2));
    const coefficient = Math.sqrt(variance) / averageExpense;
    components.push({
      key: 'spending_consistency',
      label: 'Consistency',
      score: clamp((1 - coefficient) * 100),
      weight: WEIGHTS.spending_consistency,
      reason:
        coefficient < 0.25
          ? 'Your monthly spending barely moves.'
          : `Your monthly spending swings by about ${percent(coefficient)}.`,
    });
  } else {
    unavailable.push({
      key: 'spending_consistency',
      reason: 'Needs at least two complete months of spending.',
    });
  }

  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  const score =
    totalWeight === 0
      ? 0
      : clamp(
          components.reduce((sum, c) => sum + c.score * c.weight, 0) /
            totalWeight,
        );

  return { score, band: bandFor(score), components, unavailable };
}

export function bandFor(score: number): HealthBand {
  if (score >= 80) return 'strong';
  if (score >= 60) return 'steady';
  if (score >= 40) return 'fragile';
  return 'strained';
}
