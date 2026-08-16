import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type BudgetDocument = HydratedDocument<Budget>;

export const BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const;

@Schema({ timestamps: true })
export class Budget {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ required: true, type: String, enum: BUDGET_PERIODS })
  period: (typeof BUDGET_PERIODS)[number];

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ default: 0 })
  syncVersion: number;
}

export const BudgetSchema = SchemaFactory.createForClass(Budget);
BudgetSchema.index(
  { userId: 1, categoryId: 1, period: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
