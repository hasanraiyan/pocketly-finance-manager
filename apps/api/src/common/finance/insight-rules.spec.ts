import {
  budgetPaceInsight,
  categorySpikeInsight,
  forecastShortfallInsight,
  goalDelayInsight,
  largestExpenseInsight,
  netNegativeInsight,
  positiveTrendInsight,
  rankInsights,
  recurringGrowthInsight,
  recurringLoadInsight,
  savingsOpportunityInsight,
  type Insight,
} from './insight-rules';

/** Simple stand-in so the rules stay independent of Intl formatting. */
const format = (minor: number) => `₹${(minor / 100).toFixed(2)}`;

describe('categorySpikeInsight', () => {
  const base = {
    categoryId: 'c1',
    name: 'Food',
    total: 840_000, // ₹8,400
    averageTotal: 625_000, // ₹6,250
    monthsOfHistory: 3,
  };

  it('fires when a category is well above its own average', () => {
    const insight = categorySpikeInsight(base, format);

    expect(insight?.kind).toBe('category_spike');
    expect(insight?.title).toBe('Food is up 34%');
    // States the number and what it is compared against -- "your food
    // spending is high" would not be actionable.
    expect(insight?.detail).toBe(
      '₹8400.00 so far, against an average of ₹6250.00.',
    );
  });

  it('stays silent below the spike ratio', () => {
    expect(
      categorySpikeInsight({ ...base, total: 700_000 }, format),
    ).toBeNull();
  });

  /** A ratio without a floor is why this kind of feature gets ignored. */
  it('stays silent on small amounts however dramatic the ratio', () => {
    const tiny = categorySpikeInsight(
      { ...base, total: 5_000, averageTotal: 3_000 },
      format,
    );
    expect(tiny).toBeNull();
  });

  it('stays silent without enough history to have an average', () => {
    expect(
      categorySpikeInsight({ ...base, monthsOfHistory: 1 }, format),
    ).toBeNull();
  });

  it('stays silent when there is no prior spend to compare against', () => {
    expect(
      categorySpikeInsight({ ...base, averageTotal: 0 }, format),
    ).toBeNull();
  });
});

describe('budgetPaceInsight', () => {
  const base = {
    categoryName: 'Food',
    limit: 600_000, // ₹6,000
    spent: 400_000, // ₹4,000 in 10 days -> ₹12,000 projected
    daysElapsed: 10,
    daysInPeriod: 30,
  };

  it('projects the period and says when the budget runs out', () => {
    const insight = budgetPaceInsight(base, format);

    expect(insight?.kind).toBe('budget_pace');
    expect(insight?.title).toBe('Food budget runs out in 5 days');
    expect(insight?.detail).toContain('₹4000.00 of ₹6000.00 used');
    expect(insight?.detail).toContain('₹12000.00');
  });

  it('says so plainly when the budget is already gone', () => {
    const insight = budgetPaceInsight({ ...base, spent: 650_000 }, format);
    expect(insight?.title).toBe('Food budget is already spent');
  });

  /** One big shop on the 2nd projects to an absurd month. */
  it('stays quiet in the first days of a period', () => {
    expect(budgetPaceInsight({ ...base, daysElapsed: 3 }, format)).toBeNull();
  });

  it('stays quiet when the projection is within the limit', () => {
    expect(budgetPaceInsight({ ...base, spent: 150_000 }, format)).toBeNull();
  });

  it('stays quiet at the end of the period, when there is nothing to warn about', () => {
    expect(budgetPaceInsight({ ...base, daysElapsed: 30 }, format)).toBeNull();
  });

  it('outranks the other rules -- it is about money not yet spent', () => {
    const pace = budgetPaceInsight(base, format);
    const spike = categorySpikeInsight(
      {
        categoryId: 'c1',
        name: 'Food',
        total: 840_000,
        averageTotal: 625_000,
        monthsOfHistory: 3,
      },
      format,
    );
    expect(pace!.weight).toBeGreaterThan(spike!.weight);
  });
});

describe('netNegativeInsight', () => {
  it('reports the shortfall with both sides', () => {
    const insight = netNegativeInsight(
      { income: 5_000_000, expense: 5_600_000 },
      format,
    );
    expect(insight?.title).toBe('You spent ₹6000.00 more than you earned');
    expect(insight?.detail).toBe('₹56000.00 out against ₹50000.00 in.');
  });

  it('stays silent when the period is positive', () => {
    expect(
      netNegativeInsight({ income: 5_000_000, expense: 100_000 }, format),
    ).toBeNull();
  });

  /**
   * Without income recorded this says more about missing data than about
   * spending, and would fire for every user who only tracks expenses.
   */
  it('stays silent when no income was recorded at all', () => {
    expect(
      netNegativeInsight({ income: 0, expense: 5_600_000 }, format),
    ).toBeNull();
  });

  it('stays silent on a trivial shortfall', () => {
    expect(
      netNegativeInsight({ income: 100_000, expense: 110_000 }, format),
    ).toBeNull();
  });
});

