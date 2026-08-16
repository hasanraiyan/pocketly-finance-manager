import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { isoDateSchema } from '../../common/validation/iso-date.schema';
import { ANALYSIS_PERIODS } from '../../common/finance/resolve-analysis-range';

export const analysisQuerySchema = z.object({
  period: z.enum(ANALYSIS_PERIODS).default('this_month'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export class AnalysisQueryDto extends createZodDto(analysisQuerySchema) {}
