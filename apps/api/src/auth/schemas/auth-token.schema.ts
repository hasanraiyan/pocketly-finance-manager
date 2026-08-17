import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type AuthTokenDocument = HydratedDocument<AuthToken>;

@Schema({ timestamps: true, collection: 'auth_tokens' })
export class AuthToken extends Document {
  @Prop({ required: true, index: true })
  identifier: string;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true, enum: ['password_reset', 'email_verify'] })
  type: string;

  @Prop({ required: true, index: { expires: '0s' } })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const AuthTokenSchema = SchemaFactory.createForClass(AuthToken);
