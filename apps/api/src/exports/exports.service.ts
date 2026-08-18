import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { attachQueueErrorLogger } from '../common/queue/attach-queue-error-logger';
import type { UserDocument } from '../users/schemas/user.schema';
import type { ExportPeriod } from './dto/export.dto';
import { EXPORTS_QUEUE, type ExportJobPayload } from './exports.processor';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(
    @InjectQueue(EXPORTS_QUEUE) private readonly exportsQueue: Queue,
  ) {
    attachQueueErrorLogger(this.exportsQueue, this.logger);
  }

  async queuePdfExport(
    user: UserDocument,
    period: ExportPeriod,
    from?: Date,
    to?: Date,
  ) {
    const payload: ExportJobPayload = {
      userId: user._id.toString(),
      email: user.email,
      userName: user.name,
      currency: user.currency,
      timezone: user.timezone,
      period,
      from,
      to,
    };

    const job = await this.exportsQueue.add('generate-pdf', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 100, // keep last 100 completed jobs in Redis
      removeOnFail: 50,
    });

    return { jobId: job.id };
  }

  async queueCsvExport(
    user: UserDocument,
    period: ExportPeriod,
    from?: Date,
    to?: Date,
  ) {
    const payload: ExportJobPayload = {
      userId: user._id.toString(),
      email: user.email,
      userName: user.name,
      currency: user.currency,
      timezone: user.timezone,
      period,
      from,
      to,
    };

    const job = await this.exportsQueue.add('generate-csv', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    });

    return { jobId: job.id };
  }
}
