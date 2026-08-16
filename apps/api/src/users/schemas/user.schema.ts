import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  /**
   * Better Auth's own user id (its `user` collection, a separate set of
   * MongoDB documents Better Auth manages itself -- this is the foreign key
   * linking this Pocketly profile to that identity).
   */
  @Prop({ required: true, unique: true, index: true })
  authUserId!: string;

  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  imageUrl?: string;

  @Prop({ default: 'INR' })
  currency!: string;

  @Prop({ default: 'UTC' })
  timezone!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
