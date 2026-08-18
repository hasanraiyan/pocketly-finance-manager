import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { BACKGROUND_WORKER_OPTIONS } from '../common/queue/background-worker-options';
import { FcmService, SendPushOptions } from './fcm.service';

export const NOTIFICATIONS_QUEUE = 'notifications';

export interface SingleNotificationJob {
  userId: string;
  payload: SendPushOptions;
}

export interface BulkNotificationJob {
  items: Array<{
    userId: string;
    payload: SendPushOptions;
  }>;
}

@Processor(NOTIFICATIONS_QUEUE, BACKGROUND_WORKER_OPTIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly fcmService: FcmService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<void> {
    this.logger.log(`Processing notification job ${job.name} (id: ${job.id})`);

    switch (job.name) {
      case 'send-notification':
        await this.handleSingleNotification(job.data as SingleNotificationJob);
        break;

      case 'send-bulk-notifications':
        await this.handleBulkNotifications(job.data as BulkNotificationJob);
        break;

      case 'daily-inactivity-reminder':
        await this.handleDailyInactivityCheck();
        break;

      default:
        this.logger.warn(`Unknown notification job name: ${job.name}`);
    }
  }

  private async handleSingleNotification(
    data: SingleNotificationJob,
  ): Promise<void> {
    await this.fcmService.sendToUser(
      new Types.ObjectId(data.userId),
      data.payload,
    );
  }

  private async handleBulkNotifications(
    data: BulkNotificationJob,
  ): Promise<void> {
    const CHUNK_SIZE = 50;
    for (let i = 0; i < data.items.length; i += CHUNK_SIZE) {
      const chunk = data.items.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map((item) =>
          this.fcmService.sendToUser(
            new Types.ObjectId(item.userId),
            item.payload,
          ),
        ),
      );
    }
    this.logger.log(`Processed ${data.items.length} bulk notifications`);
  }

  private async handleDailyInactivityCheck(): Promise<void> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Find all users who recorded at least one transaction today
    const activeUserIds = await this.transactionModel.distinct('userId', {
      deletedAt: null,
      date: { $gte: todayStart, $lte: todayEnd },
    });

    // Find users who have NOT recorded any transactions today
    const inactiveUsers = await this.userModel
      .find({
        _id: { $nin: activeUserIds },
      })
      .select('_id name')
      .lean()
      .exec();

    this.logger.log(
      `Found ${inactiveUsers.length} inactive users today for 8 PM reminder`,
    );

    // Send daily reminder in chunks
    const CHUNK_SIZE = 50;
    for (let i = 0; i < inactiveUsers.length; i += CHUNK_SIZE) {
      const chunk = inactiveUsers.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map((user) =>
          this.fcmService.sendToUser(user._id, {
            title: 'Pocketly Daily Reminder 📝',
            body: "You haven't recorded any expenses today. Keep your money streak alive!",
            type: 'DAILY_REMINDER',
            actionUrl: '/records',
          }),
        ),
      );
    }
  }
}
