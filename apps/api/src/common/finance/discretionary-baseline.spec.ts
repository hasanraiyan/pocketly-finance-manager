import {
  calculateDiscretionaryBaseline,
  MIN_SPENDING_DAYS,
} from './discretionary-baseline';

const now = new Date('2026-08-17T12:00:00.000Z');

describe('calculateDiscretionaryBaseline', () => {
  it('does not estimate a reserve from a brand-new account', () => {
    const result = calculateDiscretionaryBaseline({
      totalSpend: 20,
      firstSpendDate: now,
      spendingDays: 1,
      now,
    });

    expect(result.dailyRate).toBe(0);
    expect(result.lookbackDays).toBe(0);
    expect(result.established).toBe(false);
  });

  it('waits for enough distinct spending days before establishing a baseline', () => {
    const result = calculateDiscretionaryBaseline({
      totalSpend: 500,
      firstSpendDate: new Date('2026-08-01T12:00:00.000Z'),
      spendingDays: MIN_SPENDING_DAYS - 1,
      now,
    });

    expect(result.established).toBe(false);
    expect(result.dailyRate).toBe(0);
  });

  it('uses the actual available calendar history once established', () => {
    const result = calculateDiscretionaryBaseline({
      totalSpend: 20,
      firstSpendDate: new Date('2026-08-04T12:00:00.000Z'),
      spendingDays: MIN_SPENDING_DAYS,
      now,
    });

    expect(result.established).toBe(true);
    expect(result.lookbackDays).toBe(14);
    expect(result.dailyRate).toBeCloseTo(20 / 14);
  });

  it('caps the denominator at the established 90-day window', () => {
    const result = calculateDiscretionaryBaseline({
      totalSpend: 9_000,
      firstSpendDate: new Date('2026-01-01T12:00:00.000Z'),
      spendingDays: MIN_SPENDING_DAYS,
      now,
    });

    expect(result.established).toBe(true);
    expect(result.lookbackDays).toBe(90);
    expect(result.dailyRate).toBe(100);
  });

  it('does not estimate when there is no spend', () => {
    const result = calculateDiscretionaryBaseline({
      totalSpend: 0,
      firstSpendDate: null,
      spendingDays: 0,
      now,
    });

    expect(result).toEqual({
      dailyRate: 0,
      lookbackDays: 0,
      established: false,
      spendingDays: 0,
    });
  });
});
