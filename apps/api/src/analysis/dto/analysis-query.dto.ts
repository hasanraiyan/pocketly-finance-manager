import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ANALYSIS_PERIODS } from '../../common/finance/resolve-analysis-range';

export const analysisQuerySchema = z.object({
  period: z.enum(ANALYSIS_PERIODS).default('this_month'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export class AnalysisQueryDto extends createZodDto(analysisQuerySchema) {}
