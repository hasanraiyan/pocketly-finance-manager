import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
