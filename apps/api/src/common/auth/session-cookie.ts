import type { Request } from 'express';

/** Cookie the session token rides in. */
export const SESSION_COOKIE_NAME = 'pocketly_session';

/**
 * Pulls the session token off a request: Authorization bearer header
 * first, then the parsed cookie, then the raw Cookie header for requests
 * that never went through cookie-parser.
 *
 * Express types `req.cookies` as `any`, so the narrowing happens here once
 * instead of at each call site -- this used to be copied verbatim into the
 * auth controller, the OAuth controller, and the app guard.
 */
export function extractSessionToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    if (token) return token;
  }

  const cookies: unknown = req.cookies;
  if (cookies !== null && typeof cookies === 'object') {
    const value = (cookies as Record<string, unknown>)[SESSION_COOKIE_NAME];
    if (typeof value === 'string' && value) return value;
  }

  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(
      new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`),
    );
    if (match) return decodeURIComponent(match[1]);
  }

  return undefined;
}
