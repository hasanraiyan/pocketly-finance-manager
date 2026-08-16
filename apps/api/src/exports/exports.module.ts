import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Account, AccountSchema } from '../accounts/schemas/account.schema';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import {
  Transaction,
  TransactionSchema,
} from '../transactions/schemas/transaction.schema';
import { ExportsController } from './exports.controller';
import { EXPORTS_QUEUE, ExportProcessor } from './exports.processor';
import { ExportsService } from './exports.service';
import { MailerService } from './mail/mailer.service';

@Module({
  imports: [
    // Register the exports queue with BullMQ
    BullModule.registerQueue({ name: EXPORTS_QUEUE }),

    // The worker needs direct model access to aggregate data
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Account.name, schema: AccountSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  controllers: [ExportsController],
  providers: [ExportsService, ExportProcessor, MailerService],
})
export class ExportsModule {}
