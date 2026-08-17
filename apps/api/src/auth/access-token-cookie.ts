import type { Request } from 'express';

/**
 * The web app mirrors its access token into a cookie of this name so
 * server-rendered pages (and this one browser-facing endpoint) can read it
 * without a client-side `Authorization` header -- see
 * `apps/web/src/lib/auth-provider.tsx`. Deliberately not httpOnly on the web
 * side (the design calls for a client-managed token), which is why this is
 * a plain cookie read rather than anything security-load-bearing on its own;
 * the token itself is still a signed, short-lived JWT.
 */
export const ACCESS_TOKEN_COOKIE_NAME = 'pocketly_access_token';

/** Manual parse rather than pulling in `cookie-parser` for one read site. */
export function extractAccessTokenCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.match(
    new RegExp(`(?:^|;\\s*)${ACCESS_TOKEN_COOKIE_NAME}=([^;]+)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}
