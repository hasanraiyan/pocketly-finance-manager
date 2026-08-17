import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import {
  Document,
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from 'mongoose';

export type AuthSessionDocument = HydratedDocument<AuthSession>;

@Schema({ timestamps: true, collection: 'auth_sessions' })
export class AuthSession extends Document {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'AuthUser',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  @Prop({ required: true, index: { expires: '0s' } })
  expiresAt: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const AuthSessionSchema = SchemaFactory.createForClass(AuthSession);
