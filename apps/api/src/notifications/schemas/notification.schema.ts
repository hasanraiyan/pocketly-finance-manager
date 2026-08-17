import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export const NOTIFICATION_TYPES = [
  'BUDGET_ALERT',
  'DAILY_REMINDER',
  'MONTHLY_REPORT',
  'SECURITY',
  'SYSTEM',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

@Schema({ timestamps: true })
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({
    required: true,
    type: String,
    enum: NOTIFICATION_TYPES,
    default: 'SYSTEM',
  })
  type!: NotificationType;

  @Prop({ default: false, index: true })
  read!: boolean;

  @Prop({ type: String })
  actionUrl?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  // Added by `timestamps: true` above. Declared here so reads are typed
  // rather than cast through `any` at each call site.
  createdAt!: Date;
  updatedAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, read: 1 });
