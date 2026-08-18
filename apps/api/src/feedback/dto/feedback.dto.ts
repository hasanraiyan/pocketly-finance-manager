import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
} from '../schemas/feedback.schema';

export const createFeedbackSchema = z.object({
  type: z.enum(FEEDBACK_TYPES).optional().default('feedback'),
  category: z.enum(FEEDBACK_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  rating: z.number().int().min(1).max(5).nullish(),
  pageContext: z.string().trim().max(200).nullish(),
});

export const feedbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  type: z.enum(FEEDBACK_TYPES).optional(),
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['recent', 'upvotes']).optional().default('recent'),
  onlyMine: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional(),
});

export const adminFeedbackQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  cursor: z.string().optional(),
  type: z.enum(FEEDBACK_TYPES).optional(),
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  search: z.string().trim().optional(),
  sortBy: z.enum(['recent', 'upvotes']).optional().default('recent'),
});

export const adminUpdateFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
  internalNotes: z.string().trim().max(4000).nullish(),
  adminResponse: z.string().trim().max(4000).nullish(),
});

export class CreateFeedbackDto extends createZodDto(createFeedbackSchema) {}
export class FeedbackQueryDto extends createZodDto(feedbackQuerySchema) {}
export class AdminFeedbackQueryDto extends createZodDto(
  adminFeedbackQuerySchema,
) {}
export class AdminUpdateFeedbackDto extends createZodDto(
  adminUpdateFeedbackSchema,
) {}
