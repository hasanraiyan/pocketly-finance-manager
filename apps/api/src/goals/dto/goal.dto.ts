import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { isoDateSchema } from '../../common/validation/iso-date.schema';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { GOAL_KINDS } from '../schemas/goal.schema';

/**
 * The optional fields are `.optional()` rather than `.default()` on purpose:
 * a Zod default lands in the schema's *output* type, which would make the
 * field required in the generated OpenAPI request body. The Mongoose schema
 * owns these defaults instead.
 */
export const goalFields = {
  name: z.string().trim().min(1).max(100),
  kind: z.enum(GOAL_KINDS).optional(),
  targetAmount: z.number().int().positive(),
  /** Ignored when `accountId` is set -- progress comes from the account. */
  savedAmount: z.number().int().min(0).optional(),
  accountId: objectIdSchema.nullish(),
  monthlyContribution: z.number().int().min(0).optional(),
  targetDate: isoDateSchema.nullish(),
};

export const createGoalSchema = z.object(goalFields);
export const updateGoalSchema = z.object(goalFields).partial();

/**
 * Signed, so "I took ₹2,000 back out" is expressible. The service rejects a
 * contribution that would drive progress below zero rather than clamping,
 * which would silently disagree with what the user typed.
 */
export const contributeSchema = z.object({
  amount: z
    .number()
    .int()
    .refine((value) => value !== 0, {
      message: 'Amount must not be zero',
    }),
});

export class CreateGoalDto extends createZodDto(createGoalSchema) {}
export class UpdateGoalDto extends createZodDto(updateGoalSchema) {}
export class ContributeGoalDto extends createZodDto(contributeSchema) {}
