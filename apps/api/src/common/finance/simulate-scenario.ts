import type { DateRange } from './get-period-window';
import { forecastBalance, type Forecast } from './forecast-balance';
import { projectGoal, type GoalStatus } from './goal-projection';
import type { MoneyFormatter } from './insight-rules';
import {
  monthlyCommitment,
  projectRecurring,
  type ProjectableRule,
  type ProjectedOccurrence,
} from './project-recurring';
import { calculateSafeToSpend, unspentBudgetTotal } from './safe-to-spend';
import type { RecurrenceFrequency } from './next-occurrence';

export const SCENARIO_KINDS = [
  'one_off',
  'recurring',
  'spending_change',
] as const;

export type ScenarioKind = (typeof SCENARIO_KINDS)[number];

export interface Scenario {
  kind: ScenarioKind;
  /** Minor units, positive. Required for `one_off` and `recurring`. */
  amount?: number;
  type?: 'income' | 'expense';
  /** When the one-off happens. Defaults to the start of the window. */
  date?: Date;
  frequency?: RecurrenceFrequency;
  interval?: number;
  /** For `spending_change`: +10 means "spend 10% more". */
  percentChange?: number;
  label?: string;
}

export interface SimulationGoal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  monthlyContribution: number;
  targetDate?: Date | null;
}

export interface SimulationInputs {
  openingBalance: number;
  window: DateRange;
  occurrences: ProjectedOccurrence[];
  discretionaryDailyRate: number;
  timezone: string;
  budgets: Array<{ limit: number; spent: number }>;
  goals: SimulationGoal[];
  minimumReserve: number;
  now: Date;
}

export interface GoalOutcome {
  id: string;
  name: string;
  status: GoalStatus;
  projectedCompletion: Date | null;
  monthsRemaining: number | null;
}

export interface SimulationSide {
  projectedBalance: number;
  lowestBalance: number;
  shortfallDate: string | null;
  safeToSpend: number;
  goals: GoalOutcome[];
}

export interface SimulationResult {
  scenario: Scenario;
  baseline: SimulationSide;
  projected: SimulationSide;
  delta: {
    projectedBalance: number;
    safeToSpend: number;
    /** Change in what the scenario commits per month. Zero for one-offs. */
    monthlyCommitment: number;
  };
  /** Goals whose completion date moves, with how many months they slip. */
  goalsDelayed: Array<{ id: string; name: string; monthsLater: number }>;
  affordable: boolean;
  verdict: string;
}

/**
 * Answers "what happens if I do this?" by running the same projection twice
 * and diffing it.
 *
 * The whole value is in the second run using the *same* calculators as the
 * first: a simulator with its own arithmetic would eventually disagree with
 * the dashboard, and a what-if that contradicts the what-is is worse than no
 * what-if at all.
 */
export function simulateScenario(
  inputs: SimulationInputs,
  scenario: Scenario,
  format: MoneyFormatter,
): SimulationResult {
  const baselineForecast = runForecast(inputs);
  const baselineSafe = runSafeToSpend(inputs, baselineForecast);

  const changed = applyScenario(inputs, scenario, baselineSafe.amount);
  const projectedForecast = runForecast(changed);
  const projectedSafe = runSafeToSpend(changed, projectedForecast);

  const baseline = side(
    baselineForecast,
    baselineSafe.amount,
    inputs.goals,
    inputs.now,
  );
  const projected = side(
    projectedForecast,
    projectedSafe.amount,
    changed.goals,
    inputs.now,
  );

  const monthlyDelta = monthlyDeltaOf(scenario);
  const goalsDelayed = compareGoals(baseline.goals, projected.goals);
  const affordable =
    projected.shortfallDate === null && projectedSafe.shortfall === 0;

  return {
    scenario,
    baseline,
    projected,
    delta: {
      projectedBalance: projected.projectedBalance - baseline.projectedBalance,
      safeToSpend: projected.safeToSpend - baseline.safeToSpend,
      monthlyCommitment: monthlyDelta,
    },
    goalsDelayed,
    affordable,
    verdict: verdictFor(scenario, affordable, projected, goalsDelayed, format),
  };
}

