import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';

export const exportQueuedSchema = z.object({
  jobId: z.string(),
  message: z.string(),
});

export class ExportQueuedDto extends createZodDto(
  envelopeSchema(exportQueuedSchema),
) {}
