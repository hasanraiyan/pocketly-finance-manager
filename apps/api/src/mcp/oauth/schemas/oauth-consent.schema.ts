import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type OAuthConsentDocument = HydratedDocument<OAuthConsent>;

/** What a user granted a given client, recorded each time consent is given so Settings can list and revoke it. */
@Schema({ timestamps: true, collection: 'oauth_consents' })
export class OAuthConsent {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  clientId!: string;

  @Prop({ type: [String], required: true })
  scopes!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const OAuthConsentSchema = SchemaFactory.createForClass(OAuthConsent);
OAuthConsentSchema.index({ userId: 1, clientId: 1 }, { unique: true });
