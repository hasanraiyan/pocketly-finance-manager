"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, AlertCircle } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setError("No verification token found.");
      return;
    }

    let isMounted = true;
    authClient
      .verifyEmail({ token })
      .then(({ data, error: authError }) => {
        if (!isMounted) return;
        setVerifying(false);
        if (authError) {
          setError(authError.message || "Invalid or expired verification link.");
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.push("/dashboard");
          }, 2500);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setVerifying(false);
        setError("Network error verifying email.");
      });

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail) return;
    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    const { error: authError } = await authClient.sendVerificationEmail({
      email: resendEmail,
    });
    setResending(false);

    if (authError) {
      setResendError(authError.message || "Failed to send verification email.");
    } else {
      setResendSuccess(true);
    }
  }

  if (verifying) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <Spinner className="size-8 text-primary" />
        <p className="text-sm text-muted-foreground">Verifying your email address...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Email verified successfully!</p>
          <p className="text-xs text-muted-foreground">
            Redirecting you to your ledger in a few seconds...
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard")} className="mt-2 w-full">
          Continue to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
        <AlertCircle className="size-5 shrink-0" />
        <span>{error || "Verification link is invalid or has expired."}</span>
      </div>

      <form onSubmit={handleResend} className="space-y-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="resend-email">Resend verification link</FieldLabel>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@example.com"
              required
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
            />
          </Field>
          {resendError && <FieldError>{resendError}</FieldError>}
          {resendSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              A fresh verification email has been sent. Please check your inbox.
            </p>
          )}
          <Button type="submit" variant="outline" disabled={resending} className="w-full">
            {resending && <Spinner className="size-3.5" />}
            Resend Email
          </Button>
        </FieldGroup>
      </form>

      <div className="text-center text-xs text-muted-foreground">
        Already verified?{" "}
        <Link href="/sign-in" className="text-foreground underline underline-offset-4">
          Sign in
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-heading text-3xl text-foreground">Pocketly</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Confirm your email address to protect your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Spinner className="size-4" />}>
            <VerifyEmailContent />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
