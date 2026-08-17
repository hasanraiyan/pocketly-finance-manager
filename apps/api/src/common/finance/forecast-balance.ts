import { addDays, eachDayOfInterval, endOfMonth, format } from 'date-fns';
import { formatInTimeZone, fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { DateRange } from './get-period-window';
import type { ProjectedOccurrence } from './project-recurring';

export const FORECAST_HORIZONS = ['month', '30d', '90d'] as const;
export type ForecastHorizon = (typeof FORECAST_HORIZONS)[number];

/**
 * The window a forecast covers: always *from now*, never from the start of
 * the period. Money already spent is in the balance, and re-projecting it
 * from the 1st would count it twice.
 */
export function resolveForecastWindow(
  horizon: ForecastHorizon,
  timezone: string,
  now: Date = new Date(),
): DateRange {
  const zonedNow = toZonedTime(now, timezone);

  const zonedEnd =
    horizon === 'month'
      ? endOfMonth(zonedNow)
      : addDays(zonedNow, horizon === '30d' ? 30 : 90);

  return { start: now, end: fromZonedTime(zonedEnd, timezone) };
}

export interface ForecastInputs {
  /** Balance across all accounts as things stand right now. */
  openingBalance: number;
  window: DateRange;
  /** Dated recurring occurrences, from `projectRecurring`. */
  occurrences: ProjectedOccurrence[];
  /** Mean daily spend on everything that isn't a recurring rule. */
  discretionaryDailyRate: number;
  timezone: string;
}

export interface ForecastPoint {
  /** `YYYY-MM-DD` in the user's timezone. */
  date: string;
  balance: number;
  /** Recurring money in and out landing on this day. */
  income: number;
  expense: number;
}

export interface Forecast {
  openingBalance: number;
  /** Balance at the end of the window. The headline number. */
  projectedBalance: number;
  projectedIncome: number;
  projectedExpense: number;
  /** Non-recurring spend expected over the window, at the current run-rate. */
  projectedDiscretionary: number;
  days: ForecastPoint[];
  lowestBalance: number;
  /** First day the balance goes negative, `null` when it never does. */
  shortfallDate: string | null;
}

/**
 * A day-by-day projection of total balance to the end of the window.
 *
 * Two sources, kept separate on purpose. Recurring rules are *dated* -- rent
 * leaves on the 1st, salary lands on the 25th, and a forecast that smeared
 * them across the month would hide the fortnight where the account is
 * actually empty. Everything else is a flat run-rate, because there is no
 * honest way to date a coffee that hasn't been bought.
 *
 * The run-rate is applied from the first full day onward: today's spending is
 * already in the opening balance, and charging a whole day's rate on top of it
 * would double-count the morning.
 */
export function forecastBalance({
  openingBalance,
  window,
  occurrences,
  discretionaryDailyRate,
  timezone,
}: ForecastInputs): Forecast {
  const byDay = new Map<string, { income: number; expense: number }>();
  for (const occurrence of occurrences) {
    const key = formatInTimeZone(occurrence.date, timezone, 'yyyy-MM-dd');
    const entry = byDay.get(key) ?? { income: 0, expense: 0 };
    if (occurrence.type === 'income') entry.income += occurrence.amount;
    else entry.expense += occurrence.amount;
    byDay.set(key, entry);
  }

  const dayKeys = eachDayOfInterval({
    start: toZonedTime(window.start, timezone),
    end: toZonedTime(window.end, timezone),
  }).map((day) => format(day, 'yyyy-MM-dd'));

  const rate = Math.max(0, Math.round(discretionaryDailyRate));

  let balance = openingBalance;
  let projectedIncome = 0;
  let projectedExpense = 0;
  let projectedDiscretionary = 0;
  let lowestBalance = openingBalance;
  let shortfallDate: string | null = null;

  const days: ForecastPoint[] = dayKeys.map((date, index) => {
    const { income, expense } = byDay.get(date) ?? { income: 0, expense: 0 };
    const discretionary = index === 0 ? 0 : rate;

    balance += income - expense - discretionary;
    projectedIncome += income;
    projectedExpense += expense;
    projectedDiscretionary += discretionary;

    if (balance < lowestBalance) lowestBalance = balance;
    if (balance < 0 && shortfallDate === null) shortfallDate = date;

    return { date, balance, income, expense };
  });

  return {
    openingBalance,
    projectedBalance: balance,
    projectedIncome,
    projectedExpense,
    projectedDiscretionary,
    days,
    lowestBalance,
    shortfallDate,
  };
}
