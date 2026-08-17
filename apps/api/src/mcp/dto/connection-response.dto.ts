import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';

export const mcpConnectionSchema = z.object({
  id: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  scopes: z.array(z.string()),
  createdAt: z.string(),
  lastSeenAt: z.string(),
});

export class McpConnectionListDto extends createZodDto(
  envelopeSchema(z.object({ items: z.array(mcpConnectionSchema) })),
) {}
