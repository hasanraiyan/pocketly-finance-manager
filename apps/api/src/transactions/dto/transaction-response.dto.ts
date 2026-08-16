import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import { TRANSACTION_TYPES } from '../schemas/transaction.schema';

export const transactionSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number(),
  description: z.string().optional(),
  note: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string(),
  toAccountId: z.string().optional(),
  date: z.string(),
  deletedAt: z.string().nullable(),
  syncVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class TransactionDto extends createZodDto(
  envelopeSchema(transactionSchema),
) {}
export class TransactionListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(transactionSchema)),
) {}
