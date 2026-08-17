"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/lib/auth-provider";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export function SignUpForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register(email, password, name);
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create your account."
      );
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
        <CardTitle className="text-xl font-semibold">Create your account</CardTitle>
        <CardDescription className="text-xs">
          Start mastering your cash flow with double-entry precision tracking
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="name">Full Name</FieldLabel>
            <Input
              id="name"
              autoComplete="name"
              placeholder="e.g. Alex Morgan"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 text-sm"
            />
          </Field>
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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              value={password}
              onChange={setPassword}
            />
            <FieldDescription className="text-2xs">
              Must be at least 8 characters.
            </FieldDescription>
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
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight className="ml-1.5 size-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center gap-1 text-center text-xs text-muted-foreground">
          <span>Already have an account?</span>
          <Link
            href="/sign-in"
            className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 border-t pt-4 text-2xs text-muted-foreground">
          <Sparkles className="size-3.5 text-amber-500" />
          <span>Free ledger • AI financial analysis • No hidden fees</span>
        </div>
      </CardContent>
    </Card>
  );
}
