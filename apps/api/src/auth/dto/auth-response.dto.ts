import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { userSchema } from '../../users/dto/user-response.dto';

export const authSessionSchema = z.object({
  user: userSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});

export class AuthSessionDto extends createZodDto(
  envelopeSchema(authSessionSchema),
) {}

export const sessionSchema = z.object({
  _id: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  createdAt: z.string(),
  lastUsedAt: z.string().nullish(),
  /** True for the session the requesting token itself belongs to. */
  current: z.boolean(),
});

export class SessionListDto extends createZodDto(
  envelopeSchema(z.object({ items: z.array(sessionSchema) })),
) {}
