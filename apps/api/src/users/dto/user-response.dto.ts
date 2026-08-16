import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';

export const userSchema = z.object({
  _id: z.string(),
  clerkUserId: z.string(),
  email: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
  currency: z.string(),
  timezone: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class UserDto extends createZodDto(envelopeSchema(userSchema)) {}