describe('recurringLoadInsight', () => {
  it('adds up what the repeats commit to', () => {
    const insight = recurringLoadInsight(4_200_00, 5, format);
    expect(insight?.title).toBe('₹4200.00 a month is already committed');
    expect(insight?.detail).toBe(
      'Across 5 repeats before anything else you spend.',
    );
  });

  it('uses the singular for one rule', () => {
    expect(recurringLoadInsight(4_200_00, 1, format)?.detail).toContain(
      '1 repeat before',
    );
  });

  it('stays silent with no rules', () => {
    expect(recurringLoadInsight(0, 0, format)).toBeNull();
  });
});

describe('largestExpenseInsight', () => {
  it('reports the biggest expense and its share', () => {
    const insight = largestExpenseInsight(
      { description: 'Flight to Delhi', amount: 1_200_00 },
      3_000_00,
      format,
    );
    expect(insight?.title).toBe('Flight to Delhi was your biggest expense');
    expect(insight?.detail).toBe('₹1200.00 — 40% of everything you spent.');
  });

  it('stays silent when nothing dominates the period', () => {
    // Above the material floor, so this exercises the share gate rather
    // than the amount one: ₹600 of ₹10,000 is 6%.
    expect(
      largestExpenseInsight(
        { description: 'Groceries', amount: 60_000 },
        1_000_000,
        format,
      ),
    ).toBeNull();
  });

  it('fires exactly at the 20% share boundary', () => {
    expect(
      largestExpenseInsight(
        { description: 'Groceries', amount: 60_000 },
        300_000,
        format,
      ),
    ).not.toBeNull();
  });

  it('stays silent with no expenses at all', () => {
    expect(largestExpenseInsight(null, 0, format)).toBeNull();
  });
});

describe('forecastShortfallInsight', () => {
  it('stays silent when the balance never goes negative', () => {
    expect(
      forecastShortfallInsight(
        {
          shortfallDate: null,
          lowestBalance: 500_000,
          projectedBalance: 900_000,
        },
        format,
      ),
    ).toBeNull();
  });

  it('names the day and says what to do about it', () => {
    const insight = forecastShortfallInsight(
      {
        shortfallDate: '2026-04-22',
        lowestBalance: -300_000,
        projectedBalance: -100_000,
      },
      format,
    );

    expect(insight?.title).toBe("You're on track to run out around 2026-04-22");
    expect(insight?.detail).toBe('At this rate the period ends at ₹-1000.00.');
    expect(insight?.action).toContain('Cut back now');
  });

  /**
   * A dip that recovers is a timing problem, not a spending problem, and the
   * advice for the two is different.
   */
  it('distinguishes a dip that recovers from one that does not', () => {
    const insight = forecastShortfallInsight(
      {
        shortfallDate: '2026-04-22',
        lowestBalance: -300_000,
        projectedBalance: 4_000_000,
      },
      format,
    );

    expect(insight?.detail).toContain('Money lands later in the period');
    expect(insight?.action).toContain('Move a bill later');
  });

  it('outranks every other rule', () => {
    const shortfall = forecastShortfallInsight(
      { shortfallDate: '2026-04-22', lowestBalance: -1, projectedBalance: -1 },
      format,
    );
    const pace = budgetPaceInsight(
      {
        categoryName: 'Food',
        limit: 600_000,
        spent: 400_000,
        daysElapsed: 10,
        daysInPeriod: 30,
      },
      format,
    );

    expect(shortfall!.weight).toBeGreaterThan(pace!.weight);
  });
});

