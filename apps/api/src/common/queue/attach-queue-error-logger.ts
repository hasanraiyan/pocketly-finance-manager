import type { Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { errorMessage } from '../errors/error-message';

/**
 * BullMQ's `Queue` extends Node's `EventEmitter` and emits `'error'` for
 * connection-level failures (e.g. Upstash's "max requests limit exceeded").
 * `@nestjs/bullmq` does not attach a listener for it automatically -- see
 * `createQueueAndWorkers` in its `bull.providers.js`, which only wires
 * `onApplicationShutdown`. An `EventEmitter` with an unhandled `'error'`
 * event throws synchronously, which crashes the process. Every
 * `@InjectQueue` consumer must call this once so a Redis outage logs instead
 * of taking the API down (and Render restarting it) in a loop.
 */
export function attachQueueErrorLogger(queue: Queue, logger: Logger): void {
  queue.on('error', (err) => {
    logger.warn(`Queue "${queue.name}" connection error: ${errorMessage(err)}`);
  });
}
