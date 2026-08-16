import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth checks live as resource-based `auth.protect()` calls in each
// protected layout/page, not here -- path-based middleware matching can
// diverge from how Next.js actually routes requests and leave protected
// resources reachable. This middleware only establishes the Clerk auth
// context per request; it's still required even with no logic of its own.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
