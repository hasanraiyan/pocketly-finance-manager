import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Everything under (app) requires a session. Marketing pages, blog, tools and
 * the legal pages stay public -- they only ever *read* the session to decide
 * whether the header says "Dashboard" or "Sign in".
 */
const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/accounts(.*)",
  "/records(.*)",
  "/planning(.*)",
  "/analysis(.*)",
  "/feedback(.*)",
  "/admin(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Everything except Next internals and static files, unless they appear
    // in a search param.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
