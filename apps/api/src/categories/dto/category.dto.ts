import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CATEGORY_TYPES } from '../schemas/category.schema';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(CATEGORY_TYPES),
  icon: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
});

export const updateCategorySchema = createCategorySchema.partial().extend({
  ignored: z.boolean().optional(),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
