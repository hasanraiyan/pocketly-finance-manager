import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';

export const revokeConnectionSchema = z.object({ revoked: z.literal(true) });

export class RevokeConnectionResponseDto extends createZodDto(
  envelopeSchema(revokeConnectionSchema),
) {}
