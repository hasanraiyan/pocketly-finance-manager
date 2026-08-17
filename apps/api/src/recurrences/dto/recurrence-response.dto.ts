import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RECURRENCE_FREQUENCIES } from '../../common/finance/next-occurrence';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import { TRANSACTION_TYPES } from '../../transactions/schemas/transaction.schema';

export const recurrenceSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number(),
  description: z.string().optional(),
  note: z.string().optional(),
  categoryId: z.string().optional(),
  accountId: z.string(),
  toAccountId: z.string().optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  interval: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  timezone: z.string(),
  nextRunAt: z.string().nullable(),
  lastRunAt: z.string().nullable(),
  paused: z.boolean(),
  deletedAt: z.string().nullable(),
  syncVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class RecurrenceDto extends createZodDto(
  envelopeSchema(recurrenceSchema),
) {}
export class RecurrenceListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(recurrenceSchema)),
) {}
