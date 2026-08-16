import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AccountDocument = HydratedDocument<Account>;

export const ACCOUNT_TYPES = [
  'bank',
  'cash',
  'savings',
  'upi',
  'credit_card',
  'wallet',
] as const;

@Schema({ timestamps: true })
export class Account {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: String, enum: ACCOUNT_TYPES })
  type: (typeof ACCOUNT_TYPES)[number];

  @Prop()
  icon?: string;

  @Prop({ required: true, default: 0 })
  initialBalance: number;

  @Prop({ required: true, default: 'INR' })
  currency: string;

  @Prop({ default: false })
  ignored: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const AccountSchema = SchemaFactory.createForClass(Account);
AccountSchema.index({ userId: 1, deletedAt: 1 });
