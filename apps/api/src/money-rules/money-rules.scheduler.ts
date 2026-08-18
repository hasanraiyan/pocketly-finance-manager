import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { errorMessage } from '../common/errors/error-message';
import { attachQueueErrorLogger } from '../common/queue/attach-queue-error-logger';
import { MONEY_RULES_QUEUE } from './money-rules.processor';

/**
 * Runs the rule evaluator every six hours.
 *
 * More often than the daily jobs because a balance alert that arrives a day
 * late is not an alert; not continuously, because the evaluator reads real
 * aggregates per user and nothing here is worth a per-minute poll.
 *
 * Upserted by name, so every API instance registering it on boot converges on
 * one schedule rather than N of them -- same shape as the recurrence and
 * notification schedulers.
 */
@Injectable()
export class MoneyRulesScheduler implements OnModuleInit {
  private readonly logger = new Logger(MoneyRulesScheduler.name);

  constructor(
    @InjectQueue(MONEY_RULES_QUEUE)
    private readonly queue: Queue,
  ) {
    attachQueueErrorLogger(this.queue, this.logger);
  }

  async onModuleInit() {
    try {
      await this.queue.upsertJobScheduler('evaluate-money-rules', {
        pattern: '30 */6 * * *',
      });
      this.logger.log('Scheduled money-rule evaluation every six hours');
    } catch (err) {
      // A missing Redis must not stop the API booting -- alerts degrade,
      // everything else keeps working.
      this.logger.warn(
        `Could not schedule money-rule evaluation: ${errorMessage(err)}`,
      );
    }
  }
}
