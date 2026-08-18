import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { errorMessage } from '../common/errors/error-message';
import { attachQueueErrorLogger } from '../common/queue/attach-queue-error-logger';
import { RECURRENCES_QUEUE } from './recurrences.processor';

/**
 * Fires the recurrence worker once a day.
 *
 * Same shape as the notifications dispatcher's daily reminder: BullMQ's job
 * scheduler is upserted by name, so every API instance registering it on boot
 * converges on one schedule rather than N of them.
 *
 * 00:15 UTC rather than midnight: the worker posts occurrences by their own
 * date, so the exact firing time only decides how soon a due transaction
 * appears -- and staying off the hour avoids the pile-up of everything else
 * that runs at midnight.
 */
@Injectable()
export class RecurrencesScheduler implements OnModuleInit {
  private readonly logger = new Logger(RecurrencesScheduler.name);

  constructor(
    @InjectQueue(RECURRENCES_QUEUE)
    private readonly recurrencesQueue: Queue,
  ) {
    attachQueueErrorLogger(this.recurrencesQueue, this.logger);
  }

  async onModuleInit() {
    try {
      await this.recurrencesQueue.upsertJobScheduler('post-due-recurrences', {
        pattern: '15 0 * * *',
      });
      this.logger.log('Scheduled daily recurrence run at 00:15 UTC');
    } catch (err) {
      // A missing Redis must not stop the API booting -- recurring
      // transactions degrade, everything else keeps working.
      this.logger.warn(
        `Could not schedule recurrence cron: ${errorMessage(err)}`,
      );
    }
  }
}
