import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE_NAME } from "./auth-token";

const authBaseUrl =
  process.env.NEXT_PUBLIC_API_AUTH_URL ?? "http://localhost:4000/api/auth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

/**
 * Resource-based auth check for Server Components: asks the API's Better
 * Auth handler to resolve the bearer token cookie into a session. Returns
 * `null` for both "not signed in" and "token invalid/expired" -- callers
 * redirect to /sign-in either way.
 */
export async function getServerSession(): Promise<{
  user: SessionUser;
} | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
    cookieStore.get("pocketly_session")?.value;
  if (!token) return null;

  const response = await fetch(`${authBaseUrl}/session`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const data: unknown = await response.json().catch(() => null);
  if (
    !data ||
    typeof data !== "object" ||
    !("user" in data) ||
    !data.user
  ) {
    return null;
  }

  return data as { user: SessionUser };
}
