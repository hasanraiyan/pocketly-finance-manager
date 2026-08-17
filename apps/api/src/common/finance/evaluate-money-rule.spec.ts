import { evaluateMoneyRule, type EvaluableRule } from './evaluate-money-rule';

const format = (minor: number) => `₹${(minor / 100).toFixed(0)}`;
const now = new Date('2026-04-15T09:00:00Z');

const armed = (rule: Partial<EvaluableRule>): EvaluableRule => ({
  kind: 'category_over',
  armed: true,
  ...rule,
});

describe('category_over', () => {
  const rule = armed({ threshold: 500_000, subject: 'Food' });

  it('fires once the category passes its threshold', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { categorySpend: 620_000 },
      format,
      now,
    );

    expect(outcome.fire).toBe(true);
    expect(outcome.notification?.title).toBe('Food passed ₹5000');
    expect(outcome.notification?.body).toBe(
      "You've spent ₹6200 on Food this period.",
    );
  });

  it('stays quiet below the threshold', () => {
    expect(
      evaluateMoneyRule(rule, { categorySpend: 100_000 }, format, now).fire,
    ).toBe(false);
  });

  /**
   * The whole reason `armed` exists: a category parked above its threshold
   * would otherwise alert on every single evaluation run.
   */
  it('does not fire again while it stays over', () => {
    const outcome = evaluateMoneyRule(
      { ...rule, armed: false },
      { categorySpend: 900_000 },
      format,
      now,
    );

    expect(outcome.fire).toBe(false);
    expect(outcome.armed).toBe(false);
  });

  it('re-arms once spending falls back under', () => {
    const outcome = evaluateMoneyRule(
      { ...rule, armed: false },
      { categorySpend: 100_000 },
      format,
      now,
    );

    expect(outcome.fire).toBe(false);
    expect(outcome.armed).toBe(true);
  });

  it('ignores a rule with no threshold rather than firing on everything', () => {
    expect(
      evaluateMoneyRule(
        armed({ threshold: 0, subject: 'Food' }),
        { categorySpend: 900_000 },
        format,
        now,
      ).fire,
    ).toBe(false);
  });
});

describe('balance_under', () => {
  const rule = armed({ kind: 'balance_under', threshold: 1_000_000 });

  it('fires when the balance drops below the floor', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { totalBalance: 400_000 },
      format,
      now,
    );

    expect(outcome.fire).toBe(true);
    expect(outcome.notification?.title).toBe('Balance is below ₹10000');
    expect(outcome.armed).toBe(false);
  });

  it('stays quiet while the balance is healthy, and stays armed', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { totalBalance: 4_000_000 },
      format,
      now,
    );

    expect(outcome.fire).toBe(false);
    expect(outcome.armed).toBe(true);
  });

  it('does not repeat while the balance stays low', () => {
    expect(
      evaluateMoneyRule(
        { ...rule, armed: false },
        { totalBalance: 400_000 },
        format,
        now,
      ).fire,
    ).toBe(false);
  });
});

describe('large_transaction', () => {
  const rule = armed({ kind: 'large_transaction', threshold: 1_000_000 });

  it('fires on a transaction over the threshold', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { largestTransaction: { description: 'Laptop', amount: 8_000_000 } },
      format,
      now,
    );

    expect(outcome.fire).toBe(true);
    expect(outcome.notification?.body).toBe(
      'Laptop is above your ₹10000 alert.',
    );
  });

  /**
   * Each large charge is its own event. Disarming here would hide the second
   * unexpected transaction of the day, which is the one that matters.
   */
  it('stays armed so the next large charge still alerts', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { largestTransaction: { description: 'Laptop', amount: 8_000_000 } },
      format,
      now,
    );

    expect(outcome.armed).toBe(true);
  });

  it('stays quiet when nothing crossed the line', () => {
    expect(
      evaluateMoneyRule(
        rule,
        { largestTransaction: { description: 'Coffee', amount: 20_000 } },
        format,
        now,
      ).fire,
    ).toBe(false);
  });
});

describe('weekly_summary', () => {
  const rule = armed({ kind: 'weekly_summary' });

  it('fires the first time it is ever evaluated', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { weekly: { income: 5_000_000, expense: 3_000_000 } },
      format,
      now,
    );

    expect(outcome.fire).toBe(true);
    expect(outcome.notification?.body).toBe(
      '₹30000 out, ₹50000 in — up ₹20000.',
    );
  });

  it('waits out the cadence before sending again', () => {
    const outcome = evaluateMoneyRule(
      { ...rule, lastFiredAt: new Date('2026-04-12T09:00:00Z') },
      { weekly: { income: 0, expense: 0 } },
      format,
      now,
    );

    expect(outcome.fire).toBe(false);
  });

  it('sends again once the cadence has passed', () => {
    const outcome = evaluateMoneyRule(
      { ...rule, lastFiredAt: new Date('2026-04-08T09:00:00Z') },
      { weekly: { income: 0, expense: 1_000_000 } },
      format,
      now,
    );

    expect(outcome.fire).toBe(true);
    expect(outcome.notification?.body).toBe('₹10000 out, ₹0 in — down ₹10000.');
  });
});

describe('goal_progress', () => {
  const rule = armed({ kind: 'goal_progress' });

  it('names the goals that are behind', () => {
    const outcome = evaluateMoneyRule(
      rule,
      {
        goals: [
          { name: 'Phone', percentComplete: 20, onTrack: false },
          { name: 'Trip', percentComplete: 80, onTrack: true },
        ],
      },
      format,
      now,
    );

    expect(outcome.notification?.title).toBe('1 goal needs attention');
    expect(outcome.notification?.body).toBe('Phone is behind.');
  });

  it('says so when everything is on track', () => {
    const outcome = evaluateMoneyRule(
      rule,
      { goals: [{ name: 'Trip', percentComplete: 80, onTrack: true }] },
      format,
      now,
    );

    expect(outcome.notification?.title).toBe('Your goals are all on track');
    expect(outcome.notification?.body).toBe('Trip 80%');
  });

  it('stays quiet for a user with no goals', () => {
    expect(evaluateMoneyRule(rule, { goals: [] }, format, now).fire).toBe(
      false,
    );
  });
});
