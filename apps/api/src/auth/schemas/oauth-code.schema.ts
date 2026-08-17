import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type OAuthCodeDocument = HydratedDocument<OAuthCode>;

@Schema({ timestamps: true, collection: 'auth_oauth_codes' })
export class OAuthCode extends Document {
  @Prop({ required: true, unique: true, index: true })
  codeHash: string;

  @Prop({ required: true, index: true })
  clientId: string;

  @Prop({ required: true })
  authUserId: string;

  @Prop({ required: true })
  codeChallenge: string;

  @Prop({ default: 'S256', enum: ['S256', 'plain'] })
  codeChallengeMethod: string;

  @Prop({ required: true })
  redirectUri: string;

  @Prop({ type: [String], default: [] })
  scope: string[];

  @Prop({ required: true, index: { expires: '0s' } })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OAuthCodeSchema = SchemaFactory.createForClass(OAuthCode);
