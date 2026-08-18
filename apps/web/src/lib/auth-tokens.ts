/**
 * Token storage contract shared by the browser (`auth-provider.tsx`), the
 * edge middleware (`proxy.ts`), and Server Components (`get-session.ts`,
 * `api-client.ts`). Written with only Web APIs (`atob`, no `Buffer`) so the
 * same decode logic runs unchanged on the Edge runtime.
 *
 * Cookie name must match `apps/api/src/auth/access-token-cookie.ts`'s
 * `ACCESS_TOKEN_COOKIE_NAME` -- that's the one place the API reads it back,
 * for the single browser-navigation endpoint (`GET /oauth2/authorize`) that
 * can't carry a custom `Authorization` header.
 */
export const ACCESS_TOKEN_COOKIE_NAME = "pocketly_access_token";
export const GUEST_COOKIE_NAME = "pocketly_guest_mode";
export const REFRESH_TOKEN_STORAGE_KEY = "pocketly_refresh_token";

export function writeGuestCookie(): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${GUEST_COOKIE_NAME}=1; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function clearGuestCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${GUEST_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

/** Seconds of slack before the real expiry -- refresh a little early rather than racing a request against it. */
const EXPIRY_SKEW_SECONDS = 30;

export interface DecodedAccessToken {
  sub: string;
  sid?: string;
  exp: number;
}

/** Decode only -- never trust this for authorization, only for "is it worth sending". Every real check happens server-side against the signature. */
export function decodeAccessToken(token: string): DecodedAccessToken | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json: unknown = JSON.parse(atob(base64));
    if (
      typeof json !== "object" ||
      json === null ||
      typeof (json as Record<string, unknown>).sub !== "string" ||
      typeof (json as Record<string, unknown>).exp !== "number"
    ) {
      return null;
    }
    const record = json as Record<string, unknown>;
    return {
      sub: record.sub as string,
      sid: typeof record.sid === "string" ? record.sid : undefined,
      exp: record.exp as number,
    };
  } catch {
    return null;
  }
}

export function isExpired(exp: number): boolean {
  return Date.now() >= (exp - EXPIRY_SKEW_SECONDS) * 1000;
}

/**
 * Client-only cookie mirror of the access token. Deliberately not httpOnly
 * -- that's the point of this storage design -- so Server Components can
 * read it via `next/headers` for SSR while the browser (this file) still
 * owns writing and clearing it. 30-day `max-age` matches the refresh
 * token's own lifetime; the JWT's own `exp` (15 min) is what actually gates
 * every read, both here and server-side, so an old cookie past its token's
 * expiry is inert, not a security hole.
 */
export function writeAccessTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=${token}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
}

export function clearAccessTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${ACCESS_TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function readAccessTokenCookieClient(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${ACCESS_TOKEN_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}
