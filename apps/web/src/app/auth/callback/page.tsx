"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authBaseUrl, authClient } from "@/lib/auth-client";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { Spinner } from "@/components/ui/spinner";

/**
 * Lands here after a social (Google) sign-in redirect completes. Google ->
 * Better Auth's server-side callback only ever sets Better Auth's own
 * session cookie -- it's a full-page navigation, not a fetch our own
 * auth-client.ts's onSuccess hook can intercept, so the bearer token our
 * REST API client depends on (see auth-token.ts) never gets stored. A
 * plain authClient.getSession() call here is a normal fetch, so it *does*
 * go through that hook and materializes the token -- only then is it safe
 * to continue on to a page that expects it (getServerSession() on the
 * server, usePocketlyClient() on the client).
 */
function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = usePocketlyClient();
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void authClient.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (!data?.session) {
        setError(true);
        return;
      }

      // Best-effort, same as the email/password sign-up path: social
      // sign-in skips that form entirely, so this is the one place that
      // sees both a first-time Google sign-up and a returning Google
      // sign-in. Only touches it if it's still on the server default --
      // never overwrites a timezone the user (or a previous visit here)
      // already set.
      const profile = await client.GET("/users/me").catch(() => null);
      if (profile?.data?.data.timezone === "UTC") {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await client.PATCH("/users/me", { body: { timezone } }).catch(() => {});
      }

      const mcpQuery = searchParams.get("mcp");
      if (mcpQuery) {
        // Same continuation the email/password sign-in path uses -- a full
        // page navigation back to Better Auth's own authorize endpoint,
        // which now finds the session just established.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = `${authBaseUrl}/oauth2/authorize?${mcpQuery}`;
        return;
      }

      router.replace(searchParams.get("next") ?? "/dashboard");
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, client]);

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-background px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Something went wrong signing you in.
        </p>
        <Link
          href="/sign-in"
          className="text-sm text-foreground underline underline-offset-4"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
      <Spinner className="size-5" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-background px-4 py-16">
          <Spinner className="size-5" />
        </div>
      }
    >
      <AuthCallback />
    </Suspense>
  );
}
