import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type OAuthCodeDocument = HydratedDocument<OAuthCode>;

/**
 * A single-use PKCE-bound authorization code -- the thing `/oauth2/token`
 * exchanges for an access token. Deleted the instant it's exchanged (see
 * `OAuthService.exchangeCodeForToken`), and TTL-indexed as a backstop for
 * codes nobody ever redeems.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'oauth_codes',
})
export class OAuthCode {
  @Prop({ required: true, unique: true, index: true })
  codeHash!: string;

  @Prop({ required: true, index: true })
  clientId!: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  codeChallenge!: string;

  @Prop({ required: true, default: 'S256' })
  codeChallengeMethod!: string;

  @Prop({ required: true })
  redirectUri!: string;

  @Prop({ type: [String], required: true })
  scope!: string[];

  @Prop({ required: true, index: { expires: '0s' } })
  expiresAt!: Date;

  declare createdAt: Date;
}

export const OAuthCodeSchema = SchemaFactory.createForClass(OAuthCode);
