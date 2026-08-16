import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { CATEGORY_TYPES } from '../schemas/category.schema';

export const categorySchema = z.object({
  _id: z.string(),
  userId: z.string(),
  name: z.string(),
  type: z.enum(CATEGORY_TYPES),
  icon: z.string().optional(),
  color: z.string().optional(),
  ignored: z.boolean(),
  deletedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export class CategoryDto extends createZodDto(categorySchema) {}
