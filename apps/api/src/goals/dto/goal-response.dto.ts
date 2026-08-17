import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { GOAL_STATUSES } from '../../common/finance/goal-projection';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import { GOAL_KINDS } from '../schemas/goal.schema';

export const goalSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  kind: z.enum(GOAL_KINDS),
  targetAmount: z.number(),
  savedAmount: z.number(),
  accountId: z.string().nullable(),
  monthlyContribution: z.number(),
  targetDate: z.string().nullable(),
  deletedAt: z.string().nullable(),
  syncVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const goalWithProjectionSchema = goalSchema.extend({
  /** Account balance when the goal is linked, `savedAmount` otherwise. */
  progress: z.number(),
  remaining: z.number(),
  percentComplete: z.number(),
  projectedCompletion: z.string().nullable(),
  monthsRemaining: z.number().nullable(),
  requiredMonthly: z.number().nullable(),
  monthlyShortfall: z.number(),
  onTrack: z.boolean(),
  status: z.enum(GOAL_STATUSES),
});

export class GoalDto extends createZodDto(envelopeSchema(goalSchema)) {}
export class GoalWithProjectionDto extends createZodDto(
  envelopeSchema(goalWithProjectionSchema),
) {}
export class GoalListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(goalWithProjectionSchema)),
) {}
