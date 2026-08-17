import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';

export type OAuthClientDocument = HydratedDocument<OAuthClient>;

@Schema({ timestamps: true, collection: 'auth_oauth_clients' })
export class OAuthClient extends Document {
  @Prop({ required: true, unique: true, index: true })
  clientId: string;

  @Prop()
  clientSecret?: string;

  @Prop({ required: true })
  clientName: string;

  @Prop({ type: [String], default: [] })
  redirectUris: string[];

  @Prop({ type: [String], default: [] })
  grantTypes: string[];

  @Prop({ type: [String], default: [] })
  responseTypes: string[];

  @Prop({ type: [String], default: [] })
  scope: string[];

  createdAt: Date;
  updatedAt: Date;
}

export const OAuthClientSchema = SchemaFactory.createForClass(OAuthClient);
