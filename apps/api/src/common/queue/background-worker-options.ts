import type { WorkerOptions } from 'bullmq';

/**
 * Shared tuning for every background BullMQ worker (notifications, exports,
 * money-rules, recurrences). None of these are latency-critical -- a job
 * picked up 30s later instead of near-instantly is invisible to a user --
 * but BullMQ's own defaults (drainDelay: 5s, stalledInterval: 30s) issue a
 * steady stream of Redis commands per worker even while completely idle.
 * On a pay-per-request Redis tier (Upstash), 4 workers running those
 * defaults 24/7 burns through the request quota almost entirely on idle
 * polling rather than actual job volume -- see the "max requests limit
 * exceeded" (ERR max requests limit exceeded, Upstash) incident this was
 * added for.
 */
export const BACKGROUND_WORKER_OPTIONS: Pick<
  WorkerOptions,
  'drainDelay' | 'stalledInterval'
> = {
  /** Seconds to wait before re-polling once the queue is empty. BullMQ default: 5. */
  drainDelay: 30,
  /** Milliseconds between stalled-job scans. BullMQ default: 30_000. */
  stalledInterval: 300_000,
};
