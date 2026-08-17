import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurrencesController } from './recurrences.controller';
import {
  RECURRENCES_QUEUE,
  RecurrencesProcessor,
} from './recurrences.processor';
import { RecurrencesScheduler } from './recurrences.scheduler';
import { RecurrencesService } from './recurrences.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: RECURRENCES_QUEUE }),
    // The worker creates through TransactionsService, not the model: balance
    // updates and budget-threshold notifications hang off the service, and a
    // recurring transaction should behave exactly like a hand-entered one.
    TransactionsModule,
  ],
  controllers: [RecurrencesController],
  providers: [RecurrencesService, RecurrencesProcessor, RecurrencesScheduler],
  exports: [RecurrencesService],
})
export class RecurrencesModule {}
