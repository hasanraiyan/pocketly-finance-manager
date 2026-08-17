import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ANALYSIS_PERIODS } from '../../common/finance/resolve-analysis-range';
import { isoDateSchema } from '../../common/validation/iso-date.schema';

/**
 * Exports accept everything the analysis endpoints do, plus `all_time`.
 * That extra option lives here rather than in `ANALYSIS_PERIODS` on
 * purpose: an export is a one-off background job, whereas an all-time
 * cash-flow series on `/analysis` would be an unbounded daily aggregate.
 */
export const EXPORT_PERIODS = [...ANALYSIS_PERIODS, 'all_time'] as const;
export type ExportPeriod = (typeof EXPORT_PERIODS)[number];

export const exportQuerySchema = z.object({
  period: z.enum(EXPORT_PERIODS).default('this_month'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export class ExportQueryDto extends createZodDto(exportQuerySchema) {}
