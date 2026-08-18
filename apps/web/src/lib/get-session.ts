import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE_NAME, GUEST_COOKIE_NAME, decodeAccessToken, isExpired } from "./auth-tokens";

/**
 * Server-side "is someone signed in or in guest mode" read for Server Components.
 */
export async function getServerSession(): Promise<{ userId: string; isGuest?: boolean } | null> {
  const cookieStore = await cookies();
  const isGuest = cookieStore.get(GUEST_COOKIE_NAME)?.value === "1";
  if (isGuest) {
    return { userId: "local_guest_user", isGuest: true };
  }

  const token = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;

  const decoded = decodeAccessToken(token);
  if (!decoded || isExpired(decoded.exp)) return null;

  return { userId: decoded.sub };
}
