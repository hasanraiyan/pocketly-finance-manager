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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Better Auth appends this to the callback URL itself when the
    // provider exchange fails (e.g. redirect_uri_mismatch, bad client
    // secret) -- session was never created, so there's no point calling
    // getSession() at all in that case.
    const providerError = searchParams.get("error");
    if (providerError) {
      // eslint-disable-next-line no-console
      console.error("[auth/callback] provider error:", providerError);
      setError(providerError);
      return;
    }

    let cancelled = false;

    async function checkSession() {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        const { data, error: sessionError } = await authClient.getSession({
          fetchOptions: {
            credentials: "include",
          },
        });

        if (data?.session) {
          // Best-effort timezone setup
          const profile = await client.GET("/users/me").catch(() => null);
          if (profile?.data?.data.timezone === "UTC") {
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await client.PATCH("/users/me", { body: { timezone } }).catch(() => {});
          }

          const mcpQuery = searchParams.get("mcp");
          if (mcpQuery) {
            window.location.href = `${authBaseUrl}/oauth2/authorize?${mcpQuery}`;
            return;
          }

          router.replace(searchParams.get("next") ?? "/dashboard");
          return;
        }

        if (sessionError) {
          console.error("[auth/callback] getSession failed:", sessionError);
          setError(sessionError.message ?? "no session after sign-in");
          return;
        }

        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 400));
        }
      }

      setError("no session after sign-in");
    }

    void checkSession();

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
        <p className="max-w-sm font-mono text-xs text-muted-foreground/70">
          {error}
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
