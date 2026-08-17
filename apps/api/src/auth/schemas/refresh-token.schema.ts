import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

/**
 * One row per issued refresh token -- each row *is* a "session" for the
 * Settings "Active Sessions & Devices" list. Access tokens are short-lived,
 * stateless JWTs verified by signature alone (see `JwtKeysService`); this is
 * the only session state the API keeps, and the only thing that can be
 * revoked before its natural expiry.
 *
 * Rotated rather than reused: presenting a refresh token issues a new one
 * and marks this one `revokedAt` (never deleted -- see the TTL index below).
 * A revoked token failing to refresh again is normal, expected behaviour,
 * not evidence of anything wrong; this does not attempt reuse-family
 * revocation (all-descendants-revoked-on-reuse), which is a reasonable
 * future hardening step but adds real complexity for a threat model this
 * product doesn't face yet.
 */
@Schema({ timestamps: true, collection: 'refresh_tokens' })
export class RefreshToken {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  tokenHash: string;

  /**
   * TTL index: Mongo deletes the document itself once this passes, so a
   * revoked-and-expired row doesn't need separate cleanup. `revokedAt` is
   * still checked explicitly, since a token can be revoked well before its
   * natural expiry (logout, "sign out other devices").
   */
  @Prop({ required: true, index: { expires: '0s' } })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
RefreshTokenSchema.index({ userId: 1, revokedAt: 1 });
