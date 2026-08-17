import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { IS_RAW_RESPONSE_KEY } from './raw-response.decorator';

export interface Envelope<T> {
  data: T;
}

/**
 * Wraps every success response body in { data: ... } for a consistent
 * shape across the whole API. Does not touch the error path -- Nest's
 * default { statusCode, message, error } shape for exceptions is
 * untouched, and a 204 (undefined body) stays bodyless.
 *
 * `@RawResponse()` opts a route out, for bodies whose shape is fixed by an
 * external spec (see the decorator).
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Envelope<T> | T
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean>(
      IS_RAW_RESPONSE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next
      .handle()
      .pipe(map((data) => (isRaw || data === undefined ? data : { data })));
  }
}
