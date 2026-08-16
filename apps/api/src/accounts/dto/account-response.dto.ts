import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import { ACCOUNT_TYPES } from '../schemas/account.schema';

export const accountSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: z.enum(ACCOUNT_TYPES),
  icon: z.string().optional(),
  initialBalance: z.number(),
  currency: z.string(),
  ignored: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const accountWithBalanceSchema = accountSchema.extend({
  balance: z.number(),
});

export class AccountDto extends createZodDto(envelopeSchema(accountSchema)) {}
export class AccountWithBalanceDto extends createZodDto(
  envelopeSchema(accountWithBalanceSchema),
) {}
export class AccountListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(accountWithBalanceSchema)),
) {}
