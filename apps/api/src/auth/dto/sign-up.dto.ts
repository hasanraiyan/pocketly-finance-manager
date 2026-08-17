import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(1, 'Name is required').trim(),
});

export class SignUpDto extends createZodDto(signUpSchema) {}
