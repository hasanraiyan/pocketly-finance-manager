import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { UserDocument } from '../../users/schemas/user.schema';

/**
 * Logs every request (method, path, status, duration, request id) so
 * expected errors (404/400/409/...) leave a trace, not just unexpected
 * 500s (which Sentry already reports). Deliberately never logs bodies,
 * query strings, or headers beyond the request id -- only the route path
 * -- since financial data must never end up in logs.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UserDocument }>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, path } = request;
    const requestId = request.headers['x-request-id'];
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.log(
            method,
            path,
            response.statusCode,
            Date.now() - start,
            requestId,
            request.user,
          );
        },
        error: (error: unknown) => {
          const status =
            error instanceof HttpException ? error.getStatus() : 500;
          this.log(
            method,
            path,
            status,
            Date.now() - start,
            requestId,
            request.user,
            error,
          );
        },
      }),
    );
  }

  private log(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    requestId: string | string[] | undefined,
    user?: UserDocument,
    error?: unknown,
  ) {
    const requestIdSuffix = requestId ? ` reqId=${requestId as string}` : '';
    const userSuffix = user ? ` user=${user._id.toString()}` : '';
    const message = `${method} ${path} ${status} ${durationMs}ms${requestIdSuffix}${userSuffix}`;

    if (status >= 500) {
      this.logger.error(
        message,
        error instanceof Error ? error.stack : undefined,
      );
    } else if (status >= 400) {
      const reason = error instanceof Error ? ` — ${error.message}` : '';
      this.logger.warn(`${message}${reason}`);
    } else {
      this.logger.log(message);
    }
  }
}
