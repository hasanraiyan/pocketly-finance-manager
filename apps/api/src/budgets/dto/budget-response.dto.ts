import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
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

export class BudgetDto extends createZodDto(budgetSchema) {}
export class BudgetWithStatusDto extends createZodDto(budgetWithStatusSchema) {}
