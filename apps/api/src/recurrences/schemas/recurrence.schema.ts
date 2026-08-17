import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { RECURRENCE_FREQUENCIES } from '../../common/finance/next-occurrence';
import { TRANSACTION_TYPES } from '../../transactions/schemas/transaction.schema';

export type RecurrenceDocument = HydratedDocument<Recurrence>;

/**
 * A template that stamps out transactions on a schedule -- rent, salary,
 * subscriptions.
 *
 * Deliberately its own collection rather than a flag on Transaction: a rule
 * is not a record of money moving, and putting it in `transactions` would
 * make every existing balance, budget and analysis query ambiguous about
 * whether it should count the template.
 */
@Schema({ timestamps: true })
export class Recurrence {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  // --- what to create (mirrors the Transaction fields it will stamp out) ---

  @Prop({ required: true, type: String, enum: TRANSACTION_TYPES })
  type: (typeof TRANSACTION_TYPES)[number];

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop()
  description?: string;

  @Prop()
  note?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category' })
  categoryId?: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Account',
    required: true,
  })
  accountId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Account' })
  toAccountId?: Types.ObjectId;

  // --- when to create it ---

  @Prop({ required: true, type: String, enum: RECURRENCE_FREQUENCIES })
  frequency: (typeof RECURRENCE_FREQUENCIES)[number];

  /** Every N periods. `2` + `weekly` = fortnightly. */
  @Prop({ required: true, min: 1, default: 1 })
  interval: number;

  @Prop({ required: true })
  startDate: Date;

  /** Open-ended when null. */
  @Prop({ type: Date, default: null })
  endDate: Date | null;

  /**
   * Timezone the schedule is evaluated in, captured from the user at
   * creation. Stored on the rule rather than read from the user each run so
   * that moving timezone doesn't silently reschedule existing rules.
   */
  @Prop({ required: true })
  timezone: string;

  // --- scheduler bookkeeping ---

  /**
   * When this rule is next due. The field the worker queries, so it carries
   * the index -- null once the rule is exhausted (past its endDate).
   */
  @Prop({ type: Date, default: null, index: true })
  nextRunAt: Date | null;

  @Prop({ type: Date, default: null })
  lastRunAt: Date | null;

  @Prop({ default: false })
  paused: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ default: 0 })
  syncVersion: number;
}

export const RecurrenceSchema = SchemaFactory.createForClass(Recurrence);

// The worker's query: due, live, not paused.
RecurrenceSchema.index({ nextRunAt: 1, paused: 1, deletedAt: 1 });
RecurrenceSchema.index({ userId: 1, deletedAt: 1 });
