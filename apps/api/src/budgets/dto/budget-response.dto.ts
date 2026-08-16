import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import { BUDGET_PERIODS } from '../schemas/budget.schema';

export const budgetSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  categoryId: z.string(),
  amount: z.number(),
  period: z.enum(BUDGET_PERIODS),
  deletedAt: z.string().nullable(),
  syncVersion: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const budgetWithStatusSchema = budgetSchema.extend({
  spent: z.number(),
  remaining: z.number(),
  percentageUsed: z.number(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export class BudgetDto extends createZodDto(envelopeSchema(budgetSchema)) {}
export class BudgetWithStatusDto extends createZodDto(
  envelopeSchema(budgetWithStatusSchema),
) {}
export class BudgetListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(budgetWithStatusSchema)),
) {}
