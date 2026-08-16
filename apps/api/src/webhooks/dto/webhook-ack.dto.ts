import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';

export const webhookAckSchema = z.object({
  received: z.literal(true),
});

export class WebhookAckDto extends createZodDto(
  envelopeSchema(webhookAckSchema),
) {}
