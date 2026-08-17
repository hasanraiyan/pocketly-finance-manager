import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type McpRevocationDocument = HydratedDocument<McpRevocation>;

/**
 * MCP access tokens are JWTs verified from their signature alone, so one
 * already in a client's hands keeps working until its own ~1h expiry even
 * after the user disconnects -- there is nothing to consult at verification
 * time otherwise.
 *
 * This is Pocketly's deny-list on top of that: one row per "disconnect"
 * click, keyed by (userId, clientId). Every MCP request checks for a
 * matching row newer than the token's own `iat` -- if one exists, the token
 * predates the disconnect and is rejected immediately, regardless of its
 * unexpired `exp`. A token issued *after* a disconnect (the user
 * reconnected) naturally has a newer `iat` than any prior revocation row,
 * so it's unaffected.
 *
 * Self-cleaning: nothing here is useful past the max access-token lifetime,
 * so rows expire automatically via the TTL index below.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class McpRevocation {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  clientId!: string;

  declare createdAt: Date;
}

export const McpRevocationSchema = SchemaFactory.createForClass(McpRevocation);
McpRevocationSchema.index({ userId: 1, clientId: 1, createdAt: -1 });
// 2h safety margin over the 1h access-token lifetime -- no token could still
// reference a pre-revocation `iat` this row would need to catch.
McpRevocationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7200 });
