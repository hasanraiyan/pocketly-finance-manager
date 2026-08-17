import { simulateScenario, type SimulationInputs } from './simulate-scenario';

const format = (minor: number) => `₹${(minor / 100).toFixed(0)}`;

const now = new Date('2026-04-01T00:00:00Z');

const inputs: SimulationInputs = {
  openingBalance: 10_000_000, // ₹100,000
  window: {
    start: now,
    end: new Date('2026-04-30T23:59:59Z'),
  },
  occurrences: [],
  discretionaryDailyRate: 0,
  timezone: 'UTC',
  budgets: [],
  goals: [],
  minimumReserve: 0,
  now,
};

describe('simulateScenario', () => {
  it('subtracts a one-off purchase from the projected balance', () => {
    const result = simulateScenario(
      inputs,
      { kind: 'one_off', amount: 5_900_000, type: 'expense' },
      format,
    );

    expect(result.baseline.projectedBalance).toBe(10_000_000);
    expect(result.projected.projectedBalance).toBe(4_100_000);
    expect(result.delta.projectedBalance).toBe(-5_900_000);
    expect(result.affordable).toBe(true);
  });

  it('calls a purchase unaffordable when it exceeds what is spare', () => {
    const result = simulateScenario(
      { ...inputs, minimumReserve: 8_000_000 },
      { kind: 'one_off', amount: 5_900_000, type: 'expense' },
      format,
    );

    expect(result.affordable).toBe(false);
    expect(result.verdict).toContain('more than you have spare');
  });

  it('names the day a purchase puts the balance in the red', () => {
    const result = simulateScenario(
      { ...inputs, openingBalance: 1_000_000 },
      {
        kind: 'one_off',
        amount: 5_900_000,
        type: 'expense',
        date: new Date('2026-04-12T00:00:00Z'),
      },
      format,
    );

    expect(result.projected.shortfallDate).toBe('2026-04-12');
    expect(result.affordable).toBe(false);
    expect(result.verdict).toBe('This puts you in the red on 2026-04-12.');
  });

  /**
   * A purchase bigger than the spare cash has to come from somewhere. Taking
   * it off goal progress is what makes the delay visible instead of implied.
   */
  it('draws the excess off goal progress and reports the delay', () => {
    const result = simulateScenario(
      {
        ...inputs,
        openingBalance: 6_000_000,
        goals: [
          {
            id: 'g1',
            name: 'Emergency fund',
            targetAmount: 10_000_000,
            savedAmount: 4_000_000,
            monthlyContribution: 1_000_000,
          },
        ],
        minimumReserve: 2_000_000,
      },
      { kind: 'one_off', amount: 5_000_000, type: 'expense' },
      format,
    );

    // Spare is 6,000,000 - 1,000,000 goal - 2,000,000 reserve = 3,000,000.
    // The 2,000,000 excess comes off the goal, pushing it from 6 months to 8.
    expect(result.baseline.goals[0].monthsRemaining).toBe(6);
    expect(result.projected.goals[0].monthsRemaining).toBe(8);
    expect(result.goalsDelayed).toEqual([
      { id: 'g1', name: 'Emergency fund', monthsLater: 2 },
    ]);
  });

  it('splits the excess across goals in proportion to what each holds', () => {
    const result = simulateScenario(
      {
        ...inputs,
        openingBalance: 3_000_000,
        goals: [
          {
            id: 'big',
            name: 'Big',
            targetAmount: 10_000_000,
            savedAmount: 3_000_000,
            monthlyContribution: 100_000,
          },
          {
            id: 'small',
            name: 'Small',
            targetAmount: 10_000_000,
            savedAmount: 1_000_000,
            monthlyContribution: 100_000,
          },
        ],
      },
      { kind: 'one_off', amount: 3_000_000, type: 'expense' },
      format,
    );

    // Spare is 3,000,000 - 200,000 of goal contributions = 2,800,000, so
    // 200,000 excess splits 3:1.
    expect(result.projected.goals).toHaveLength(2);
    expect(result.goalsDelayed.map((g) => g.id)).toEqual(['big', 'small']);
  });

  it('projects a new recurring cost across the whole window', () => {
    const result = simulateScenario(
      inputs,
      {
        kind: 'recurring',
        amount: 500_000,
        type: 'expense',
        frequency: 'weekly',
      },
      format,
    );

    expect(result.delta.monthlyCommitment).toBe(-2_166_667);
    expect(result.projected.projectedBalance).toBeLessThan(
      result.baseline.projectedBalance,
    );
  });

  it('treats a recurring income as a gain, not a cost', () => {
    const result = simulateScenario(
      inputs,
      {
        kind: 'recurring',
        amount: 500_000,
        type: 'income',
        frequency: 'monthly',
      },
      format,
    );

    expect(result.delta.monthlyCommitment).toBe(500_000);
    expect(result.projected.projectedBalance).toBeGreaterThan(
      result.baseline.projectedBalance,
    );
  });

  /**
   * "What if I save ₹5,000 a month" means starting this month. A rule whose
   * first occurrence fell after the window would show no effect at all.
   */
  it('starts a recurring scenario immediately, not at the next period', () => {
    const result = simulateScenario(
      inputs,
      {
        kind: 'recurring',
        amount: 500_000,
        type: 'income',
        frequency: 'monthly',
      },
      format,
    );

    expect(result.delta.projectedBalance).toBe(500_000);
  });

  it('scales the run-rate for a percentage change in spending', () => {
    const result = simulateScenario(
      { ...inputs, discretionaryDailyRate: 100_000 },
      { kind: 'spending_change', percentChange: 10 },
      format,
    );

    // 29 days of run-rate after the first, at 10,000 more per day.
    expect(result.delta.projectedBalance).toBe(-290_000);
  });

  it('models a cut in spending as money kept', () => {
    const result = simulateScenario(
      { ...inputs, discretionaryDailyRate: 100_000 },
      { kind: 'spending_change', percentChange: -50 },
      format,
    );

    expect(result.delta.projectedBalance).toBe(1_450_000);
  });

  it('gives a plain-language yes when nothing is disturbed', () => {
    const result = simulateScenario(
      inputs,
      { kind: 'one_off', amount: 100_000, type: 'expense' },
      format,
    );

    expect(result.verdict).toBe(
      "Yes — you'd still have ₹99000 spare and ₹99000 at the end of the period.",
    );
  });
});
