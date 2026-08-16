import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ANALYSIS_PERIODS } from '../../common/finance/resolve-analysis-range';
import { isoDateSchema } from '../../common/validation/iso-date.schema';

export const exportQuerySchema = z.object({
  period: z.enum(ANALYSIS_PERIODS).default('this_month'),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export class ExportQueryDto extends createZodDto(exportQuerySchema) {}
