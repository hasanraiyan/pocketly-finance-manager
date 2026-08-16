import { BadRequestException } from '@nestjs/common';
import {
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
} from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { DateRange } from './get-period-window';

export const ANALYSIS_PERIODS = [
  '7d',
  'this_month',
  'last_month',
  '3m',
  '6m',
  'this_year',
  'custom',
] as const;
export type AnalysisPeriod = (typeof ANALYSIS_PERIODS)[number];

export function resolveAnalysisRange(
  period: AnalysisPeriod,
  timezone: string,
  custom?: { from?: Date; to?: Date },
  referenceDate: Date = new Date(),
): DateRange {
  if (period === 'custom') {
    if (!custom?.from || !custom?.to) {
      throw new BadRequestException(
        'from and to are required for a custom period',
      );
    }
    return { start: custom.from, end: custom.to };
  }

  const zonedNow = toZonedTime(referenceDate, timezone);
  let zonedStart: Date;
  let zonedEnd: Date = endOfDay(zonedNow);

  switch (period) {
    case '7d':
      zonedStart = startOfDay(subDays(zonedNow, 6));
      break;
    case 'this_month':
      zonedStart = startOfMonth(zonedNow);
      zonedEnd = endOfMonth(zonedNow);
      break;
    case 'last_month': {
      const lastMonth = subMonths(zonedNow, 1);
      zonedStart = startOfMonth(lastMonth);
      zonedEnd = endOfMonth(lastMonth);
      break;
    }
    case '3m':
      zonedStart = startOfDay(subMonths(zonedNow, 3));
      break;
    case '6m':
      zonedStart = startOfDay(subMonths(zonedNow, 6));
      break;
    case 'this_year':
      zonedStart = startOfYear(zonedNow);
      zonedEnd = endOfYear(zonedNow);
      break;
  }

  return {
    start: fromZonedTime(zonedStart, timezone),
    end: fromZonedTime(zonedEnd, timezone),
  };
}
