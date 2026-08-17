import { addDays, addMonths, addWeeks, addYears, isAfter } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const RECURRENCE_FREQUENCIES = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
] as const;

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

/**
 * The nth occurrence of a rule, as a UTC instant.
 *
 * Always computed as `startDate + (n × interval) periods`, never by stepping
 * forward from the previous occurrence. That distinction is the whole point:
 * `addMonths` clamps Jan 31 to Feb 28, so a rule that walked occurrence to
 * occurrence would land on Feb 28, then Mar 28, and stay on the 28th forever
 * -- someone's rent silently moving three days earlier every year. Anchoring
 * on `startDate` re-derives Mar 31 from January, and only the short months
 * clamp.
 *
 * Arithmetic runs in the user's timezone so "the 1st" is their 1st, not
 * UTC's -- the same reasoning as getPeriodWindow.
 */
export function occurrenceAt(
  startDate: Date,
  frequency: RecurrenceFrequency,
  interval: number,
  n: number,
  timezone: string,
): Date {
  const steps = interval * n;
  const zonedStart = toZonedTime(startDate, timezone);

  const zonedOccurrence = (() => {
    switch (frequency) {
      case 'daily':
        return addDays(zonedStart, steps);
      case 'weekly':
        return addWeeks(zonedStart, steps);
      case 'monthly':
        return addMonths(zonedStart, steps);
      case 'yearly':
        return addYears(zonedStart, steps);
    }
  })();

  return fromZonedTime(zonedOccurrence, timezone);
}

/**
 * The first occurrence strictly after `after`, or `null` once the rule has
 * run past `endDate`.
 *
 * Walks occurrence indexes rather than doing modular arithmetic on dates,
 * because month-length clamping makes the interval between occurrences
 * non-constant -- there is no fixed number to divide by.
 */
export function nextOccurrenceAfter(
  params: {
    startDate: Date;
    frequency: RecurrenceFrequency;
    interval: number;
    timezone: string;
    endDate?: Date | null;
  },
  after: Date,
): Date | null {
  const { startDate, frequency, interval, timezone, endDate } = params;

  // A rule that hasn't started yet is due at its start.
  if (isAfter(startDate, after)) {
    return endDate && isAfter(startDate, endDate) ? null : startDate;
  }

  // Bounded so a corrupt rule (interval 0 slipped past validation, a
  // startDate far in the past) can't spin forever inside a worker.
  const MAX_STEPS = 10_000;

  for (let n = 1; n <= MAX_STEPS; n += 1) {
    const occurrence = occurrenceAt(
      startDate,
      frequency,
      interval,
      n,
      timezone,
    );
    if (isAfter(occurrence, after)) {
      if (endDate && isAfter(occurrence, endDate)) return null;
      return occurrence;
    }
  }

  return null;
}

/**
 * Every occurrence in `(after, until]`, oldest first.
 *
 * Used by the catch-up path: if the worker was down for three days, the
 * missed occurrences are still created, each carrying its own original date
 * rather than all landing on today -- a ledger that says rent was paid on the
 * 5th when it was due on the 1st is wrong in a way users notice.
 *
 * `limit` bounds a pathological restart (a rule dormant for years) so one
 * run can't post thousands of records.
 */
export function occurrencesBetween(
  params: {
    startDate: Date;
    frequency: RecurrenceFrequency;
    interval: number;
    timezone: string;
    endDate?: Date | null;
  },
  after: Date,
  until: Date,
  limit = 30,
): Date[] {
  const occurrences: Date[] = [];
  let cursor = after;

  while (occurrences.length < limit) {
    const next = nextOccurrenceAfter(params, cursor);
    if (!next || isAfter(next, until)) break;
    occurrences.push(next);
    cursor = next;
  }

  return occurrences;
}
