import {
  bandFor,
  calculateHealthScore,
  type HealthInputs,
} from './health-score';

const healthy: HealthInputs = {
  months: [
    { income: 10_000_000, expense: 7_000_000 },
    { income: 10_000_000, expense: 7_000_000 },
    { income: 10_000_000, expense: 7_000_000 },
  ],
  totalBalance: 42_000_000, // six months of expenses
  budgets: [{ limit: 1_000_000, spent: 400_000 }],
  goals: [{ status: 'on_track' }],
};

function componentScore(
  result: ReturnType<typeof calculateHealthScore>,
  key: string,
) {
  return result.components.find((c) => c.key === key)?.score;
}

describe('calculateHealthScore', () => {
  it('scores a well-run set of finances near the top', () => {
    const result = calculateHealthScore(healthy);

    expect(result.score).toBe(100);
    expect(result.band).toBe('strong');
    expect(result.unavailable).toHaveLength(0);
  });

  it('scales the savings rate against a 30% ceiling', () => {
    const result = calculateHealthScore({
      ...healthy,
      // 15% saved -- half of the ceiling
      months: [
        { income: 10_000_000, expense: 8_500_000 },
        { income: 10_000_000, expense: 8_500_000 },
      ],
    });

    expect(componentScore(result, 'savings_rate')).toBe(50);
  });

  it('scores overspending at zero and says so in the user’s numbers', () => {
    const result = calculateHealthScore({
      ...healthy,
      months: [
        { income: 10_000_000, expense: 12_000_000 },
        { income: 10_000_000, expense: 12_000_000 },
      ],
    });

    const savings = result.components.find((c) => c.key === 'savings_rate');
    expect(savings?.score).toBe(0);
    expect(savings?.reason).toBe('You spend 20% more than you earn.');
  });

  it('scales the reserve against six months of spending', () => {
    const result = calculateHealthScore({
      ...healthy,
      totalBalance: 21_000_000,
    });

    expect(componentScore(result, 'reserve_level')).toBe(50);
  });

  it('scores cash flow on how many months ended in the black', () => {
    const result = calculateHealthScore({
      ...healthy,
      months: [
        { income: 10_000_000, expense: 7_000_000 },
        { income: 10_000_000, expense: 12_000_000 },
        { income: 10_000_000, expense: 12_000_000 },
        { income: 10_000_000, expense: 7_000_000 },
      ],
    });

    expect(componentScore(result, 'cash_flow_stability')).toBe(50);
  });

  it('scores budget control on how many budgets are still inside their limit', () => {
    const result = calculateHealthScore({
      ...healthy,
      budgets: [
        { limit: 1_000_000, spent: 400_000 },
        { limit: 1_000_000, spent: 1_400_000 },
        { limit: 1_000_000, spent: 1_400_000 },
        { limit: 1_000_000, spent: 100_000 },
      ],
    });

    expect(componentScore(result, 'budget_control')).toBe(50);
  });

  it('scores a stalled goal well below an on-track one', () => {
    const result = calculateHealthScore({
      ...healthy,
      goals: [{ status: 'stalled' }, { status: 'on_track' }],
    });

    expect(componentScore(result, 'goal_progress')).toBe(63);
  });

  /**
   * Someone who has set no goals is not thereby unhealthy. Scoring the
   * component zero would make the number say something it doesn't know.
   */
  it('excludes components with nothing to judge rather than scoring them zero', () => {
    const result = calculateHealthScore({
      ...healthy,
      budgets: [],
      goals: [],
    });

    expect(result.score).toBe(100);
    expect(result.unavailable.map((u) => u.key)).toEqual([
      'budget_control',
      'goal_progress',
    ]);
  });

  it('redistributes weight across whatever is left', () => {
    const result = calculateHealthScore({
      ...healthy,
      budgets: [{ limit: 1_000_000, spent: 2_000_000 }], // scores 0, weight 15
      goals: [],
    });

    // 85 of 100 weight scoring 100, 15 scoring 0, over the 85 that remain...
    // budget_control is present, goal_progress is not: 85/(85) weighted mean
    // of {100 x 70, 0 x 15} = 7000/85
    expect(result.score).toBe(82);
  });

  it('has almost nothing to say for a brand-new user', () => {
    const result = calculateHealthScore({
      months: [],
      totalBalance: 0,
      budgets: [],
      goals: [],
    });

    expect(result.score).toBe(0);
    expect(result.components).toHaveLength(0);
    expect(result.unavailable).toHaveLength(6);
  });

  it('rewards steady spending and penalises swings', () => {
    const steady = calculateHealthScore({
      ...healthy,
      months: [
        { income: 10_000_000, expense: 7_000_000 },
        { income: 10_000_000, expense: 7_000_000 },
      ],
    });
    const swinging = calculateHealthScore({
      ...healthy,
      months: [
        { income: 10_000_000, expense: 2_000_000 },
        { income: 10_000_000, expense: 12_000_000 },
      ],
    });

    expect(componentScore(steady, 'spending_consistency')).toBe(100);
    expect(componentScore(swinging, 'spending_consistency')).toBe(29);
  });
});

describe('bandFor', () => {
  it('names each band at its boundary', () => {
    expect(bandFor(80)).toBe('strong');
    expect(bandFor(79)).toBe('steady');
    expect(bandFor(60)).toBe('steady');
    expect(bandFor(59)).toBe('fragile');
    expect(bandFor(40)).toBe('fragile');
    expect(bandFor(39)).toBe('strained');
  });
});
