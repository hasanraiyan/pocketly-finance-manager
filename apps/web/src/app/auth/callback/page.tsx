"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredAuthToken } from "@/lib/auth-token";
import { Spinner } from "@/components/ui/spinner";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const redirect = searchParams.get("redirect") || "/dashboard";

  useEffect(() => {
    if (token) {
      setStoredAuthToken(token);
      // Hard navigation to ensure Next.js server components and cookies refresh immediately
      window.location.href = redirect;
    } else {
      router.push("/sign-in");
    }
  }, [token, redirect, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
      <Spinner className="size-8 text-primary" />
      <p className="text-sm font-medium text-foreground">Completing sign-in...</p>
      <p className="text-xs text-muted-foreground">Setting up your ledger session</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
          <Spinner className="size-8 text-primary" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
