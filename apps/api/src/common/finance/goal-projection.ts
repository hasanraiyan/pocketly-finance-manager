import { addMonths, differenceInCalendarMonths } from 'date-fns';

export const GOAL_STATUSES = [
  'complete',
  'on_track',
  'at_risk',
  'overdue',
  'stalled',
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export interface GoalProjectionInputs {
  targetAmount: number;
  savedAmount: number;
  /** What the user plans to put aside each month. Zero when unplanned. */
  monthlyContribution: number;
  /** Optional deadline. Without one a goal can be on track at any rate. */
  targetDate?: Date | null;
  now?: Date;
}

export interface GoalProjection {
  remaining: number;
  /** 0–100, capped -- overshooting a goal is not 140% of a goal. */
  percentComplete: number;
  /** Null when nothing is being contributed: no rate, no completion. */
  projectedCompletion: Date | null;
  monthsRemaining: number | null;
  /** The rate the deadline actually demands. Null without a target date. */
  requiredMonthly: number | null;
  /** How far the planned rate falls short of the required one. */
  monthlyShortfall: number;
  onTrack: boolean;
  status: GoalStatus;
}

/**
 * Turns a goal's three stored numbers into the four a user actually asks
 * about: how far along, when it lands, what it needs, and whether the current
 * plan gets there.
 *
 * Deliberately arithmetic on a monthly rate rather than a projection over the
 * transaction ledger. A goal is a *plan*, and a plan the user set is the
 * honest input -- inferring an intended savings rate from past behaviour
 * produces a completion date nobody agreed to.
 */
export function projectGoal({
  targetAmount,
  savedAmount,
  monthlyContribution,
  targetDate,
  now = new Date(),
}: GoalProjectionInputs): GoalProjection {
  const remaining = Math.max(0, targetAmount - savedAmount);
  const percentComplete =
    targetAmount <= 0
      ? 100
      : Math.min(100, Math.round((savedAmount / targetAmount) * 100));

  if (remaining === 0) {
    return {
      remaining: 0,
      percentComplete: 100,
      projectedCompletion: null,
      monthsRemaining: 0,
      requiredMonthly: 0,
      monthlyShortfall: 0,
      onTrack: true,
      status: 'complete',
    };
  }

  const rate = Math.max(0, monthlyContribution);
  const monthsRemaining = rate > 0 ? Math.ceil(remaining / rate) : null;
  const projectedCompletion =
    monthsRemaining === null ? null : addMonths(now, monthsRemaining);

  const isOverdue = targetDate != null && targetDate < now;

  // An overdue goal has no month left to spread the remainder across -- the
  // honest number is the remainder itself, not a rate computed by clamping
  // the elapsed time to a pretend one month. `status` says so explicitly
  // rather than reporting 'at_risk', which reads as "behind schedule" and
  // undersells a deadline that has already passed.
  const monthsToDeadline =
    targetDate && !isOverdue
      ? Math.max(1, differenceInCalendarMonths(targetDate, now))
      : null;
  const requiredMonthly = isOverdue
    ? remaining
    : monthsToDeadline === null
      ? null
      : Math.ceil(remaining / monthsToDeadline);

  const monthlyShortfall =
    requiredMonthly === null ? 0 : Math.max(0, requiredMonthly - rate);

  const onTrack = !isOverdue && rate > 0 && monthlyShortfall === 0;
  const status: GoalStatus = isOverdue
    ? 'overdue'
    : rate === 0
      ? 'stalled'
      : onTrack
        ? 'on_track'
        : 'at_risk';

  return {
    remaining,
    percentComplete,
    projectedCompletion,
    monthsRemaining,
    requiredMonthly,
    monthlyShortfall,
    onTrack,
    status,
  };
}

/**
 * What the user's live goals ask of this month, in total.
 *
 * Safe-to-spend subtracts this: money earmarked for a goal is committed even
 * though nothing has left the account yet, and a "safe to spend" number that
 * ignores it is the reason people miss their own savings targets.
 */
export function monthlyGoalCommitment(
  goals: Array<{
    targetAmount: number;
    savedAmount: number;
    monthlyContribution: number;
  }>,
): number {
  return goals.reduce(
    (sum, goal) =>
      sum +
      (goal.savedAmount >= goal.targetAmount
        ? 0
        : Math.max(0, goal.monthlyContribution)),
    0,
  );
}
