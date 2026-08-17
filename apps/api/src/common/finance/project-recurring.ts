import {
  occurrencesBetween,
  type RecurrenceFrequency,
} from './next-occurrence';
import type { DateRange } from './get-period-window';

/**
 * The subset of a recurrence rule that projection needs. Deliberately not the
 * Mongoose document: these calculators stay pure and testable without a
 * database, and a scenario simulator needs to project hypothetical rules that
 * were never saved.
 */
export interface ProjectableRule {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description?: string;
  categoryId?: string | null;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: Date;
  endDate?: Date | null;
  timezone: string;
  paused?: boolean;
}

export interface ProjectedOccurrence {
  ruleId: string;
  date: Date;
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  categoryId?: string | null;
}

/**
 * Rough monthly equivalents, for adding up commitments that don't fall
 * monthly. Approximate by construction -- a weekly rule doesn't hit 4.333
 * times in any actual month -- and only ever used for "what am I committed to
 * per month", never for dated projection, which walks real occurrences.
 */
const MONTHLY_FACTOR: Record<RecurrenceFrequency, number> = {
  daily: 30,
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
};

/** A rule that is live, unpaused, and hasn't run past its end date. */
function isActive(rule: ProjectableRule, on: Date): boolean {
  if (rule.paused) return false;
  if (rule.endDate && rule.endDate < on) return false;
  return true;
}

/**
 * Every occurrence the given rules will produce inside `window`, oldest
 * first.
 *
 * Transfers are dropped: money moving between the user's own accounts nets to
 * zero across the position as a whole, so counting them would make a forecast
 * of total balance wrong by exactly the transferred amount.
 *
 * `limitPerRule` bounds a pathological rule (daily, over a year-long window)
 * so one projection can't build an unbounded array.
 */
export function projectRecurring(
  rules: ProjectableRule[],
  window: DateRange,
  limitPerRule = 400,
): ProjectedOccurrence[] {
  const occurrences: ProjectedOccurrence[] = [];

  for (const rule of rules) {
    if (rule.type === 'transfer') continue;
    if (!isActive(rule, window.start)) continue;

    const dates = occurrencesBetween(
      {
        startDate: rule.startDate,
        frequency: rule.frequency,
        interval: rule.interval,
        timezone: rule.timezone,
        endDate: rule.endDate,
      },
      window.start,
      window.end,
      limitPerRule,
    );

    for (const date of dates) {
      occurrences.push({
        ruleId: rule.id,
        date,
        type: rule.type,
        amount: rule.amount,
        description: rule.description,
        categoryId: rule.categoryId,
      });
    }
  }

  return occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface ProjectedTotals {
  income: number;
  expense: number;
  net: number;
}

export function sumProjected(
  occurrences: ProjectedOccurrence[],
): ProjectedTotals {
  let income = 0;
  let expense = 0;

  for (const occurrence of occurrences) {
    if (occurrence.type === 'income') income += occurrence.amount;
    else expense += occurrence.amount;
  }

  return { income, expense, net: income - expense };
}

/**
 * What the active rules commit to per month, as a single number.
 *
 * Unlike `projectRecurring` this is frequency arithmetic rather than dated
 * occurrences, which is what makes it usable for "your fixed costs are X a
 * month" regardless of where in the month you ask.
 */
export function monthlyCommitment(
  rules: ProjectableRule[],
  type: 'income' | 'expense',
  on: Date = new Date(),
): { count: number; total: number } {
  const live = rules.filter((rule) => rule.type === type && isActive(rule, on));

  const total = live.reduce(
    (sum, rule) =>
      sum +
      (rule.amount * MONTHLY_FACTOR[rule.frequency]) / (rule.interval || 1),
    0,
  );

  return { count: live.length, total: Math.round(total) };
}
