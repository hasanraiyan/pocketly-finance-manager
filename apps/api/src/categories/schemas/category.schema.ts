import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

export const CATEGORY_TYPES = ['income', 'expense'] as const;

@Schema({ timestamps: true })
export class Category {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: String, enum: CATEGORY_TYPES })
  type: (typeof CATEGORY_TYPES)[number];

  @Prop()
  icon?: string;

  @Prop()
  color?: string;

  @Prop({ default: false })
  ignored: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ userId: 1, type: 1, deletedAt: 1 });
