"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { authBaseUrl } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  const clientId = searchParams.get("client_id") ?? "";
  const scope = searchParams.get("scope") ?? "";
  const scopes = scope.split(" ").filter(Boolean);

  const [clientName, setClientName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    fetch(`${authBaseUrl}/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      // RFC 7591-style field name -- confirmed by reading the server's
      // response mapping (schemaToOAuth) directly: `client_name`, not `name`.
      .then((data: { client_name?: string } | null) => {
        if (data?.client_name) setClientName(data.client_name);
      })
      .catch(() => {
        // Non-fatal -- falls back to showing the raw client id below.
      });
  }, [clientId]);

  async function respond(accept: boolean) {
    setSubmitting(accept ? "allow" : "deny");
    setError(null);
    try {
      const res = await fetch(`${authBaseUrl}/oauth2/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          accept,
          scope,
          oauth_query: searchParams.toString(),
        }),
      });
      const data: { url?: string } | null = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error();
      }
      // Leaving the app entirely -- data.url is the connecting MCP client's
      // own redirect_uri (an external app, not a Next.js route), so the
      // Next.js router doesn't apply here.
      // eslint-disable-next-line react-hooks/immutability
      window.location.href = data.url;
    } catch {
      setSubmitting(null);
      setError("Something went wrong completing the connection. Try again.");
    }
  }

  if (!clientId) {
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
        {clientName ?? clientId} is asking for permission to:
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {scopes.map((s) => (
          <li key={s} className="border-l-2 border-primary py-1 pl-3 text-sm">
            {SCOPE_DESCRIPTIONS[s] ?? s}
          </li>
        ))}
      </ul>
      {error && <p className="mt-4 text-sm text-negative">{error}</p>}
      <div className="mt-6 flex flex-col gap-2">
        <Button disabled={submitting !== null} onClick={() => respond(true)}>
          {submitting === "allow" && <Spinner className="size-3.5" />}
          Allow
        </Button>
        <Button
          variant="outline"
          disabled={submitting !== null}
          onClick={() => respond(false)}
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
