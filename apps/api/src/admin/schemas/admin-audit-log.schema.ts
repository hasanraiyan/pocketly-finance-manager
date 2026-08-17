import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type AdminAuditLogDocument = HydratedDocument<AdminAuditLog>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class AdminAuditLog {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  adminUserId!: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  adminEmail!: string;

  @Prop({ required: true, trim: true, index: true })
  action!: string;

  @Prop({ required: true, trim: true, index: true })
  targetId!: string;

  @Prop({ required: true, trim: true })
  targetType!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  details!: Record<string, unknown>;

  @Prop({ type: String, default: null })
  ip?: string | null;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt!: Date;
}

export const AdminAuditLogSchema = SchemaFactory.createForClass(AdminAuditLog);
AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });
