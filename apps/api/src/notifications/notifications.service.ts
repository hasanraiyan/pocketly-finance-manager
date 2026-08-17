import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { UserDocument } from '../users/schemas/user.schema';
import { RegisterDeviceDto } from './dto/register-device.dto';
import {
  DeviceToken,
  DeviceTokenDocument,
} from './schemas/device-token.schema';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { FcmService } from './fcm.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(DeviceToken.name)
    private readonly deviceTokenModel: Model<DeviceTokenDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly fcmService: FcmService,
  ) {}

  async registerDevice(user: UserDocument, dto: RegisterDeviceDto) {
    const userId = user._id;

    const device = await this.deviceTokenModel.findOneAndUpdate(
      { token: dto.token },
      {
        userId,
        token: dto.token,
        platform: dto.platform,
        userAgent: dto.userAgent,
        lastSeenAt: new Date(),
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      device: {
        _id: device._id.toString(),
        platform: device.platform,
        lastSeenAt: device.lastSeenAt.toISOString(),
      },
    };
  }

  async unregisterDevice(user: UserDocument, token: string) {
    const userId = user._id;
    await this.deviceTokenModel.deleteOne({ userId, token }).exec();
    return { success: true };
  }

  async findAll(
    user: UserDocument,
    query: { limit?: number; page?: number; unreadOnly?: boolean },
  ) {
    const userId = user._id;
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 50);
    const page = Math.max(query.page ?? 1, 1);
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = { userId };
    if (query.unreadOnly) {
      filter.read = false;
    }

    const [items, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments(filter).exec(),
      this.notificationModel.countDocuments({ userId, read: false }).exec(),
    ]);

    return {
      data: {
        items: items.map((item) => ({
          _id: item._id.toString(),
          userId: item.userId.toString(),
          title: item.title,
          body: item.body,
          type: item.type,
          read: item.read,
          actionUrl: item.actionUrl,
          createdAt: item.createdAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: item.updatedAt?.toISOString() ?? new Date().toISOString(),
        })),
        total,
        unreadCount,
      },
    };
  }

  async markAsRead(user: UserDocument, notificationId: string) {
    const userId = user._id;
    const notification = await this.notificationModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(notificationId), userId },
        { read: true },
        { new: true },
      )
      .lean()
      .exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return {
      data: {
        _id: notification._id.toString(),
        userId: notification.userId.toString(),
        title: notification.title,
        body: notification.body,
        type: notification.type,
        read: notification.read,
        actionUrl: notification.actionUrl,
        createdAt:
          notification.createdAt?.toISOString() ?? new Date().toISOString(),
        updatedAt:
          notification.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
    };
  }

  async markAllAsRead(user: UserDocument) {
    const userId = user._id;
    await this.notificationModel
      .updateMany({ userId, read: false }, { read: true })
      .exec();
    return { data: { success: true } };
  }

  async sendTestNotification(user: UserDocument) {
    const userId = user._id;
    const notification = await this.fcmService.sendToUser(userId, {
      title: 'Pocketly Push Notifications Active! 🔔',
      body: 'Your device is successfully connected. You will receive budget warnings and daily reminders even when the app is closed.',
      type: 'SYSTEM',
      actionUrl: '/dashboard',
    });

    return {
      data: {
        _id: notification._id.toString(),
        title: notification.title,
        body: notification.body,
      },
    };
  }
}
