import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { isoDateSchema } from '../../common/validation/iso-date.schema';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { TRANSACTION_TYPES } from '../schemas/transaction.schema';

const baseTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().int().positive(),
  description: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  categoryId: objectIdSchema.optional(),
  accountId: objectIdSchema,
  toAccountId: objectIdSchema.optional(),
  date: isoDateSchema,
});

function refineTransactionRules<
  T extends z.infer<typeof baseTransactionSchema>,
>(data: T, ctx: z.RefinementCtx) {
  if (data.type === 'transfer') {
    if (!data.toAccountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'toAccountId is required for transfers',
      });
    } else if (data.toAccountId === data.accountId) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: 'toAccountId must differ from accountId',
      });
    }
    if (data.categoryId) {
      ctx.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'Transfers must not have a category',
      });
    }
  } else if (!data.categoryId) {
    ctx.addIssue({
      code: 'custom',
      path: ['categoryId'],
      message: 'categoryId is required',
    });
  }
}

export const createTransactionSchema = baseTransactionSchema.superRefine(
  refineTransactionRules,
);

export const updateTransactionSchema = baseTransactionSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.type)
      refineTransactionRules(
        data as z.infer<typeof baseTransactionSchema>,
        ctx,
      );
  });

export const transactionQuerySchema = z.object({
  type: z.enum(TRANSACTION_TYPES).optional(),
  accountId: objectIdSchema.optional(),
  categoryId: objectIdSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  q: z.string().max(200).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export class CreateTransactionDto extends createZodDto(
  createTransactionSchema,
) {}
export class UpdateTransactionDto extends createZodDto(
  updateTransactionSchema,
) {}
export class TransactionQueryDto extends createZodDto(transactionQuerySchema) {}
