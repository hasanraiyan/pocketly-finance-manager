import { forecastBalance, resolveForecastWindow } from './forecast-balance';
import type { ProjectedOccurrence } from './project-recurring';

const UTC = 'UTC';

/** A five-day window: 10th through 14th inclusive. */
const window = {
  start: new Date('2026-04-10T00:00:00Z'),
  end: new Date('2026-04-14T23:59:59Z'),
};

function occurrence(
  date: string,
  type: 'income' | 'expense',
  amount: number,
): ProjectedOccurrence {
  return { ruleId: 'r', date: new Date(date), type, amount };
}

describe('resolveForecastWindow', () => {
  const now = new Date('2026-04-10T08:30:00Z');

  it('starts at now, not at the start of the period', () => {
    expect(resolveForecastWindow('month', UTC, now).start).toEqual(now);
  });

  it('runs to the end of the user’s month', () => {
    expect(
      resolveForecastWindow('month', UTC, now).end.toISOString().slice(0, 19),
    ).toBe('2026-04-30T23:59:59');
  });

  it('counts fixed horizons forward from now', () => {
    expect(
      resolveForecastWindow('30d', UTC, now).end.toISOString().slice(0, 10),
    ).toBe('2026-05-10');
    expect(
      resolveForecastWindow('90d', UTC, now).end.toISOString().slice(0, 10),
    ).toBe('2026-07-09');
  });

  /**
   * 2026-04-30 23:59 in Kolkata is 18:29Z, so a month window resolved in UTC
   * would run 5.5 hours long and pull in occurrences from May.
   */
  it('resolves the month end in the user’s timezone', () => {
    expect(
      resolveForecastWindow('month', 'Asia/Kolkata', now)
        .end.toISOString()
        .slice(0, 19),
    ).toBe('2026-04-30T18:29:59');
  });
});

describe('forecastBalance', () => {
  it('walks the window one day at a time', () => {
    const forecast = forecastBalance({
      openingBalance: 1_000_000,
      window,
      occurrences: [],
      discretionaryDailyRate: 0,
      timezone: UTC,
    });

    expect(forecast.days.map((d) => d.date)).toEqual([
      '2026-04-10',
      '2026-04-11',
      '2026-04-12',
      '2026-04-13',
      '2026-04-14',
    ]);
    expect(forecast.projectedBalance).toBe(1_000_000);
  });

  it('lands recurring money on its own day rather than smearing it', () => {
    const forecast = forecastBalance({
      openingBalance: 1_000_000,
      window,
      occurrences: [
        occurrence('2026-04-11T00:00:00Z', 'expense', 800_000),
        occurrence('2026-04-13T00:00:00Z', 'income', 500_000),
      ],
      discretionaryDailyRate: 0,
      timezone: UTC,
    });

    expect(forecast.days.map((d) => d.balance)).toEqual([
      1_000_000, // 10th
      200_000, // 11th, rent out
      200_000, // 12th
      700_000, // 13th, salary in
      700_000, // 14th
    ]);
    expect(forecast.projectedIncome).toBe(500_000);
    expect(forecast.projectedExpense).toBe(800_000);
  });

  /**
   * The reason dated occurrences matter: this balance ends the window healthy
   * but spends two days underwater, which a month-end figure alone hides.
   */
  it('reports the low point and the day the balance first goes negative', () => {
    const forecast = forecastBalance({
      openingBalance: 100_000,
      window,
      occurrences: [
        occurrence('2026-04-11T00:00:00Z', 'expense', 500_000),
        occurrence('2026-04-13T00:00:00Z', 'income', 900_000),
      ],
      discretionaryDailyRate: 0,
      timezone: UTC,
    });

    expect(forecast.shortfallDate).toBe('2026-04-11');
    expect(forecast.lowestBalance).toBe(-400_000);
    expect(forecast.projectedBalance).toBe(500_000);
  });

  it('has no shortfall date when the balance never goes negative', () => {
    const forecast = forecastBalance({
      openingBalance: 1_000_000,
      window,
      occurrences: [],
      discretionaryDailyRate: 10_000,
      timezone: UTC,
    });

    expect(forecast.shortfallDate).toBeNull();
  });

  /**
   * Today's spending is already inside the opening balance. Charging a full
   * day's run-rate on top of it would count the morning twice.
   */
  it('skips the run-rate on the first day, then applies it every day after', () => {
    const forecast = forecastBalance({
      openingBalance: 1_000_000,
      window,
      occurrences: [],
      discretionaryDailyRate: 50_000,
      timezone: UTC,
    });

    expect(forecast.projectedDiscretionary).toBe(200_000); // 4 days, not 5
    expect(forecast.projectedBalance).toBe(800_000);
  });

  it('ignores a negative run-rate rather than forecasting income from it', () => {
    const forecast = forecastBalance({
      openingBalance: 1_000_000,
      window,
      occurrences: [],
      discretionaryDailyRate: -50_000,
      timezone: UTC,
    });

    expect(forecast.projectedDiscretionary).toBe(0);
    expect(forecast.projectedBalance).toBe(1_000_000);
  });

  /**
   * 2026-04-10T19:00Z is already the 11th in Kolkata, so the occurrence
   * belongs to the user's 11th -- not UTC's 10th.
   */
  it('buckets occurrences by the user’s calendar day, not UTC’s', () => {
    const forecast = forecastBalance({
      openingBalance: 1_000_000,
      window,
      occurrences: [occurrence('2026-04-10T19:00:00Z', 'expense', 100_000)],
      discretionaryDailyRate: 0,
      timezone: 'Asia/Kolkata',
    });

    const eleventh = forecast.days.find((d) => d.date === '2026-04-11');
    expect(eleventh?.expense).toBe(100_000);
  });

  it('handles a single-day window', () => {
    const forecast = forecastBalance({
      openingBalance: 500_000,
      window: {
        start: new Date('2026-04-10T08:00:00Z'),
        end: new Date('2026-04-10T23:59:59Z'),
      },
      occurrences: [],
      discretionaryDailyRate: 50_000,
      timezone: UTC,
    });

    expect(forecast.days).toHaveLength(1);
    expect(forecast.projectedBalance).toBe(500_000);
  });
});
