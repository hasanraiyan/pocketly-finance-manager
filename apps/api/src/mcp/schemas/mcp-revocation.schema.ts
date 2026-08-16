import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type McpRevocationDocument = HydratedDocument<McpRevocation>;

/**
 * MCP access tokens are JWTs -- verified locally by signature alone, with
 * no server-side revocation list, so an already-issued token normally
 * keeps working until its own ~1h expiry even after the user disconnects
 * the app (deleting the OAuth consent record only blocks a *future*
 * re-authorization, per Better Auth's oauth-provider; confirmed by reading
 * its refresh-token grant handler, which never checks consent existence).
 *
 * This collection is Pocketly's own lightweight deny-list on top of that:
 * one row per "disconnect" click, keyed by (authUserId, clientId). Every
 * MCP request checks for a matching row newer than the token's own `iat`
 * -- if one exists, the token was issued before the disconnect and is
 * rejected immediately, regardless of its unexpired `exp`. A token issued
 * *after* a disconnect (i.e. the user reconnected) naturally has a newer
 * `iat` than any prior revocation row, so it's unaffected.
 *
 * Self-cleaning: nothing here is useful past the max access-token
 * lifetime, so rows expire automatically via the TTL index below rather
 * than needing a cleanup job.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class McpRevocation {
  /** Better Auth's own user id -- matches the JWT's `sub` claim. */
  @Prop({ required: true })
  authUserId!: string;

  /** OAuth client id -- matches the JWT's `azp`/`client_id` claim. */
  @Prop({ required: true })
  clientId!: string;

  declare createdAt: Date;
}

export const McpRevocationSchema = SchemaFactory.createForClass(McpRevocation);
McpRevocationSchema.index({ authUserId: 1, clientId: 1, createdAt: -1 });
// TTL: auto-delete 2 hours after creation -- a safety margin over the
// default 1h access-token lifetime, so no token could still reference a
// pre-revocation `iat` this row would need to catch.
McpRevocationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });
