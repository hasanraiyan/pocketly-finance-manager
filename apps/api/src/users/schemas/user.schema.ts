import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, default: null })
  passwordHash?: string | null;

  @Prop({
    required: true,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: String, default: null, index: true, sparse: true })
  googleId?: string | null;

  @Prop({
    type: String,
    enum: ['password', 'google', 'both'],
    default: 'password',
    index: true,
  })
  authProvider!: 'password' | 'google' | 'both';

  @Prop()
  phone?: string;

  @Prop({ default: 'INR' })
  currency!: string;

  @Prop({ default: 'UTC' })
  timezone!: string;

  /**
   * The floor safe-to-spend keeps untouched, in minor units. Null means "no
   * opinion" -- the calculation then derives one from the user's own spending
   * rather than assuming zero, which would call an empty account safe.
   */
  @Prop({ type: Number, default: null })
  minimumReserve?: number | null;

  /**
   * When the user finished (or skipped) the first-run walkthrough. Stored
   * server-side rather than in localStorage so it doesn't reappear on a
   * second device, and so clearing site data doesn't restart it.
   */
  @Prop({ type: Date, default: null })
  onboardedAt?: Date | null;

  /**
   * When the user dismissed the get-started checklist. Separate from
   * `onboardedAt`: the walkthrough explains what things are, the checklist
   * tracks what's left, and someone may well want one without the other.
   */
  @Prop({ type: Date, default: null })
  checklistDismissedAt?: Date | null;

  @Prop({ type: String, enum: ['user', 'admin'], default: 'user', index: true })
  role!: 'user' | 'admin';
}

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const UserSchema = SchemaFactory.createForClass(User);
