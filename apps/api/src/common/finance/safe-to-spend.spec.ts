import {
  calculateSafeToSpend,
  defaultReserve,
  unspentBudgetTotal,
} from './safe-to-spend';

const base = {
  totalBalance: 5_000_000, // ₹50,000
  upcomingRecurring: 0,
  expectedIncome: 0,
  budgetCommitments: 0,
  goalCommitments: 0,
  minimumReserve: 0,
};

describe('calculateSafeToSpend', () => {
  it('is the whole balance when nothing is committed', () => {
    expect(calculateSafeToSpend(base).amount).toBe(5_000_000);
  });

  it('subtracts every commitment and itemises what it subtracted', () => {
    const result = calculateSafeToSpend({
      ...base,
      upcomingRecurring: 1_500_000,
      budgetCommitments: 800_000,
      goalCommitments: 500_000,
      minimumReserve: 200_000,
    });

    expect(result.amount).toBe(2_000_000);
    expect(result.totalDeductions).toBe(3_000_000);
    expect(result.deductions.map((d) => d.key)).toEqual([
      'upcoming_recurring',
      'budget_commitments',
      'goal_commitments',
      'minimum_reserve',
    ]);
  });

  it('leaves zero-value deductions out of the breakdown', () => {
    const result = calculateSafeToSpend({ ...base, goalCommitments: 500_000 });

    expect(result.deductions).toHaveLength(1);
    expect(result.deductions[0].key).toBe('goal_commitments');
  });

  /**
   * Rent due on the 1st is not a crisis when payday is the 25th. Ignoring
   * expected income would flag every month before payday.
   */
  it('counts income still expected inside the window', () => {
    const result = calculateSafeToSpend({
      ...base,
      totalBalance: 500_000,
      expectedIncome: 4_000_000,
      upcomingRecurring: 2_000_000,
    });

    expect(result.amount).toBe(2_500_000);
  });

  /**
   * A negative "safe to spend" reads as a bug. Zero plus an explicit
   * shortfall reads as the truth.
   */
  it('clamps at zero and reports the shortfall separately', () => {
    const result = calculateSafeToSpend({
      ...base,
      totalBalance: 1_000_000,
      upcomingRecurring: 1_400_000,
    });

    expect(result.amount).toBe(0);
    expect(result.shortfall).toBe(400_000);
  });

  it('has no shortfall when commitments fit', () => {
    expect(calculateSafeToSpend(base).shortfall).toBe(0);
  });

  it('ignores negative inputs rather than turning them into spending money', () => {
    const result = calculateSafeToSpend({
      ...base,
      upcomingRecurring: -1_000_000,
      expectedIncome: -1_000_000,
    });

    expect(result.amount).toBe(5_000_000);
    expect(result.deductions).toHaveLength(0);
  });
});

describe('defaultReserve', () => {
  it('is a fortnight of the user’s own spending', () => {
    expect(defaultReserve(20_000)).toBe(300_000);
  });

  it('is zero for someone with no spending history', () => {
    expect(defaultReserve(0)).toBe(0);
  });
});

describe('unspentBudgetTotal', () => {
  it('counts what is left in each budget, not the limits', () => {
    expect(
      unspentBudgetTotal([
        { limit: 1_000_000, spent: 400_000 },
        { limit: 500_000, spent: 100_000 },
      ]),
    ).toBe(1_000_000);
  });

  /**
   * An overspent budget contributing a negative would *raise* safe-to-spend
   * — rewarding blowing a budget with permission to spend more.
   */
  it('treats an overspent budget as zero, never as a credit', () => {
    expect(
      unspentBudgetTotal([
        { limit: 1_000_000, spent: 1_600_000 },
        { limit: 500_000, spent: 100_000 },
      ]),
    ).toBe(400_000);
  });

  it('is zero with no budgets', () => {
    expect(unspentBudgetTotal([])).toBe(0);
  });
});
