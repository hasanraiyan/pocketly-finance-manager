import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type AuthUserDocument = HydratedDocument<AuthUser>;

@Schema({ timestamps: true, collection: 'auth_users' })
export class AuthUser extends Document {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ required: false, default: null })
  passwordHash?: string;

  @Prop({ required: false, sparse: true, index: true })
  googleId?: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role: string;

  @Prop({ default: false })
  banned: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const AuthUserSchema = SchemaFactory.createForClass(AuthUser);
