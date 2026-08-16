import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  clerkUserId: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: 'INR' })
  currency: string;

  @Prop({ default: 'UTC' })
  timezone: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
