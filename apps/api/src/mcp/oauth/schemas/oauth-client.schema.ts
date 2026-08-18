import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OAuthClientDocument = HydratedDocument<OAuthClient>;

/**
 * An MCP client registered against Pocketly's own authorization server --
 * either self-registered via Dynamic Client Registration (RFC 7591, what
 * Claude and similar clients use to connect without a human pre-configuring
 * anything) or, in principle, created by hand later.
 */
@Schema({ timestamps: true, collection: 'oauth_clients' })
export class OAuthClient {
  @Prop({ required: true, unique: true, index: true })
  clientId!: string;

  @Prop({ required: true })
  clientName!: string;

  @Prop({ type: [String], default: [] })
  redirectUris!: string[];

  @Prop({ type: [String], default: ['authorization_code'] })
  grantTypes!: string[];

  @Prop({ type: [String], default: ['code'] })
  responseTypes!: string[];

  @Prop({ type: [String], default: [] })
  scope!: string[];

  /**
   * sha256 hex digest of the client secret, or null for a public (PKCE-only,
   * `none`) client. Never store the raw secret -- it's returned to the
   * caller exactly once, at registration, same as an authorization code.
   */
  @Prop({ type: String, default: null })
  clientSecretHash!: string | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OAuthClientSchema = SchemaFactory.createForClass(OAuthClient);
