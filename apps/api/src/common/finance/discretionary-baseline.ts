/** Minimum distinct spending days before Pocketly treats a spending pattern as established. */
export const MIN_SPENDING_DAYS = 14;

/** Maximum calendar history used for the established baseline. */
export const MAX_BASELINE_DAYS = 90;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface DiscretionaryBaselineInputs {
  /** Total non-recurring expenses observed in the available history. */
  totalSpend: number;
  /** Date of the user's first non-recurring expense in the available history. */
  firstSpendDate: Date | null;
  /** Number of distinct calendar days on which the user spent. */
  spendingDays: number;
  /** The reference date used for the current context. */
  now: Date;
}

export interface DiscretionaryBaseline {
  /** Zero until there is enough history to make a useful estimate. */
  dailyRate: number;
  /** Calendar days actually used as the denominator once established. */
  lookbackDays: number;
  /** Whether Pocketly has enough data to call this an established baseline. */
  established: boolean;
  /** Distinct days with spending in the available history. */
  spendingDays: number;
}

/**
 * Build a spending baseline without pretending a brand-new account has 90 days
 * of financial history.
 *
 * The denominator is the actual calendar history available, capped at 90 days.
 * We only establish a baseline after 14 distinct spending days. Before that,
 * returning zero is intentional: safe-to-spend should not invent a reserve from
 * one or two purchases made by a new user.
 */
export function calculateDiscretionaryBaseline({
  totalSpend,
  firstSpendDate,
  spendingDays,
  now,
}: DiscretionaryBaselineInputs): DiscretionaryBaseline {
  if (
    totalSpend <= 0 ||
    !firstSpendDate ||
    spendingDays < MIN_SPENDING_DAYS
  ) {
    return {
      dailyRate: 0,
      lookbackDays: 0,
      established: false,
      spendingDays,
    };
  }

  const elapsedDays = Math.max(
    1,
    Math.floor((now.getTime() - firstSpendDate.getTime()) / MS_PER_DAY) + 1,
  );
  const lookbackDays = Math.min(MAX_BASELINE_DAYS, elapsedDays);

  return {
    dailyRate: totalSpend / lookbackDays,
    lookbackDays,
    established: true,
    spendingDays,
  };
}
