import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model, Types } from 'mongoose';
import { Budget, BudgetDocument } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategoryDocument,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionDocument,
} from '../transactions/schemas/transaction.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { formatMoney } from '../common/finance/format-money';
import { getPeriodWindow } from '../common/finance/get-period-window';
import { NOTIFICATIONS_QUEUE } from './notifications.processor';
import { SendPushOptions } from './fcm.service';
import { errorMessage } from '../common/errors/error-message';
import { attachQueueErrorLogger } from '../common/queue/attach-queue-error-logger';

@Injectable()
export class NotificationDispatcherService implements OnModuleInit {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly notificationsQueue: Queue,
    @InjectModel(Budget.name)
    private readonly budgetModel: Model<BudgetDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    attachQueueErrorLogger(this.notificationsQueue, this.logger);
  }

  async onModuleInit() {
    try {
      // Schedule repeatable daily reminder at 8:00 PM (20:00) every day via BullMQ scheduler
      await this.notificationsQueue.upsertJobScheduler(
        'daily-inactivity-reminder',
        { pattern: '0 20 * * *' },
      );
      this.logger.log(
        'Scheduled repeatable daily inactivity reminder at 20:00',
      );
    } catch (err) {
      this.logger.warn(
        `Could not schedule daily reminder cron: ${errorMessage(err)}`,
      );
    }
  }

  /**
   * Enqueues a single notification to the BullMQ queue for async processing.
   *
   * Swallows enqueue failures (e.g. Redis unreachable or over quota) rather
   * than throwing: a notification is a side effect of the caller's real
   * work (a budget check, a monthly report), and several callers invoke
   * this with `void`, where a throw becomes an unhandled promise rejection
   * that can crash the process instead of just losing one notification.
   */
  async enqueueNotification(
    userId: Types.ObjectId | string,
    payload: SendPushOptions,
  ): Promise<void> {
    try {
      await this.notificationsQueue.add(
        'send-notification',
        {
          userId: userId.toString(),
          payload,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
        },
      );
    } catch (err) {
      this.logger.warn(
        `Could not enqueue notification for user ${userId.toString()}: ${errorMessage(err)}`,
      );
    }
  }

  /**
   * Evaluates if the newly created transaction triggered a budget threshold alert (80% or 100%).
   */
  async checkBudgetThresholdAfterTransaction(
    userId: Types.ObjectId,
    transaction: { type: string; categoryId?: Types.ObjectId; amount: number },
  ): Promise<void> {
    if (transaction.type !== 'expense' || !transaction.categoryId) {
      return;
    }

    try {
      const [user, category, budget] = await Promise.all([
        this.userModel.findById(userId).lean().exec(),
        this.categoryModel.findById(transaction.categoryId).lean().exec(),
        this.budgetModel
          .findOne({
            userId,
            categoryId: transaction.categoryId,
            deletedAt: null,
          })
          .lean()
          .exec(),
      ]);

      if (!user || !category || !budget) {
        return;
      }

      const timezone = user.timezone ?? 'UTC';
      const window = getPeriodWindow(budget.period, timezone);

      // Sum all expenses for this category in the current period window
      const result = await this.transactionModel.aggregate<{
        totalSpent: number;
      }>([
        {
          $match: {
            userId,
            categoryId: transaction.categoryId,
            type: 'expense',
            deletedAt: null,
            date: { $gte: window.start, $lte: window.end },
          },
        },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$amount' },
          },
        },
      ]);

      const totalSpent = result[0]?.totalSpent ?? transaction.amount;
      const percentageUsed = Math.round((totalSpent / budget.amount) * 100);

      const currency = user.currency ?? 'INR';
      const formattedSpent = formatMoney(totalSpent, currency);
      const formattedBudget = formatMoney(budget.amount, currency);

      if (percentageUsed >= 100) {
        await this.enqueueNotification(userId, {
          title: `🚨 Budget Exceeded: ${category.name}`,
          body: `You have exceeded your ${budget.period} budget. Total spent: ${formattedSpent} of ${formattedBudget} (${percentageUsed}%).`,
          type: 'BUDGET_ALERT',
          actionUrl: '/planning',
          data: {
            categoryId: category._id.toString(),
            percentageUsed: percentageUsed.toString(),
          },
        });
      } else if (percentageUsed >= 80) {
        await this.enqueueNotification(userId, {
          title: `⚠️ Budget Warning: ${category.name}`,
          body: `You have used ${percentageUsed}% of your ${budget.period} budget (${formattedSpent} of ${formattedBudget}).`,
          type: 'BUDGET_ALERT',
          actionUrl: '/planning',
          data: {
            categoryId: category._id.toString(),
            percentageUsed: percentageUsed.toString(),
          },
        });
      }
    } catch (err) {
      this.logger.error(
        `Error evaluating budget threshold for user ${userId.toString()}: ${errorMessage(err)}`,
      );
    }
  }

  /**
   * Enqueues monthly statement generated notification.
   */
  async sendMonthlyReportNotification(
    userId: Types.ObjectId,
    periodLabel: string,
  ): Promise<void> {
    await this.enqueueNotification(userId, {
      title: `Your ${periodLabel} Financial Report is Ready 📄`,
      body: `Your financial summary for ${periodLabel} has been generated and delivered to your email.`,
      type: 'MONTHLY_REPORT',
      actionUrl: '/analysis',
      data: { periodLabel },
    });
  }
}
