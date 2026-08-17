import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

export const TRANSACTION_TYPES = ['income', 'expense', 'transfer'] as const;

@Schema({ timestamps: true })
export class Transaction {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

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
    index: true,
  })
  accountId: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Account' })
  toAccountId?: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ default: 0 })
  syncVersion: number;

  /** Set when this record was stamped out by a recurrence rule. */
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Recurrence',
    default: null,
    index: true,
  })
  recurrenceId?: Types.ObjectId | null;

  /**
   * Which scheduled occurrence this record is. Distinct from `date`, which
   * the user may edit afterwards -- the pair (recurrenceId, occurrenceDate)
   * has to stay stable for the uniqueness guarantee below to mean anything.
   */
  @Prop({ type: Date, default: null })
  occurrenceDate?: Date | null;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, accountId: 1 });
TransactionSchema.index({ userId: 1, categoryId: 1 });
TransactionSchema.index({ userId: 1, deletedAt: 1 });

/**
 * Idempotency for the recurrence worker, enforced by the database rather
 * than by application logic.
 *
 * A retry, a restart mid-run, or two API instances both firing the scheduler
 * will all try to create the same occurrence twice. Checking "does it exist
 * already?" in the worker leaves a race between the check and the insert;
 * a unique index makes the second insert fail outright, so the worst case is
 * a duplicate-key error to swallow rather than someone's rent posted twice.
 *
 * Partial, so ordinary transactions (recurrenceId null) are unaffected --
 * without the filter every manual transaction would collide on (null, null).
 */
TransactionSchema.index(
  { recurrenceId: 1, occurrenceDate: 1 },
  {
    unique: true,
    partialFilterExpression: { recurrenceId: { $type: 'objectId' } },
  },
);
