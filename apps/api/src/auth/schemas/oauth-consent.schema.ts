import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type OAuthConsentDocument = HydratedDocument<OAuthConsent>;

@Schema({ timestamps: true, collection: 'auth_consents' })
export class OAuthConsent extends Document {
  @Prop({ required: true, index: true })
  authUserId!: string;

  @Prop({ required: true, index: true })
  clientId!: string;

  @Prop({ type: [String], default: ['pocketly.read', 'pocketly.write'] })
  scopes!: string[];

  createdAt!: Date;
  updatedAt!: Date;
}

export const OAuthConsentSchema = SchemaFactory.createForClass(OAuthConsent);
OAuthConsentSchema.index({ authUserId: 1, clientId: 1 }, { unique: true });
