import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const revokeSessionSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

export class RevokeSessionDto extends createZodDto(revokeSessionSchema) {}
