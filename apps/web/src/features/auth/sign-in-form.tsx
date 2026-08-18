"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-provider";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, continueAsGuest, user, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Skip the form entirely if a session already exists (e.g. an MCP client
  // bounced an already-signed-in browser through /sign-in on its way back to
  // /mcp-connect) -- otherwise every such round trip forces a redundant
  // manual sign-in even though AuthProvider already has a valid session.
  useEffect(() => {
    if (isLoading || !user) return;
    const redirect = searchParams.get("redirect");
    router.replace(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
  }, [isLoading, user, searchParams, router]);

  if (isLoading || user) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      const redirect = searchParams.get("redirect");
      router.push(redirect && redirect.startsWith("/") ? redirect : "/dashboard");
    } catch {
      setError("That email and password don't match an account.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95 shadow-lg backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <Link
          href="/"
          className="mx-auto mb-3 flex items-center gap-2.5 transition-transform hover:scale-105"
        >
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 p-1.5 ring-1 ring-primary/20">
            <Image
              src="/pocketly-icon.png"
              alt="Pocketly Logo"
              width={36}
              height={36}
              className="size-full object-contain"
              priority
            />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-foreground">
            Pocketly
          </span>
        </Link>
        <CardTitle className="text-xl font-semibold">Welcome back</CardTitle>
        <CardDescription className="text-xs">
          Sign in to access your ledger, budgets, and financial intelligence
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <PasswordInput
              id="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
              value={password}
              onChange={setPassword}
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>

          <Button
            type="submit"
            disabled={pending}
            className="mt-2 h-10 w-full font-medium"
          >
            {pending ? (
              <>
                <Spinner className="mr-2 size-4" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight className="ml-1.5 size-4" />
              </>
            )}
          </Button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await continueAsGuest();
                router.push("/dashboard");
              } finally {
                setPending(false);
              }
            }}
            className="h-10 w-full font-medium"
          >
            Continue as Guest (No Login)
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <span>Don&apos;t have an account?</span>
          <Link
            href="/sign-up"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Create one free
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t pt-4 text-2xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Encrypted financial ledger • 100% private</span>
        </div>
      </CardContent>
    </Card>
  );
}
