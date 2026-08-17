import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type McpConnectionDocument = HydratedDocument<McpConnection>;

/**
 * One row per MCP client that has actually used this user's data, recorded
 * by `McpAuthGuard` the first time a token from that client arrives. This is
 * last *use*, not last *consent* -- `OAuthConsent` (`mcp/oauth/`) is the
 * grant itself; this is "what is connected to my account, and when did it
 * last touch my data", which is what Settings actually shows.
 */
@Schema({ timestamps: true })
export class McpConnection {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /** OAuth client id, as issued by Pocketly's own authorization server. */
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
McpConnectionSchema.index({ userId: 1, clientId: 1 }, { unique: true });
