"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authBaseUrl, authClient } from "@/lib/auth-client";
import { isMcpOAuthRequest } from "@/lib/mcp-oauth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMcpConnect = isMcpOAuthRequest(searchParams);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });
    setSubmitting(false);
    if (authError) {
      setError(
        authError.message ?? "Couldn't sign you in. Check your details.",
      );
      return;
    }

    if (isMcpConnect) {
      // Full page navigation (not the client router): this hands off to
      // Better Auth's own OAuth authorize endpoint on the API's origin
      // (external to this Next.js app), which now finds the session the
      // sign-in above just created and continues the flow (straight to
      // consent, or straight back to the connecting app if this client
      // already has a standing grant).
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `${authBaseUrl}/oauth2/authorize?${searchParams.toString()}`;
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-heading text-3xl text-foreground">Pocketly</span>
        <p className="max-w-xs text-sm text-muted-foreground">
          {isMcpConnect
            ? "Sign in to connect this app to your ledger."
            : "Track, understand, and improve your money."}
        </p>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back to your ledger.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground underline underline-offset-4"
                  >
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="Your password"
                  required
                  value={password}
                  onChange={setPassword}
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner className="size-3.5" />}
                Sign in
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      {!isMcpConnect && (
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-foreground underline underline-offset-4">
            Get started
          </Link>
        </p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<Spinner className="size-4" />}>
      <SignInForm />
    </Suspense>
  );
}
