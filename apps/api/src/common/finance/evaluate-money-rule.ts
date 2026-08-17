import type { MoneyFormatter } from './insight-rules';

export const MONEY_RULE_KINDS = [
  'category_over',
  'balance_under',
  'large_transaction',
  'weekly_summary',
  'goal_progress',
] as const;

export type MoneyRuleKind = (typeof MONEY_RULE_KINDS)[number];

/** Digest rules fire on a cadence rather than on a threshold. */
export const DIGEST_KINDS: MoneyRuleKind[] = [
  'weekly_summary',
  'goal_progress',
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface EvaluableRule {
  kind: MoneyRuleKind;
  /** Minor units. Required for the three threshold kinds. */
  threshold?: number | null;
  /** Label for whatever the rule watches -- a category or account name. */
  subject?: string;
  /**
   * False once the rule has fired, until the signal falls back the other side
   * of the threshold. Without it, a balance parked under its floor produces
   * one alert per run until the user turns notifications off.
   */
  armed: boolean;
  lastFiredAt?: Date | null;
  /** Days between digest sends. Ignored by threshold rules. */
  cadenceDays?: number;
}

export interface RuleSignals {
  categorySpend?: number;
  totalBalance?: number;
  largestTransaction?: { description: string; amount: number } | null;
  weekly?: { income: number; expense: number };
  goals?: Array<{ name: string; percentComplete: number; onTrack: boolean }>;
}

export interface RuleOutcome {
  fire: boolean;
  /** The rule's new `armed` value, whether or not it fired. */
  armed: boolean;
  notification?: { title: string; body: string; actionUrl: string };
}

const quiet = (armed: boolean): RuleOutcome => ({ fire: false, armed });

/**
 * Decides whether one rule should notify right now.
 *
 * Pure, and returns the next `armed` state alongside the decision, so the
 * hysteresis that stops an alert repeating is testable without a queue, a
 * database or a clock.
 */
export function evaluateMoneyRule(
  rule: EvaluableRule,
  signals: RuleSignals,
  format: MoneyFormatter,
  now: Date = new Date(),
): RuleOutcome {
  switch (rule.kind) {
    case 'category_over': {
      const spend = signals.categorySpend ?? 0;
      const threshold = rule.threshold ?? 0;
      if (threshold <= 0) return quiet(rule.armed);

      if (spend < threshold) return quiet(true);
      if (!rule.armed) return quiet(false);

      return {
        fire: true,
        armed: false,
        notification: {
          title: `${rule.subject ?? 'A category'} passed ${format(threshold)}`,
          body: `You've spent ${format(spend)} on ${
            rule.subject ?? 'this category'
          } this period.`,
          actionUrl: '/analysis',
        },
      };
    }

    case 'balance_under': {
      const balance = signals.totalBalance ?? 0;
      const threshold = rule.threshold ?? 0;
      if (threshold <= 0) return quiet(rule.armed);

      if (balance > threshold) return quiet(true);
      if (!rule.armed) return quiet(false);

      return {
        fire: true,
        armed: false,
        notification: {
          title: `Balance is below ${format(threshold)}`,
          body: `You're down to ${format(balance)} across your accounts.`,
          actionUrl: '/accounts',
        },
      };
    }

    /**
     * Not armed/disarmed: each large transaction is its own event, and the
     * repeat-suppression that makes sense for a standing balance would hide
     * the second unexpected charge of the day.
     */
    case 'large_transaction': {
      const largest = signals.largestTransaction;
      const threshold = rule.threshold ?? 0;
      if (!largest || threshold <= 0 || largest.amount < threshold) {
        return quiet(true);
      }

      return {
        fire: true,
        armed: true,
        notification: {
          title: `Large transaction: ${format(largest.amount)}`,
          body: `${largest.description} is above your ${format(
            threshold,
          )} alert.`,
          actionUrl: '/records',
        },
      };
    }

    case 'weekly_summary': {
      if (!isDue(rule, now)) return quiet(rule.armed);
      const weekly = signals.weekly ?? { income: 0, expense: 0 };
      const net = weekly.income - weekly.expense;

      return {
        fire: true,
        armed: rule.armed,
        notification: {
          title: 'Your week in money',
          body: `${format(weekly.expense)} out, ${format(
            weekly.income,
          )} in — ${net >= 0 ? 'up' : 'down'} ${format(Math.abs(net))}.`,
          actionUrl: '/analysis',
        },
      };
    }

    case 'goal_progress': {
      if (!isDue(rule, now)) return quiet(rule.armed);
      const goals = signals.goals ?? [];
      if (goals.length === 0) return quiet(rule.armed);

      const offTrack = goals.filter((goal) => !goal.onTrack);

      return {
        fire: true,
        armed: rule.armed,
        notification: {
          title:
            offTrack.length === 0
              ? 'Your goals are all on track'
              : offTrack.length === 1
                ? '1 goal needs attention'
                : `${offTrack.length} goals need attention`,
          body:
            offTrack.length === 0
              ? goals.map((g) => `${g.name} ${g.percentComplete}%`).join(', ')
              : `${offTrack.map((g) => g.name).join(', ')} ${
                  offTrack.length === 1 ? 'is' : 'are'
                } behind.`,
          actionUrl: '/goals',
        },
      };
    }
  }
}

/** Digest cadence, defaulting to weekly. First run always counts as due. */
function isDue(rule: EvaluableRule, now: Date): boolean {
  if (!rule.lastFiredAt) return true;
  const days = rule.cadenceDays ?? 7;
  return now.getTime() - rule.lastFiredAt.getTime() >= days * MS_PER_DAY;
}
