import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { UserDocument } from '../users/schemas/user.schema';
import type { ExportPeriod } from './dto/export.dto';
import { EXPORTS_QUEUE, type ExportJobPayload } from './exports.processor';

@Injectable()
export class ExportsService {
  constructor(
    @InjectQueue(EXPORTS_QUEUE) private readonly exportsQueue: Queue,
  ) {}

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
