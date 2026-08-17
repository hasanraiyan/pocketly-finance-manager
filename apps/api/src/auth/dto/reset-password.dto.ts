import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long'),
});

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
