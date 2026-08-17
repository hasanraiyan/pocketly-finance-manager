import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type DeviceTokenDocument = HydratedDocument<DeviceToken>;

export const DEVICE_PLATFORMS = ['web', 'android', 'ios'] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

@Schema({ timestamps: true })
export class DeviceToken {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  token!: string;

  @Prop({
    required: true,
    type: String,
    enum: DEVICE_PLATFORMS,
    default: 'web',
  })
  platform!: DevicePlatform;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  lastSeenAt!: Date;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);
DeviceTokenSchema.index({ userId: 1, platform: 1 });
