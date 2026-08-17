import { cookies } from "next/headers";
import { AUTH_TOKEN_COOKIE_NAME } from "./auth-token";

function getAuthBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_AUTH_URL) {
    return process.env.NEXT_PUBLIC_API_AUTH_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/api\/v1\/?$/, "/api/auth");
  }
  return process.env.NODE_ENV === "production"
    ? "https://api.pocketly.hasanraiyan.me/api/auth"
    : "http://localhost:4000/api/auth";
}

const authBaseUrl = getAuthBaseUrl();

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

/**
 * Resource-based auth check for Server Components: asks the API's
 * handler to resolve the bearer token into a session.
 */
export async function getServerSession(): Promise<{
  user: SessionUser;
} | null> {
  const cookieStore = await cookies();
  const token =
    cookieStore.get(AUTH_TOKEN_COOKIE_NAME)?.value ||
    cookieStore.get("pocketly_session")?.value;
  if (!token) return null;

  try {
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
  } catch {
    return null;
  }
}
