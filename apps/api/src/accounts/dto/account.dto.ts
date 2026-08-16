import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ACCOUNT_TYPES } from '../schemas/account.schema';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  icon: z.string().max(50).optional(),
  initialBalance: z.number().int().default(0),
  currency: z.string().length(3).default('INR'),
});

export const updateAccountSchema = createAccountSchema.partial().extend({
  ignored: z.boolean().optional(),
});

export class CreateAccountDto extends createZodDto(createAccountSchema) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema) {}
