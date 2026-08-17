import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FORECAST_HORIZONS } from '../../common/finance/forecast-balance';
import { GOAL_STATUSES } from '../../common/finance/goal-projection';
import {
  HEALTH_BANDS,
  HEALTH_COMPONENTS,
} from '../../common/finance/health-score';
import { DEDUCTION_KEYS } from '../../common/finance/safe-to-spend';
import { SCENARIO_KINDS } from '../../common/finance/simulate-scenario';
import { envelopeSchema } from '../../common/http/envelope.schema';

const windowSchema = z.object({
  start: z.string(),
  end: z.string(),
});

export const forecastSchema = z.object({
  horizon: z.enum(FORECAST_HORIZONS),
  currency: z.string(),
  window: windowSchema,
  openingBalance: z.number(),
  projectedBalance: z.number(),
  projectedIncome: z.number(),
  projectedExpense: z.number(),
  projectedDiscretionary: z.number(),
  lowestBalance: z.number(),
  shortfallDate: z.string().nullable(),
  days: z.array(
    z.object({
      date: z.string(),
      balance: z.number(),
      income: z.number(),
      expense: z.number(),
    }),
  ),
});

export const safeToSpendSchema = z.object({
  currency: z.string(),
  window: windowSchema,
  amount: z.number(),
  totalBalance: z.number(),
  expectedIncome: z.number(),
  totalDeductions: z.number(),
  shortfall: z.number(),
  /** True when the reserve was derived rather than set by the user. */
  reserveIsDerived: z.boolean(),
  deductions: z.array(
    z.object({
      key: z.enum(DEDUCTION_KEYS),
      label: z.string(),
      amount: z.number(),
    }),
  ),
});

export const healthSchema = z.object({
  currency: z.string(),
  score: z.number(),
  band: z.enum(HEALTH_BANDS),
  components: z.array(
    z.object({
      key: z.enum(HEALTH_COMPONENTS),
      label: z.string(),
      score: z.number(),
      weight: z.number(),
      reason: z.string(),
    }),
  ),
  unavailable: z.array(
    z.object({ key: z.enum(HEALTH_COMPONENTS), reason: z.string() }),
  ),
});

const simulationSideSchema = z.object({
  projectedBalance: z.number(),
  lowestBalance: z.number(),
  shortfallDate: z.string().nullable(),
  safeToSpend: z.number(),
  goals: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(GOAL_STATUSES),
      projectedCompletion: z.string().nullable(),
      monthsRemaining: z.number().nullable(),
    }),
  ),
});

export const scenarioResultSchema = z.object({
  currency: z.string(),
  window: windowSchema,
  scenario: z.object({
    kind: z.enum(SCENARIO_KINDS),
    amount: z.number().optional(),
    type: z.enum(['income', 'expense']).optional(),
    date: z.string().optional(),
    frequency: z.string().optional(),
    interval: z.number().optional(),
    percentChange: z.number().optional(),
    label: z.string().optional(),
  }),
  baseline: simulationSideSchema,
  projected: simulationSideSchema,
  delta: z.object({
    projectedBalance: z.number(),
    safeToSpend: z.number(),
    monthlyCommitment: z.number(),
  }),
  goalsDelayed: z.array(
    z.object({ id: z.string(), name: z.string(), monthsLater: z.number() }),
  ),
  affordable: z.boolean(),
  verdict: z.string(),
});

export class ForecastDto extends createZodDto(envelopeSchema(forecastSchema)) {}
export class SafeToSpendDto extends createZodDto(
  envelopeSchema(safeToSpendSchema),
) {}
export class HealthDto extends createZodDto(envelopeSchema(healthSchema)) {}
export class ScenarioResultDto extends createZodDto(
  envelopeSchema(scenarioResultSchema),
) {}
