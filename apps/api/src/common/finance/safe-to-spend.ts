/**
 * The share of the balance held back as a floor, when the user hasn't set
 * one. Half a month of typical spending: enough that "safe to spend" doesn't
 * mean "spend until the account is empty", small enough that it doesn't
 * quietly hide most of the money.
 */
export const DEFAULT_RESERVE_DAYS = 15;

export interface SafeToSpendInputs {
  /** Balance across all accounts right now. */
  totalBalance: number;
  /** Recurring expenses still due before the window closes. */
  upcomingRecurring: number;
  /** Recurring income still expected before the window closes. */
  expectedIncome: number;
  /** Budgeted-but-unspent money for the current budget periods. */
  budgetCommitments: number;
  /** What this month's goals ask for. */
  goalCommitments: number;
  /** Minimum the user wants left untouched. */
  minimumReserve: number;
}

export const DEDUCTION_KEYS = [
  'upcoming_recurring',
  'budget_commitments',
  'goal_commitments',
  'minimum_reserve',
] as const;

export interface Deduction {
  key: (typeof DEDUCTION_KEYS)[number];
  label: string;
  amount: number;
}

export interface SafeToSpend {
  /** Never negative -- see `shortfall` for the other side of the story. */
  amount: number;
  totalBalance: number;
  expectedIncome: number;
  /** Everything subtracted, itemised, so the number can be explained. */
  deductions: Deduction[];
  totalDeductions: number;
  /** How far commitments exceed what's available. Zero when they don't. */
  shortfall: number;
}

/**
 * How much can be spent right now without breaking a commitment already made.
 *
 * Expected income counts, because a rent payment due after payday isn't a
 * problem — but the figure is clamped at zero and paired with `shortfall`
 * rather than being allowed to go negative. A negative "safe to spend" reads
 * as a bug; a zero with "you're ₹4,000 short this month" reads as the truth.
 *
 * Budget commitments are the *unspent* remainder, not the limit: money
 * already spent against a budget has left the balance, so subtracting the
 * whole limit would take it out twice.
 */
export function calculateSafeToSpend({
  totalBalance,
  upcomingRecurring,
  expectedIncome,
  budgetCommitments,
  goalCommitments,
  minimumReserve,
}: SafeToSpendInputs): SafeToSpend {
  const everyDeduction: Deduction[] = [
    {
      key: 'upcoming_recurring',
      label: 'Bills still due',
      amount: Math.max(0, upcomingRecurring),
    },
    {
      key: 'budget_commitments',
      label: 'Budgeted, not yet spent',
      amount: Math.max(0, budgetCommitments),
    },
    {
      key: 'goal_commitments',
      label: 'Set aside for goals',
      amount: Math.max(0, goalCommitments),
    },
    {
      key: 'minimum_reserve',
      label: 'Kept in reserve',
      amount: Math.max(0, minimumReserve),
    },
  ];

  const deductions = everyDeduction.filter((deduction) => deduction.amount > 0);
  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);
  const available = totalBalance + Math.max(0, expectedIncome);
  const net = available - totalDeductions;

  return {
    amount: Math.max(0, net),
    totalBalance,
    expectedIncome: Math.max(0, expectedIncome),
    deductions,
    totalDeductions,
    shortfall: Math.max(0, -net),
  };
}

/**
 * The default floor when the user hasn't named one: `DEFAULT_RESERVE_DAYS` of
 * their own spending, not a round number picked out of the air.
 */
export function defaultReserve(discretionaryDailyRate: number): number {
  return Math.max(0, Math.round(discretionaryDailyRate * DEFAULT_RESERVE_DAYS));
}

/**
 * Budgeted money that hasn't been spent yet.
 *
 * Overspent budgets contribute zero rather than a negative: the overspend has
 * already left the balance, and letting it *raise* safe-to-spend would reward
 * blowing a budget with permission to spend more.
 */
export function unspentBudgetTotal(
  budgets: Array<{ limit: number; spent: number }>,
): number {
  return budgets.reduce(
    (sum, budget) => sum + Math.max(0, budget.limit - budget.spent),
    0,
  );
}