function runForecast(inputs: SimulationInputs): Forecast {
  return forecastBalance({
    openingBalance: inputs.openingBalance,
    window: inputs.window,
    occurrences: inputs.occurrences,
    discretionaryDailyRate: inputs.discretionaryDailyRate,
    timezone: inputs.timezone,
  });
}

function runSafeToSpend(inputs: SimulationInputs, forecast: Forecast) {
  return calculateSafeToSpend({
    totalBalance: inputs.openingBalance,
    upcomingRecurring: forecast.projectedExpense,
    expectedIncome: forecast.projectedIncome,
    budgetCommitments: unspentBudgetTotal(inputs.budgets),
    goalCommitments: inputs.goals.reduce(
      (sum, goal) =>
        sum +
        (goal.savedAmount >= goal.targetAmount
          ? 0
          : Math.max(0, goal.monthlyContribution)),
      0,
    ),
    minimumReserve: inputs.minimumReserve,
  });
}

function side(
  forecast: Forecast,
  safeToSpend: number,
  goals: SimulationGoal[],
  now: Date,
): SimulationSide {
  return {
    projectedBalance: forecast.projectedBalance,
    lowestBalance: forecast.lowestBalance,
    shortfallDate: forecast.shortfallDate,
    safeToSpend,
    goals: goals.map((goal) => {
      const projection = projectGoal({ ...goal, now });
      return {
        id: goal.id,
        name: goal.name,
        status: projection.status,
        projectedCompletion: projection.projectedCompletion,
        monthsRemaining: projection.monthsRemaining,
      };
    }),
  };
}

/**
 * Builds the hypothetical world.
 *
 * A one-off larger than what's safe to spend has to come from somewhere, and
 * the honest answer is the money already set aside: the excess is taken off
 * goal progress pro rata, which is what pushes their completion dates out.
 * Pretending a ₹59,000 phone leaves an emergency fund untouched is exactly
 * the reassuring lie this feature exists to avoid.
 */
function applyScenario(
  inputs: SimulationInputs,
  scenario: Scenario,
  baselineSafeToSpend: number,
): SimulationInputs {
  switch (scenario.kind) {
    case 'one_off': {
      const amount = Math.max(0, scenario.amount ?? 0);
      const signed = scenario.type === 'income' ? 'income' : 'expense';
      const occurrence: ProjectedOccurrence = {
        ruleId: 'scenario',
        date: withinWindow(scenario.date ?? inputs.window.start, inputs.window),
        type: signed,
        amount,
      };

      const excess =
        signed === 'expense' ? Math.max(0, amount - baselineSafeToSpend) : 0;

      return {
        ...inputs,
        occurrences: [...inputs.occurrences, occurrence],
        goals: drawDownGoals(inputs.goals, excess),
      };
    }

    case 'recurring': {
      const rule: ProjectableRule = {
        id: 'scenario',
        type: scenario.type === 'income' ? 'income' : 'expense',
        amount: Math.max(0, scenario.amount ?? 0),
        frequency: scenario.frequency ?? 'monthly',
        interval: scenario.interval ?? 1,
        startDate: scenario.date ?? inputs.now,
        timezone: inputs.timezone,
      };

      const monthly = monthlyDeltaOf(scenario);

      // Projected from a hair before the window so the *first* occurrence
      // lands on the start date itself. "What if I save ₹5,000 a month" means
      // starting this month; a rule whose first payment falls after the
      // window would show the user no effect at all.
      const fromStart = {
        start: new Date(inputs.window.start.getTime() - 1),
        end: inputs.window.end,
      };

      return {
        ...inputs,
        occurrences: [
          ...inputs.occurrences,
          ...projectRecurring([rule], fromStart),
        ],
        // A new monthly cost has to come out of what was being saved.
        goals:
          monthly < 0
            ? squeezeContributions(inputs.goals, -monthly)
            : inputs.goals,
      };
    }

    case 'spending_change': {
      const factor = 1 + (scenario.percentChange ?? 0) / 100;
      return {
        ...inputs,
        discretionaryDailyRate: Math.max(
          0,
          Math.round(inputs.discretionaryDailyRate * factor),
        ),
      };
    }
  }
}