describe('goalDelayInsight', () => {
  it('outranks a merely at-risk goal when the deadline has already passed', () => {
    const insight = goalDelayInsight(
      {
        name: 'College fees',
        status: 'overdue',
        monthlyShortfall: 300_000,
        requiredMonthly: 500_000,
      },
      format,
    );

    expect(insight?.title).toBe("College fees's date has already passed");
    expect(insight?.detail).toBe('₹5000.00 would close it out today.');

    const atRisk = goalDelayInsight(
      {
        name: 'Trip',
        status: 'at_risk',
        monthlyShortfall: 300_000,
        requiredMonthly: 500_000,
      },
      format,
    );
    expect(insight!.weight).toBeGreaterThan(atRisk!.weight);
  });

  it('says what the deadline actually needs', () => {
    const insight = goalDelayInsight(
      {
        name: 'College fees',
        status: 'at_risk',
        monthlyShortfall: 300_000,
        requiredMonthly: 500_000,
      },
      format,
    );

    expect(insight?.title).toBe("College fees won't make its date");
    expect(insight?.detail).toBe(
      "You'd need ₹5000.00 a month — that's ₹3000.00 more than you're putting in.",
    );
  });

  it('flags a goal nothing is going into', () => {
    const insight = goalDelayInsight(
      {
        name: 'Emergency fund',
        status: 'stalled',
        monthlyShortfall: 0,
        requiredMonthly: null,
      },
      format,
    );

    expect(insight?.title).toBe("Emergency fund isn't moving");
    expect(insight?.action).toBe('Set a monthly amount to give it one.');
  });

  it('says nothing about a goal that is on track', () => {
    expect(
      goalDelayInsight(
        {
          name: 'Trip',
          status: 'on_track',
          monthlyShortfall: 0,
          requiredMonthly: 100_000,
        },
        format,
      ),
    ).toBeNull();
  });

  it('ignores a shortfall too small to be worth saying', () => {
    expect(
      goalDelayInsight(
        {
          name: 'Trip',
          status: 'at_risk',
          monthlyShortfall: 1_000,
          requiredMonthly: 100_000,
        },
        format,
      ),
    ).toBeNull();
  });
});

describe('recurringGrowthInsight', () => {
  it('reports fixed costs climbing against their own recent level', () => {
    const insight = recurringGrowthInsight(1_500_000, 1_000_000, format);

    expect(insight?.title).toBe('Your fixed costs are up ₹5000.00 a month');
    expect(insight?.action).toContain('subscription');
  });

  it('stays silent for a rise that is only arithmetically true', () => {
    expect(recurringGrowthInsight(1_040_000, 1_000_000, format)).toBeNull();
  });

  it('stays silent without a prior level to compare against', () => {
    expect(recurringGrowthInsight(1_500_000, 0, format)).toBeNull();
  });
});

describe('savingsOpportunityInsight', () => {
  it('points out a surplus nothing has a claim on', () => {
    const insight = savingsOpportunityInsight(
      { income: 5_000_000, expense: 3_000_000 },
      0,
      format,
    );

    expect(insight?.title).toBe('₹20000.00 is sitting spare');
    expect(insight?.action).toBe('Set a goal so it goes somewhere on purpose.');
  });

  /**
   * Telling someone who already has a plan that they should have a plan is
   * how insight panels get ignored.
   */
  it('says nothing to someone already saving towards a goal', () => {
    expect(
      savingsOpportunityInsight(
        { income: 5_000_000, expense: 3_000_000 },
        500_000,
        format,
      ),
    ).toBeNull();
  });

  it('says nothing when there is no surplus', () => {
    expect(
      savingsOpportunityInsight(
        { income: 3_000_000, expense: 3_000_000 },
        0,
        format,
      ),
    ).toBeNull();
  });
});

describe('positiveTrendInsight', () => {
  it('says something good when spending is genuinely down', () => {
    const insight = positiveTrendInsight(2_000_000, 3_000_000, format);

    expect(insight?.title).toBe('Spending is down 33%');
    expect(insight?.detail).toBe(
      '₹20000.00 so far, against ₹30000.00 expected by now.',
    );
  });

  it('ignores a drop too small to mean anything', () => {
    expect(positiveTrendInsight(2_950_000, 3_000_000, format)).toBeNull();
  });

  it('stays silent when spending is up', () => {
    expect(positiveTrendInsight(3_500_000, 3_000_000, format)).toBeNull();
  });

  it('carries no action -- there is nothing to fix', () => {
    expect(
      positiveTrendInsight(2_000_000, 3_000_000, format)?.action,
    ).toBeUndefined();
  });
});

describe('rankInsights', () => {
  const insight = (weight: number): Insight => ({
    kind: 'category_spike',
    weight,
    title: `w${weight}`,
    detail: '',
  });

  it('drops nulls, sorts by weight and caps the list', () => {
    const ranked = rankInsights([
      insight(10),
      null,
      insight(300),
      insight(50),
      null,
      insight(200),
    ]);

    expect(ranked.map((i) => i.title)).toEqual(['w300', 'w200', 'w50']);
  });

  it('returns nothing when every rule stayed silent', () => {
    expect(rankInsights([null, null])).toEqual([]);
  });
});
