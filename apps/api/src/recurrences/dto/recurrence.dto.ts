import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RECURRENCE_FREQUENCIES } from '../../common/finance/next-occurrence';
import { isoDateSchema } from '../../common/validation/iso-date.schema';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { TRANSACTION_TYPES } from '../../transactions/schemas/transaction.schema';

export const recurrenceFields = {
  type: z.enum(TRANSACTION_TYPES),
  amount: z.number().int().positive(),
  description: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  categoryId: objectIdSchema.optional(),
  accountId: objectIdSchema,
  toAccountId: objectIdSchema.optional(),
  frequency: z.enum(RECURRENCE_FREQUENCIES),
  interval: z.number().int().positive().max(365).default(1),
  startDate: isoDateSchema,
  endDate: isoDateSchema.nullish(),
};

export const createRecurrenceSchema = z
  .object(recurrenceFields)
  .refine((dto) => !dto.endDate || dto.endDate >= dto.startDate, {
    message: 'endDate must be on or after startDate',
    path: ['endDate'],
  });

// .partial() before .refine(), since a refinement can't be applied to a
// schema and then relaxed -- the cross-field check is re-declared here so
// that a PATCH sending only endDate is still validated against the stored
// startDate in the service.
export const updateRecurrenceSchema = z.object(recurrenceFields).partial();

export class CreateRecurrenceDto extends createZodDto(createRecurrenceSchema) {}
export class UpdateRecurrenceDto extends createZodDto(updateRecurrenceSchema) {}
