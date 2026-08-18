import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE_NAME, decodeAccessToken, isExpired } from "@/lib/auth-tokens";

/**
 * Everything under (app) requires a session. Marketing pages, blog, tools and
 * the legal pages stay public -- they only ever *read* the session to decide
 * whether the header says "Dashboard" or "Sign in".
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/copilot",
  "/accounts",
  "/records",
  "/planning",
  "/analysis",
  "/goals",
  "/feedback",
  "/admin",
  "/settings",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Decode-and-expiry check only, on the Edge runtime -- no signature
 * verification here (that needs the public key, and would only protect a
 * routing decision the API re-checks for real on every request anyway; see
 * `get-session.ts`). A forged cookie can redirect past this gate but can't
 * make a single real request succeed once past it.
 */
export default function proxy(request: NextRequest) {
  if (!isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value;
  const decoded = token ? decodeAccessToken(token) : null;

  if (!decoded || isExpired(decoded.exp)) {
    const signIn = new URL("/sign-in", request.url);
    signIn.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless they appear
    // in a search param.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
