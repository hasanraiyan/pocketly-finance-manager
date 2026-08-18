import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { errorMessage } from '../common/errors/error-message';
import {
  nextOccurrenceAfter,
  occurrencesBetween,
} from '../common/finance/next-occurrence';
import { BACKGROUND_WORKER_OPTIONS } from '../common/queue/background-worker-options';
import { TransactionsService } from '../transactions/transactions.service';
import { Recurrence, RecurrenceDocument } from './schemas/recurrence.schema';

export const RECURRENCES_QUEUE = 'recurrences';

/** How far back a catch-up run will reach. See occurrencesBetween. */
const CATCH_UP_LIMIT = 30;

/**
 * Posts due recurring transactions.
 *
 * Runs on a daily schedule but is safe to run at any cadence, and safe to
 * run twice: every write is guarded by the unique (recurrenceId,
 * occurrenceDate) index on transactions, so a duplicate is a caught error
 * rather than a duplicated payment.
 */
@Processor(RECURRENCES_QUEUE, BACKGROUND_WORKER_OPTIONS)
export class RecurrencesProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurrencesProcessor.name);

  constructor(
    @InjectModel(Recurrence.name)
    private readonly recurrenceModel: Model<RecurrenceDocument>,
    private readonly transactionsService: TransactionsService,
  ) {
    super();
  }

  async process(): Promise<{ posted: number; rules: number }> {
    const now = new Date();

    const due = await this.recurrenceModel
      .find({
        nextRunAt: { $ne: null, $lte: now },
        paused: false,
        deletedAt: null,
      })
      .exec();

    let posted = 0;
    for (const rule of due) {
      try {
        posted += await this.runRule(rule, now);
      } catch (error) {
        // One bad rule must not stop the rest of the queue.
        this.logger.error(
          `Recurrence ${rule._id.toString()} failed: ${String(error)}`,
        );
      }
    }

    if (posted > 0 || due.length > 0) {
      this.logger.log(
        `Recurrences: posted ${posted} transaction(s) from ${due.length} due rule(s)`,
      );
    }

    return { posted, rules: due.length };
  }

  private async runRule(rule: RecurrenceDocument, now: Date): Promise<number> {
    // Everything owed up to now, each with its own original date -- a ledger
    // that says rent was paid on the 5th when it was due on the 1st is wrong
    // in a way users notice.
    const occurrences = occurrencesBetween(
      rule,
      // -1ms so an occurrence landing exactly on the stored nextRunAt is
      // included rather than skipped by the strictly-after comparison.
      new Date(rule.nextRunAt!.getTime() - 1),
      now,
      CATCH_UP_LIMIT,
    );

    let posted = 0;
    for (const occurrenceDate of occurrences) {
      const created = await this.postOccurrence(rule, occurrenceDate);
      if (created) posted += 1;
    }

    const lastOccurrence = occurrences.at(-1) ?? rule.nextRunAt;
    rule.lastRunAt = lastOccurrence;
    rule.nextRunAt = nextOccurrenceAfter(rule, lastOccurrence ?? now);
    await rule.save();

    return posted;
  }

  /** Returns false when this occurrence already existed. */
  private async postOccurrence(
    rule: RecurrenceDocument,
    occurrenceDate: Date,
  ): Promise<boolean> {
    try {
      await this.transactionsService.create(
        rule.userId,
        {
          type: rule.type,
          amount: rule.amount,
          description: rule.description,
          note: rule.note,
          categoryId: rule.categoryId?.toString(),
          accountId: rule.accountId.toString(),
          toAccountId: rule.toAccountId?.toString(),
          date: occurrenceDate,
        },
        { recurrenceId: rule._id, occurrenceDate },
      );
      return true;
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        // Expected under retry or concurrent workers -- the unique index did
        // its job. Not an error worth alerting on.
        this.logger.debug(
          `Occurrence ${occurrenceDate.toISOString()} of ${rule._id.toString()} already posted`,
        );
        return false;
      }
      throw error;
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === 11000
    );
  }

  /**
   * BullMQ's `Worker` extends `EventEmitter` and emits `'error'` for
   * connection-level failures (e.g. Upstash's "max requests limit
   * exceeded"). `@nestjs/bullmq` only attaches a listener for methods
   * decorated with `@OnWorkerEvent` -- without this, an unhandled `'error'`
   * throws and crashes the process, which (on Render) restarts it straight
   * back into the same outage.
   */
  @OnWorkerEvent('error')
  onError(err: Error): void {
    this.logger.warn(`Worker error: ${errorMessage(err)}`);
  }
}

/** Job payload type kept explicit for the scheduler's upsert call. */
export type RecurrencesJob = Record<string, never>;
export type RecurrenceUserId = Types.ObjectId;
