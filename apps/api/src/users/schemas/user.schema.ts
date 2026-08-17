import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  /** Clerk user id (`user_...`). */
  @Prop({ required: true, unique: true, index: true })
  authUserId!: string;

  /**
   * The id this profile had under the pre-Clerk auth system, kept only for
   * reconciling the migration. Unset for anyone who signed up after it.
   */
  @Prop({ index: true, sparse: true })
  legacyAuthUserId?: string;

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
}

export const UserSchema = SchemaFactory.createForClass(User);
