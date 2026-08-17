import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type McpConnectionDocument = HydratedDocument<McpConnection>;

/**
 * One row per MCP client that has actually used this user's data, recorded
 * by McpAuthGuard the first time a token from that client arrives.
 *
 * Clerk owns the OAuth grant itself, but its Node SDK exposes no way to list
 * a user's grants, and Settings still needs to answer "what is connected to
 * my account, and when did it last touch my data?". Observing it here is
 * both answerable and more honest than listing grants: this is last *use*,
 * not last consent.
 */
@Schema({ timestamps: true })
export class McpConnection {
  /** Clerk user id -- matches the access token's `sub`. */
  @Prop({ required: true, index: true })
  authUserId!: string;

  /** OAuth client id, as registered with Clerk (dynamic registration included). */
  @Prop({ required: true })
  clientId!: string;

  @Prop()
  clientName?: string;

  @Prop({ type: [String], default: [] })
  scopes!: string[];

  @Prop({ required: true })
  lastSeenAt!: Date;

  declare createdAt: Date;
  declare updatedAt: Date;
}

export const McpConnectionSchema = SchemaFactory.createForClass(McpConnection);
McpConnectionSchema.index({ authUserId: 1, clientId: 1 }, { unique: true });
