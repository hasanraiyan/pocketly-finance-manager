import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export class SignInDto extends createZodDto(signInSchema) {}
