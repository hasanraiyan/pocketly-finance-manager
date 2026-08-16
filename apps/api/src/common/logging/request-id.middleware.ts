import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

const HEADER = 'x-request-id';

/**
 * Applied first, in main.ts, before anything else -- so every response
 * (including 401s rejected by a guard) carries a request id, and every
 * log line for a request can be tied back to it.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.headers[HEADER];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : randomUUID();
  req.headers[HEADER] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
