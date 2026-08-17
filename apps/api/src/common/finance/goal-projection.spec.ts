import { monthlyGoalCommitment, projectGoal } from './goal-projection';

const now = new Date('2026-03-15T00:00:00Z');

describe('projectGoal', () => {
  it('reports progress and a completion date from the planned rate', () => {
    const projection = projectGoal({
      targetAmount: 10_000_000, // ₹100,000
      savedAmount: 2_500_000,
      monthlyContribution: 1_500_000,
      now,
    });

    expect(projection.remaining).toBe(7_500_000);
    expect(projection.percentComplete).toBe(25);
    expect(projection.monthsRemaining).toBe(5);
    expect(projection.projectedCompletion?.toISOString().slice(0, 10)).toBe(
      '2026-08-15',
    );
    expect(projection.status).toBe('on_track');
  });

  it('rounds a part month up -- you do not arrive early', () => {
    const projection = projectGoal({
      targetAmount: 1_000_000,
      savedAmount: 0,
      monthlyContribution: 300_000,
      now,
    });

    expect(projection.monthsRemaining).toBe(4);
  });

  it('is complete once saved reaches target, without over-reporting progress', () => {
    const projection = projectGoal({
      targetAmount: 1_000_000,
      savedAmount: 1_400_000,
      monthlyContribution: 100_000,
      now,
    });

    expect(projection).toMatchObject({
      remaining: 0,
      percentComplete: 100,
      status: 'complete',
      onTrack: true,
    });
  });

  /**
   * A goal nobody is funding has no completion date. Inventing one from past
   * behaviour would put a date on the card that the user never agreed to.
   */
  it('is stalled with no completion date when nothing is being contributed', () => {
    const projection = projectGoal({
      targetAmount: 1_000_000,
      savedAmount: 100_000,
      monthlyContribution: 0,
      now,
    });

    expect(projection.status).toBe('stalled');
    expect(projection.projectedCompletion).toBeNull();
    expect(projection.monthsRemaining).toBeNull();
    expect(projection.onTrack).toBe(false);
  });

  it('derives the rate a deadline demands', () => {
    const projection = projectGoal({
      targetAmount: 6_000_000,
      savedAmount: 0,
      monthlyContribution: 2_000_000,
      targetDate: new Date('2026-09-15T00:00:00Z'), // 6 months out
      now,
    });

    expect(projection.requiredMonthly).toBe(1_000_000);
    expect(projection.monthlyShortfall).toBe(0);
    expect(projection.status).toBe('on_track');
  });

  it('is at risk when the planned rate misses the deadline, and says by how much', () => {
    const projection = projectGoal({
      targetAmount: 6_000_000,
      savedAmount: 0,
      monthlyContribution: 500_000,
      targetDate: new Date('2026-06-15T00:00:00Z'), // 3 months out
      now,
    });

    expect(projection.requiredMonthly).toBe(2_000_000);
    expect(projection.monthlyShortfall).toBe(1_500_000);
    expect(projection.status).toBe('at_risk');
  });

  it('treats a deadline already past as demanding the whole remainder now', () => {
    const projection = projectGoal({
      targetAmount: 1_000_000,
      savedAmount: 200_000,
      monthlyContribution: 100_000,
      targetDate: new Date('2026-01-15T00:00:00Z'),
      now,
    });

    expect(projection.requiredMonthly).toBe(800_000);
    expect(projection.status).toBe('at_risk');
  });

  it('has no required rate and no shortfall without a deadline', () => {
    const projection = projectGoal({
      targetAmount: 1_000_000,
      savedAmount: 0,
      monthlyContribution: 50_000,
      now,
    });

    expect(projection.requiredMonthly).toBeNull();
    expect(projection.monthlyShortfall).toBe(0);
    expect(projection.status).toBe('on_track');
  });
});

describe('monthlyGoalCommitment', () => {
  it('adds up what the live goals ask of this month', () => {
    expect(
      monthlyGoalCommitment([
        {
          targetAmount: 1_000_000,
          savedAmount: 0,
          monthlyContribution: 200_000,
        },
        {
          targetAmount: 5_000_000,
          savedAmount: 100_000,
          monthlyContribution: 300_000,
        },
      ]),
    ).toBe(500_000);
  });

  it('stops counting a goal that has already been reached', () => {
    expect(
      monthlyGoalCommitment([
        {
          targetAmount: 1_000_000,
          savedAmount: 1_000_000,
          monthlyContribution: 200_000,
        },
      ]),
    ).toBe(0);
  });

  it('is zero with no goals', () => {
    expect(monthlyGoalCommitment([])).toBe(0);
  });
});
