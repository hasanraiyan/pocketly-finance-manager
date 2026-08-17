import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export const FEEDBACK_CATEGORIES = [
  'general',
  'bug',
  'feature_request',
  'ux_ui',
  'financial_intelligence',
  'mcp',
  'other',
] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_STATUSES = [
  'submitted',
  'under_review',
  'planned',
  'in_progress',
  'shipped',
  'rejected',
] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const FEEDBACK_TYPES = ['feedback', 'feature_request'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackDocument = HydratedDocument<Feedback> & {
  createdAt?: Date;
  updatedAt?: Date;
};

@Schema({ timestamps: true })
export class Feedback {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  userName!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  userEmail!: string;

  @Prop({
    type: String,
    enum: FEEDBACK_TYPES,
    default: 'feedback',
    index: true,
  })
  type!: FeedbackType;

  @Prop({
    type: String,
    enum: FEEDBACK_CATEGORIES,
    required: true,
    index: true,
  })
  category!: FeedbackCategory;

  @Prop({ required: true, trim: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, trim: true, maxlength: 4000 })
  description!: string;

  @Prop({ type: Number, min: 1, max: 5, default: null })
  rating?: number | null;

  @Prop({ type: String, trim: true, maxlength: 200, default: null })
  pageContext?: string | null;

  @Prop({
    type: String,
    enum: FEEDBACK_STATUSES,
    default: 'submitted',
    index: true,
  })
  status!: FeedbackStatus;

  /** User IDs who upvoted this item. */
  @Prop({
    type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  upvotes!: Types.ObjectId[];

  @Prop({ type: Number, default: 0, index: true })
  upvoteCount!: number;

  /** Internal notes for administrators only (never returned to regular users). */
  @Prop({ type: String, default: null })
  internalNotes?: string | null;

  /** Public response / resolution commentary from the team. */
  @Prop({ type: String, default: null })
  adminResponse?: string | null;

  @Prop({ type: Date, default: null })
  deletedAt?: Date | null;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);
FeedbackSchema.index({ type: 1, status: 1, upvoteCount: -1 });
FeedbackSchema.index({ category: 1, createdAt: -1 });
FeedbackSchema.index({ deletedAt: 1, createdAt: -1 });
