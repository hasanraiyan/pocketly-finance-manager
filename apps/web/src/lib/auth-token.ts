export const AUTH_TOKEN_COOKIE_NAME = "pocketly_auth_token";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days, matches Better Auth's default session expiry.

/** Client-side only -- reads the bearer token cookie via `document.cookie`. */
export function getStoredAuthToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${AUTH_TOKEN_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function setStoredAuthToken(token: string) {
  if (typeof document === "undefined") return;
  const isSecure =
    typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${isSecure ? "; secure" : ""}`;
}

export function clearStoredAuthToken() {
  if (typeof document === "undefined") return;
  const isSecure =
    typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; samesite=lax${isSecure ? "; secure" : ""}`;
}
