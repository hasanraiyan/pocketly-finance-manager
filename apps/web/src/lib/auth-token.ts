export const AUTH_TOKEN_COOKIE_NAME = "pocketly_auth_token";
export const AUTH_TOKEN_STORAGE_KEY = "pocketly_jwt_token";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/** Client-side only -- reads the bearer token from localStorage or document.cookie */
export function getStoredAuthToken(): string | undefined {
  if (typeof window === "undefined") return undefined;

  // 1. Read from localStorage
  try {
    const fromStorage = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (fromStorage) return fromStorage;
  } catch {}

  // 2. Fallback to cookie
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      /(?:^|;\s*)(?:pocketly_auth_token|pocketly_session)=([^;]+)/,
    );
    if (match) return decodeURIComponent(match[1]);
  }

  return undefined;
}

export function setStoredAuthToken(token: string) {
  if (typeof window === "undefined") return;

  // 1. Store in localStorage for fast client-side REST calls
  try {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } catch {}

  // 2. Store in cookie so Next.js Server Components / SSR can read the JWT
  if (typeof document !== "undefined") {
    const isSecure =
      typeof location !== "undefined" && location.protocol === "https:";
    const secureFlag = isSecure ? "; secure" : "";
    document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secureFlag}`;
    document.cookie = `pocketly_session=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE_SECONDS}; samesite=lax${secureFlag}`;
  }
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {}

  if (typeof document !== "undefined") {
    const isSecure =
      typeof location !== "undefined" && location.protocol === "https:";
    const secureFlag = isSecure ? "; secure" : "";
    document.cookie = `${AUTH_TOKEN_COOKIE_NAME}=; path=/; max-age=0; samesite=lax${secureFlag}`;
    document.cookie = `pocketly_session=; path=/; max-age=0; samesite=lax${secureFlag}`;
  }
}
