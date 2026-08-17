import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SigningKeyDocument = HydratedDocument<SigningKey>;

/**
 * A singleton document holding the RS256 keypair every Pocketly-issued JWT
 * (session access tokens and MCP OAuth tokens alike) is signed with.
 *
 * Persisted rather than generated in `onModuleInit()` on every boot -- that
 * was a real bug in the system this replaces: a fresh keypair per process
 * invalidates every token on restart/redeploy, and breaks outright the
 * moment there's more than one API instance, since their JWKS would differ.
 * `JwtKeysService` upserts this document atomically on first boot; every
 * instance that loses the race just reads back what the winner wrote.
 */
@Schema({ timestamps: true, collection: 'auth_signing_keys' })
export class SigningKey {
  /** Fixed value -- the unique index is what makes the upsert a lock. */
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  kid: string;

  @Prop({ type: Object, required: true })
  privateJwk: Record<string, unknown>;

  @Prop({ type: Object, required: true })
  publicJwk: Record<string, unknown>;
}

export const SigningKeySchema = SchemaFactory.createForClass(SigningKey);
