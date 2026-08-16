import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface Envelope<T> {
  data: T;
}

/**
 * Wraps every success response body in { data: ... } for a consistent
 * shape across the whole API. Does not touch the error path -- Nest's
 * default { statusCode, message, error } shape for exceptions is
 * untouched, and a 204 (undefined body) stays bodyless.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Envelope<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Envelope<T> | T> {
    return next
      .handle()
      .pipe(map((data) => (data === undefined ? data : { data })));
  }
}
