import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
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

export const transactionListSchema = z.object({
  items: z.array(transactionSchema),
  nextCursor: z.string().nullable(),
});

export class TransactionDto extends createZodDto(transactionSchema) {}
export class TransactionListDto extends createZodDto(transactionListSchema) {}
