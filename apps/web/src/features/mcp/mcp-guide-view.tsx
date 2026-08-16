"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { MCP_SERVER_URL } from "@/lib/site-config";

function CopyMcpUrlButton() {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={() => {
        void navigator.clipboard.writeText(MCP_SERVER_URL).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check /> : <Copy />}
      <span className="sr-only">Copy MCP server URL</span>
    </Button>
  );
}

const CLIENT_NOTES = [
  {
    name: "Claude Desktop & Claude Code",
    note: "Add a custom or remote MCP server using the URL below -- look for it under Connectors or MCP servers in settings.",
  },
  {
    name: "ChatGPT",
    note: "If your plan supports connectors, add a custom connector with the URL below.",
  },
  {
    name: "Any other MCP-compatible client",
    note: "Look for “custom connector,” “remote MCP server,” or “add server by URL” in its settings.",
  },
];

export function McpGuideView({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <SiteHeader authenticated={authenticated} />

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16 sm:px-12">
        <div className="text-center">
          <h1 className="font-heading text-2xl text-foreground">
            Connect a client
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Give an AI assistant access to your Pocketly data over MCP.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Server URL</CardTitle>
            <CardDescription>
              Paste this into your client&apos;s connector settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground">
                {MCP_SERVER_URL}
              </code>
              <CopyMcpUrlButton />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
              <li>Add the server URL above in your client&apos;s settings.</li>
              <li>
                It opens a sign-in prompt -- sign in to Pocketly there (or
                create an account if you don&apos;t have one).
              </li>
              <li>
                Approve the access it&apos;s requesting. You choose exactly
                what it can read or change; nothing happens without that
                approval.
              </li>
              <li>
                It can now use your Pocketly data based on what you
                approved. See or revoke it anytime from{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                .
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where to add it</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {CLIENT_NOTES.map((client) => (
                <li key={client.name} className="flex flex-col gap-1 py-3">
                  <span className="text-sm font-medium text-foreground">
                    {client.name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {client.note}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <SiteFooter />
    </div>
  );
}
