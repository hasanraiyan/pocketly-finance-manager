import {
  monthlyCommitment,
  projectRecurring,
  sumProjected,
  type ProjectableRule,
} from './project-recurring';

const UTC = 'UTC';

const base: ProjectableRule = {
  id: 'rent',
  type: 'expense',
  amount: 2_500_000, // ₹25,000
  frequency: 'monthly',
  interval: 1,
  startDate: new Date('2026-01-01T00:00:00Z'),
  timezone: UTC,
};

const window = {
  start: new Date('2026-03-01T00:00:00Z'),
  end: new Date('2026-05-31T23:59:59Z'),
};

describe('projectRecurring', () => {
  it('expands a rule into its dated occurrences inside the window', () => {
    const occurrences = projectRecurring([base], window);

    expect(occurrences.map((o) => o.date.toISOString().slice(0, 10))).toEqual([
      '2026-04-01',
      '2026-05-01',
    ]);
    expect(occurrences[0]).toMatchObject({
      ruleId: 'rent',
      type: 'expense',
      amount: 2_500_000,
    });
  });

  it('returns occurrences from every rule in date order, not rule order', () => {
    const salary: ProjectableRule = {
      ...base,
      id: 'salary',
      type: 'income',
      amount: 8_000_000,
      startDate: new Date('2026-01-25T00:00:00Z'),
    };

    const dates = projectRecurring([base, salary], window).map((o) =>
      o.date.toISOString().slice(0, 10),
    );

    expect(dates).toEqual([
      '2026-03-25',
      '2026-04-01',
      '2026-04-25',
      '2026-05-01',
      '2026-05-25',
    ]);
  });

  it('ignores paused rules', () => {
    expect(projectRecurring([{ ...base, paused: true }], window)).toEqual([]);
  });

  it('ignores rules that ended before the window', () => {
    const ended = { ...base, endDate: new Date('2026-02-01T00:00:00Z') };
    expect(projectRecurring([ended], window)).toEqual([]);
  });

  it('stops at endDate when the rule ends mid-window', () => {
    const ending = { ...base, endDate: new Date('2026-04-15T00:00:00Z') };

    expect(
      projectRecurring([ending], window).map((o) =>
        o.date.toISOString().slice(0, 10),
      ),
    ).toEqual(['2026-04-01']);
  });

  /**
   * A transfer moves money between the user's own accounts. Counting it
   * would make a forecast of total position wrong by exactly the transferred
   * amount, in both directions.
   */
  it('drops transfers, which net to zero across the position', () => {
    const toSavings: ProjectableRule = {
      ...base,
      id: 'to-savings',
      type: 'transfer',
    };
    expect(projectRecurring([toSavings], window)).toEqual([]);
  });

  it('bounds a pathological rule rather than building an unbounded array', () => {
    const daily: ProjectableRule = { ...base, frequency: 'daily' };

    expect(projectRecurring([daily], window, 10)).toHaveLength(10);
  });
});

describe('sumProjected', () => {
  it('splits income from expense and nets them', () => {
    const salary: ProjectableRule = {
      ...base,
      id: 'salary',
      type: 'income',
      amount: 8_000_000,
    };

    const totals = sumProjected(projectRecurring([base, salary], window));

    expect(totals).toEqual({
      income: 16_000_000,
      expense: 5_000_000,
      net: 11_000_000,
    });
  });

  it('is zero for an empty projection', () => {
    expect(sumProjected([])).toEqual({ income: 0, expense: 0, net: 0 });
  });
});

describe('monthlyCommitment', () => {
  const on = new Date('2026-03-01T00:00:00Z');

  it('converts every frequency to a monthly equivalent', () => {
    const rules: ProjectableRule[] = [
      { ...base, id: 'monthly', amount: 1_000_000 },
      { ...base, id: 'weekly', frequency: 'weekly', amount: 100_000 },
      { ...base, id: 'yearly', frequency: 'yearly', amount: 1_200_000 },
    ];

    // 1,000,000 + 100,000 * (52/12) + 1,200,000 / 12
    expect(monthlyCommitment(rules, 'expense', on).total).toBe(1_533_333);
  });

  it('divides by the interval -- fortnightly is half of weekly', () => {
    const fortnightly: ProjectableRule = {
      ...base,
      frequency: 'weekly',
      interval: 2,
      amount: 100_000,
    };

    expect(monthlyCommitment([fortnightly], 'expense', on).total).toBe(216_667);
  });

  it('counts only the requested type', () => {
    const rules: ProjectableRule[] = [
      base,
      { ...base, id: 'salary', type: 'income', amount: 8_000_000 },
    ];

    expect(monthlyCommitment(rules, 'expense', on)).toEqual({
      count: 1,
      total: 2_500_000,
    });
    expect(monthlyCommitment(rules, 'income', on)).toEqual({
      count: 1,
      total: 8_000_000,
    });
  });

  it('excludes paused and expired rules', () => {
    const rules: ProjectableRule[] = [
      { ...base, id: 'paused', paused: true },
      { ...base, id: 'expired', endDate: new Date('2026-02-01T00:00:00Z') },
    ];

    expect(monthlyCommitment(rules, 'expense', on)).toEqual({
      count: 0,
      total: 0,
    });
  });
});
