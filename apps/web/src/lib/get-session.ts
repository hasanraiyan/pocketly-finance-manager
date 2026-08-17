import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME, decodeAccessToken, isExpired } from "./auth-tokens";

/**
 * Server-side "is someone signed in" read for Server Components. Only ever
 * used to decide between "Dashboard" and "Sign in" in marketing-page nav --
 * no caller reads the user's name/email from it (the JWT doesn't carry
 * either; it's `sub` + `sid` only), so this only returns presence.
 *
 * Decode-only, no signature check: a forged cookie could at most make a
 * logged-out visitor see the "Dashboard" link, which 404s nowhere and leads
 * to a page that re-checks properly (`(app)/layout.tsx` calls the real API
 * with the same cookie, which the API verifies for real).
 */
export async function getServerSession(): Promise<{ userId: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = decodeAccessToken(token);
  if (!decoded || isExpired(decoded.exp)) return null;

  return { userId: decoded.sub };
}
