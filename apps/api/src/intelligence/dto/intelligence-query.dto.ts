import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { FORECAST_HORIZONS } from '../../common/finance/forecast-balance';
import { RECURRENCE_FREQUENCIES } from '../../common/finance/next-occurrence';
import { isoDateSchema } from '../../common/validation/iso-date.schema';
import { SCENARIO_KINDS } from '../../common/finance/simulate-scenario';

export const forecastQuerySchema = z.object({
  horizon: z.enum(FORECAST_HORIZONS).default('month'),
});

export const scenarioSchema = z
  .object({
    kind: z.enum(SCENARIO_KINDS),
    amount: z.number().int().positive().optional(),
    // Optional, not defaulted: a Zod default would make it required in the
    // generated request body. The simulator treats anything but "income" as
    // an expense already.
    type: z.enum(['income', 'expense']).optional(),
    date: isoDateSchema.optional(),
    frequency: z.enum(RECURRENCE_FREQUENCIES).optional(),
    interval: z.number().int().positive().max(365).optional(),
    percentChange: z.number().min(-100).max(1000).optional(),
    label: z.string().max(100).optional(),
  })
  // Each kind needs a different field, and a scenario missing its own input
  // silently simulates nothing at all -- which reads as "no impact".
  .refine((dto) => dto.kind === 'spending_change' || dto.amount !== undefined, {
    message: 'amount is required for this scenario',
    path: ['amount'],
  })
  .refine(
    (dto) => dto.kind !== 'spending_change' || dto.percentChange !== undefined,
    {
      message: 'percentChange is required for a spending change',
      path: ['percentChange'],
    },
  );

export class ForecastQueryDto extends createZodDto(forecastQuerySchema) {}
export class ScenarioDto extends createZodDto(scenarioSchema) {}
