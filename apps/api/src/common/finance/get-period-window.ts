import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export type Period = 'weekly' | 'monthly' | 'yearly';

export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Resolves a budget/analysis period into UTC start/end instants, computed in
 * the user's own timezone so "this month" means the user's calendar month.
 */
export function getPeriodWindow(
  period: Period,
  timezone: string,
  referenceDate: Date = new Date(),
): DateRange {
  const zonedNow = toZonedTime(referenceDate, timezone);

  const [zonedStart, zonedEnd] = (() => {
    switch (period) {
      case 'weekly':
        return [
          startOfWeek(zonedNow, { weekStartsOn: 1 }),
          endOfWeek(zonedNow, { weekStartsOn: 1 }),
        ];
      case 'monthly':
        return [startOfMonth(zonedNow), endOfMonth(zonedNow)];
      case 'yearly':
        return [startOfYear(zonedNow), endOfYear(zonedNow)];
    }
  })();

  return {
    start: fromZonedTime(zonedStart, timezone),
    end: fromZonedTime(zonedEnd, timezone),
  };
}
