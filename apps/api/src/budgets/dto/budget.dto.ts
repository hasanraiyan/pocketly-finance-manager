import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { objectIdSchema } from '../../common/validation/object-id.schema';
import { BUDGET_PERIODS } from '../schemas/budget.schema';

export const createBudgetSchema = z.object({
  categoryId: objectIdSchema,
  amount: z.number().int().positive(),
  period: z.enum(BUDGET_PERIODS),
});

export const updateBudgetSchema = createBudgetSchema.partial();

export class CreateBudgetDto extends createZodDto(createBudgetSchema) {}
export class UpdateBudgetDto extends createZodDto(updateBudgetSchema) {}
