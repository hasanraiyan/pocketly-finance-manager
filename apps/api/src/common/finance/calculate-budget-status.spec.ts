import { calculateBudgetStatus } from './calculate-budget-status';

describe('calculateBudgetStatus', () => {
  it('matches the SRS worked example', () => {
    expect(calculateBudgetStatus({ amount: 5_000, spent: 4_000 })).toEqual({
      amount: 5_000,
      spent: 4_000,
      remaining: 1_000,
      percentageUsed: 80,
    });
  });

  it('reports a negative remaining amount once exceeded', () => {
    const status = calculateBudgetStatus({ amount: 1_000, spent: 1_500 });
    expect(status.remaining).toBe(-500);
    expect(status.percentageUsed).toBe(150);
  });

  it('does not divide by zero when the budget amount is zero', () => {
    expect(calculateBudgetStatus({ amount: 0, spent: 0 }).percentageUsed).toBe(
      0,
    );
  });
});
