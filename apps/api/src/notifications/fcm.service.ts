import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  App,
  ServiceAccount,
  cert,
  getApps,
  initializeApp,
} from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import {
  DeviceToken,
  DeviceTokenDocument,
} from './schemas/device-token.schema';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';
import { errorMessage } from '../common/errors/error-message';

export type SendPushOptions = {
  title: string;
  body: string;
  type?: NotificationType;
  actionUrl?: string;
  data?: Record<string, string>;
};

@Injectable()
export class FcmService {
  private readonly logger = new Logger(FcmService.name);
  private firebaseApp: App | null = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(DeviceToken.name)
    private readonly deviceTokenModel: Model<DeviceTokenDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0];
        return;
      }

      const serviceAccountJson = this.configService.get<string>(
        'FIREBASE_SERVICE_ACCOUNT_JSON',
      );
      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const clientEmail = this.configService.get<string>(
        'FIREBASE_CLIENT_EMAIL',
      );
      const privateKey = this.configService
        .get<string>('FIREBASE_PRIVATE_KEY')
        ?.replace(/\\n/g, '\n');

      if (serviceAccountJson) {
        // JSON.parse returns `any`; `cert` wants a ServiceAccount, so state
        // the shape once here rather than letting `any` spread outwards.
        const parsed = JSON.parse(serviceAccountJson) as ServiceAccount;
        this.firebaseApp = initializeApp({
          credential: cert(parsed),
        });
        this.logger.log('Firebase Admin initialized with service account JSON');
      } else if (projectId && clientEmail && privateKey) {
        this.firebaseApp = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.logger.log(`Firebase Admin initialized for project: ${projectId}`);
      } else {
        this.logger.warn(
          'Firebase credentials not configured (FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY). Push notifications will operate in mock mode.',
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to initialize Firebase Admin SDK: ${errorMessage(err)}`,
      );
    }
  }

  async sendToUser(
    userId: Types.ObjectId | string,
    options: SendPushOptions,
  ): Promise<NotificationDocument> {
    const userObjId =
      typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // 1. Create In-App Notification Record in MongoDB
    const notification = await this.notificationModel.create({
      userId: userObjId,
      title: options.title,
      body: options.body,
      type: options.type ?? 'SYSTEM',
      actionUrl: options.actionUrl,
      metadata: options.data,
      read: false,
    });

    // 2. Fetch User's Registered Device Tokens
    const devices = await this.deviceTokenModel
      .find({ userId: userObjId })
      .exec();
    if (!devices.length) {
      this.logger.debug(
        `No registered devices found for user ${userObjId.toString()}`,
      );
      return notification;
    }

    // 3. Dispatch Push via Firebase Admin
    if (!this.firebaseApp) {
      this.logger.debug(
        `[MOCK PUSH] Sent to ${devices.length} devices for user ${userObjId.toString()}: "${options.title}" - "${options.body}"`,
      );
      return notification;
    }

    const tokens = devices.map((d) => d.token);
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: options.title,
        body: options.body,
      },
      data: {
        ...(options.data ?? {}),
        notificationId: notification._id.toString(),
        type: options.type ?? 'SYSTEM',
        actionUrl: options.actionUrl ?? '/dashboard',
      },
      webpush: {
        fcmOptions: {
          link: options.actionUrl ?? '/dashboard',
        },
        notification: {
          icon: '/favicon.ico',
          badge: '/favicon.ico',
        },
      },
      android: {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#000000',
          sound: 'default',
        },
      },
    };

    try {
      const response = await getMessaging(
        this.firebaseApp,
      ).sendEachForMulticast(message);
      this.logger.log(
        `Push sent for user ${userObjId.toString()}: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      // Clean up invalid or expired tokens
      if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              tokensToRemove.push(tokens[idx]);
            }
          }
        });

        if (tokensToRemove.length > 0) {
          await this.deviceTokenModel
            .deleteMany({ token: { $in: tokensToRemove } })
            .exec();
          this.logger.log(
            `Pruned ${tokensToRemove.length} stale FCM device tokens`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `Error sending multicast push message: ${errorMessage(err)}`,
      );
    }

    return notification;
  }
}
