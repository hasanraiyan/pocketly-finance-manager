import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ACCOUNT_TYPES } from '../schemas/account.schema';

/** No `.default()` on any field -- see updateAccountSchema for why that matters. */
export const accountFields = {
  name: z.string().min(1).max(100),
  type: z.enum(ACCOUNT_TYPES),
  icon: z.string().max(50).optional(),
  initialBalance: z.number().int(),
  currency: z.string().length(3),
};

export const createAccountSchema = z.object({
  ...accountFields,
  initialBalance: accountFields.initialBalance.default(0),
  currency: accountFields.currency.default('INR'),
});

// Built from the same field definitions *without* defaults, not from
// createAccountSchema.partial() -- .partial() only makes a field optional
// when it's absent from input, it doesn't remove that field's .default(),
// so an update payload omitting initialBalance/currency would silently
// reset both to their create-time defaults instead of leaving them alone.
export const updateAccountSchema = z
  .object(accountFields)
  .partial()
  .extend({ ignored: z.boolean().optional() });

export class CreateAccountDto extends createZodDto(createAccountSchema) {}
export class UpdateAccountDto extends createZodDto(updateAccountSchema) {}
