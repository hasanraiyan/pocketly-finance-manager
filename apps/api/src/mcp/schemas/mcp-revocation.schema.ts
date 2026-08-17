import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type McpRevocationDocument = HydratedDocument<McpRevocation>;

/**
 * Clerk can issue MCP access tokens in JWT format, which are verified from
 * their signature alone. Such a token keeps working until its own ~1h expiry
 * even after the user disconnects the app, because revoking the grant at
 * Clerk only blocks a *future* authorization -- there is nothing to consult
 * at verification time. (Opaque `oat_` tokens don't have this problem: Clerk
 * checks those against its own store on every verification.)
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
  /** Clerk user id -- matches the access token's `sub` claim. */
  @Prop({ required: true })
  authUserId!: string;

  /** OAuth client id, as reported by Clerk when it verifies the token. */
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
