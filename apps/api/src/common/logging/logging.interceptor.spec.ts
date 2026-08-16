import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function createContext(options: {
  method?: string;
  path?: string;
  user?: { _id: { toString(): string } };
  statusCode?: number;
}): ExecutionContext {
  const request = {
    method: options.method ?? 'GET',
    path: options.path ?? '/accounts',
    user: options.user,
  };
  const response = { statusCode: options.statusCode ?? 200 };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function handlerReturning<T>(observable: Observable<T>): CallHandler {
  return { handle: () => observable } as CallHandler;
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let logSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
    const logger = (interceptor as unknown as { logger: Console }).logger;
    logSpy = jest.spyOn(logger, 'log' as never).mockImplementation();
    warnSpy = jest.spyOn(logger, 'warn' as never).mockImplementation();
    errorSpy = jest.spyOn(logger, 'error' as never).mockImplementation();
  });

  it('logs a successful request at log level', (done) => {
    const context = createContext({
      method: 'GET',
      path: '/accounts',
      statusCode: 200,
    });

    interceptor
      .intercept(context, handlerReturning(of({ ok: true })))
      .subscribe(() => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('GET /accounts 200'),
        );
        done();
      });
  });

  it('logs an expected HttpException at warn level with its message, not error level', (done) => {
    const context = createContext({ method: 'GET', path: '/accounts/123' });
    const notFound = new HttpException(
      'Account not found',
      HttpStatus.NOT_FOUND,
    );

    interceptor
      .intercept(context, handlerReturning(throwError(() => notFound)))
      .subscribe({
        error: () => {
          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('GET /accounts/123 404'),
          );
          expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Account not found'),
          );
          expect(errorSpy).not.toHaveBeenCalled();
          done();
        },
      });
  });

  it('logs an unexpected error at error level with the stack trace', (done) => {
    const context = createContext({ method: 'POST', path: '/accounts' });
    const bug = new Error('boom');

    interceptor
      .intercept(context, handlerReturning(throwError(() => bug)))
      .subscribe({
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            expect.stringContaining('POST /accounts 500'),
            bug.stack,
          );
          expect(warnSpy).not.toHaveBeenCalled();
          done();
        },
      });
  });

  it('includes the authenticated user id when present', (done) => {
    const user = { _id: { toString: () => 'user123' } };
    const context = createContext({
      method: 'GET',
      path: '/accounts',
      user,
      statusCode: 200,
    });

    interceptor.intercept(context, handlerReturning(of({}))).subscribe(() => {
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('user=user123'),
      );
      done();
    });
  });
});
