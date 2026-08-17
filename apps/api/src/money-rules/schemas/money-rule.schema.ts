import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { MONEY_RULE_KINDS } from '../../common/finance/evaluate-money-rule';

export type MoneyRuleDocument = HydratedDocument<MoneyRule>;

/**
 * A standing instruction to tell the user something, so Pocketly stops
 * requiring them to open the app to find out whether anything happened.
 *
 * The rule stores only *what to watch*; whether it should fire right now is
 * decided by the pure evaluator, which is why `armed` lives here rather than
 * being re-derived. Without stored hysteresis a balance parked under its floor
 * would alert on every run.
 */
@Schema({ timestamps: true })
export class MoneyRule {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: MONEY_RULE_KINDS })
  kind: (typeof MONEY_RULE_KINDS)[number];

  /** Minor units. Required for the threshold kinds, unused by digests. */
  @Prop({ type: Number, default: null })
  threshold: number | null;

  /** What a `category_over` rule watches. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null })
  categoryId: Types.ObjectId | null;

  @Prop({ default: true })
  enabled: boolean;

  /** Days between sends, for digest kinds. */
  @Prop({ required: true, min: 1, default: 7 })
  cadenceDays: number;

  /** False between firing and the signal falling back the other way. */
  @Prop({ default: true })
  armed: boolean;

  @Prop({ type: Date, default: null })
  lastFiredAt: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ default: 0 })
  syncVersion: number;
}

export const MoneyRuleSchema = SchemaFactory.createForClass(MoneyRule);
MoneyRuleSchema.index({ userId: 1, deletedAt: 1 });
// The worker's query: live rules, whatever they watch.
MoneyRuleSchema.index({ enabled: 1, deletedAt: 1 });