function withinWindow(date: Date, window: DateRange): Date {
  if (date < window.start) return window.start;
  if (date > window.end) return window.end;
  return date;
}

/** Takes `amount` off goal progress, split by each goal's share of the total. */
function drawDownGoals(
  goals: SimulationGoal[],
  amount: number,
): SimulationGoal[] {
  if (amount <= 0 || goals.length === 0) return goals;

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  if (totalSaved <= 0) return goals;

  return goals.map((goal) => ({
    ...goal,
    savedAmount: Math.max(
      0,
      goal.savedAmount - Math.round((goal.savedAmount / totalSaved) * amount),
    ),
  }));
}

/** Takes `amount` off monthly contributions, split by each goal's share. */
function squeezeContributions(
  goals: SimulationGoal[],
  amount: number,
): SimulationGoal[] {
  const totalContribution = goals.reduce(
    (sum, g) => sum + Math.max(0, g.monthlyContribution),
    0,
  );
  if (amount <= 0 || totalContribution <= 0) return goals;

  return goals.map((goal) => ({
    ...goal,
    monthlyContribution: Math.max(
      0,
      goal.monthlyContribution -
        Math.round((goal.monthlyContribution / totalContribution) * amount),
    ),
  }));
}

/** Negative when the scenario costs money each month, zero for one-offs. */
function monthlyDeltaOf(scenario: Scenario): number {
  if (scenario.kind !== 'recurring') return 0;

  const { total } = monthlyCommitment(
    [
      {
        id: 'scenario',
        type: scenario.type === 'income' ? 'income' : 'expense',
        amount: Math.max(0, scenario.amount ?? 0),
        frequency: scenario.frequency ?? 'monthly',
        interval: scenario.interval ?? 1,
        startDate: new Date(0),
        timezone: 'UTC',
      },
    ],
    scenario.type === 'income' ? 'income' : 'expense',
    new Date(0),
  );

  return scenario.type === 'income' ? total : -total;
}

function compareGoals(before: GoalOutcome[], after: GoalOutcome[]) {
  const byId = new Map(after.map((goal) => [goal.id, goal]));

  return before.flatMap((goal) => {
    const now = byId.get(goal.id);
    if (!now) return [];
    if (goal.monthsRemaining === null || now.monthsRemaining === null)
      return [];

    const monthsLater = now.monthsRemaining - goal.monthsRemaining;
    if (monthsLater <= 0) return [];

    return [{ id: goal.id, name: goal.name, monthsLater }];
  });
}

function verdictFor(
  scenario: Scenario,
  affordable: boolean,
  projected: SimulationSide,
  goalsDelayed: SimulationResult['goalsDelayed'],
  format: MoneyFormatter,
): string {
  if (!affordable) {
    return projected.shortfallDate
      ? `This puts you in the red on ${projected.shortfallDate}.`
      : 'This costs more than you have spare once your commitments are covered.';
  }

  const delayed = goalsDelayed[0];
  if (delayed) {
    return `You can cover this, but ${delayed.name} lands ${delayed.monthsLater} month${
      delayed.monthsLater === 1 ? '' : 's'
    } later.`;
  }

  return `Yes — you'd still have ${format(
    projected.safeToSpend,
  )} spare and ${format(projected.projectedBalance)} at the end of the period.`;
}
