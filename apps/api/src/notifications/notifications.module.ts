import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { Budget, BudgetSchema } from '../budgets/schemas/budget.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { FcmService } from './fcm.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import {
  NOTIFICATIONS_QUEUE,
  NotificationsProcessor,
} from './notifications.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    MongooseModule.forFeature([
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: Budget.name, schema: BudgetSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    FcmService,
    NotificationsService,
    NotificationDispatcherService,
    NotificationsProcessor,
  ],
  exports: [
    FcmService,
    NotificationsService,
    NotificationDispatcherService,
    BullModule,
  ],
})
export class NotificationsModule {}
