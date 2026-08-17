"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePocketlyClient } from "@/lib/use-pocketly-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "pocketly:read": "View your accounts, records, budgets, categories, and analysis",
  "pocketly:write":
    "Create, edit, and delete records, accounts, categories, and budgets on your behalf",
  openid: "Confirm your identity",
  profile: "Read your name",
  email: "Read your email address",
  offline_access: "Stay connected between sessions",
};

function ConsentForm() {
  const searchParams = useSearchParams();
  const client = usePocketlyClient();

  const clientId = searchParams.get("client_id") ?? "";
  const clientName = searchParams.get("client_name") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const codeChallenge = searchParams.get("code_challenge") ?? "";
  const codeChallengeMethod = searchParams.get("code_challenge_method") ?? "S256";
  const state = searchParams.get("state") ?? undefined;
  const scope = searchParams.get("scope") ?? "";
  const scopes = scope.split(" ").filter(Boolean);

  const [submitting, setSubmitting] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(accept: boolean) {
    setSubmitting(accept ? "allow" : "deny");
    setError(null);
    try {
      const { data, error: apiError } = await client.POST("/oauth2/consent", {
        body: {
          accept,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_challenge: codeChallenge,
          code_challenge_method:
            codeChallengeMethod === "plain" ? "plain" : "S256",
          state,
          scope: scope || undefined,
        },
      });
      if (apiError || !data?.data.url) {
        throw new Error();
      }
      // Leaving the app entirely -- data.data.url is the connecting MCP
      // client's own redirect_uri (an external app, not a Next.js route),
      // so the Next.js router doesn't apply here.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.data.url;
    } catch {
      setSubmitting(null);
      setError("Something went wrong completing the connection. Try again.");
    }
  }

  if (!clientId || !redirectUri || !codeChallenge) {
    return (
      <p className="text-sm text-muted-foreground">
        This connection link is invalid or has expired.{" "}
        <Link href="/dashboard" className="text-foreground underline underline-offset-4">
          Back to your ledger
        </Link>
        .
      </p>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {clientName || clientId} is asking for permission to:
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {scopes.map((s) => (
          <li key={s} className="border-l-2 border-primary py-1 pl-3 text-sm">
            {SCOPE_DESCRIPTIONS[s] ?? s}
          </li>
        ))}
      </ul>
      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button disabled={submitting !== null} onClick={() => void respond(true)}>
          {submitting === "allow" && <Spinner className="size-3.5" />}
          Allow
        </Button>
        <Button
          variant="outline"
          disabled={submitting !== null}
          onClick={() => void respond(false)}
        >
          {submitting === "deny" && <Spinner className="size-3.5" />}
          Deny
        </Button>
      </div>
    </>
  );
}

export default function McpConnectPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-background px-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="font-heading text-3xl text-foreground">Pocketly</span>
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Connect an app</CardTitle>
          <CardDescription>
            Review what you&apos;re about to share before you continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Spinner className="size-4" />}>
            <ConsentForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
