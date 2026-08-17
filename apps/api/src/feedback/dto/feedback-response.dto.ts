import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { envelopeSchema } from '../../common/http/envelope.schema';
import { paginatedListSchema } from '../../common/pagination/paginated-list.schema';
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPES,
} from '../schemas/feedback.schema';

export const feedbackItemSchema = z.object({
  _id: z.string(),
  type: z.enum(FEEDBACK_TYPES),
  category: z.enum(FEEDBACK_CATEGORIES),
  title: z.string(),
  description: z.string(),
  rating: z.number().nullable(),
  pageContext: z.string().nullable(),
  status: z.enum(FEEDBACK_STATUSES),
  upvoteCount: z.number(),
  hasUpvoted: z.boolean().default(false),
  adminResponse: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isOwner: z.boolean().default(false),
});

export const adminFeedbackItemSchema = feedbackItemSchema.extend({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  internalNotes: z.string().nullable(),
});

export class FeedbackDto extends createZodDto(envelopeSchema(feedbackItemSchema)) {}
export class FeedbackListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(feedbackItemSchema)),
) {}

export class AdminFeedbackDto extends createZodDto(
  envelopeSchema(adminFeedbackItemSchema),
) {}
export class AdminFeedbackListDto extends createZodDto(
  envelopeSchema(paginatedListSchema(adminFeedbackItemSchema)),
) {}
