import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const sendVerificationEmailSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
});

export class SendVerificationEmailDto extends createZodDto(
  sendVerificationEmailSchema,
) {}
