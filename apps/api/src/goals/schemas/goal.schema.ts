import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type GoalDocument = HydratedDocument<Goal>;

/**
 * Free-text would make the icon and the grouping unanswerable; these cover
 * what people actually save for and leave `other` as the escape hatch.
 */
export const GOAL_KINDS = [
  'emergency_fund',
  'purchase',
  'travel',
  'education',
  'debt_payoff',
  'savings',
  'other',
] as const;

/**
 * A target the user is saving towards -- emergency fund, college fees, a
 * phone, a trip.
 *
 * A first-class financial object rather than a number in a note: safe-to-spend
 * subtracts what goals commit to this month, scenarios re-date them, and
 * insights warn when one slips. None of that is possible if the target only
 * exists in the user's head.
 */
@Schema({ timestamps: true })
export class Goal {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, type: String, enum: GOAL_KINDS, default: 'savings' })
  kind: (typeof GOAL_KINDS)[number];

  @Prop({ required: true, min: 1 })
  targetAmount: number;

  /**
   * Progress for an *unlinked* goal, moved only by the contributions
   * endpoint. Ignored entirely when `accountId` is set -- see the service.
   */
  @Prop({ required: true, min: 0, default: 0 })
  savedAmount: number;

  /**
   * Optional account whose balance *is* this goal's progress. When set, the
   * number can't drift from reality, because there is no second copy of it.
   */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Account', default: null })
  accountId: Types.ObjectId | null;

  /** What the user plans to put aside each month. Zero means unplanned. */
  @Prop({ required: true, min: 0, default: 0 })
  monthlyContribution: number;

  /** Open-ended when null. */
  @Prop({ type: Date, default: null })
  targetDate: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ default: 0 })
  syncVersion: number;
}

export const GoalSchema = SchemaFactory.createForClass(Goal);
GoalSchema.index({ userId: 1, deletedAt: 1 });
