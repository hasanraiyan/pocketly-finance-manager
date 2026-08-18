"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { PersonaChatView } from "@personaai/ui";
import { useAuth } from "@/lib/auth-provider";
import { Button } from "@/components/ui/button";
import {
  COPILOT_AGENT_ID,
  COPILOT_STARTER_PROMPTS,
  COPILOT_THEME,
} from "@/lib/persona-config";

export default function CopilotPage() {
  const { user, isGuest } = useAuth();

  if (isGuest) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Sparkles className="size-7" />
          </div>
          <h2 className="font-heading text-2xl text-foreground">
            Pocketly Financial Copilot
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            AI Copilot connects to your cloud account to analyze spending patterns, project cash flow, and give personalised advice.
          </p>
          <div className="mt-6 flex flex-col gap-2 w-full">
            <Button render={<Link href="/sign-up" />} className="w-full">
              Create Account to Unlock AI <ArrowRight className="ml-1 size-4" />
            </Button>
            <Button render={<Link href="/sign-in" />} variant="ghost" className="w-full">
              Already have an account? Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    // Expand to fill the (app) layout shell completely, with no padding
    <div className="flex h-full w-full overflow-hidden">
      <PersonaChatView
        agentId={COPILOT_AGENT_ID}
        title="Financial Copilot"
        greeting={`Good to see you, ${firstName}. How can I help with your finances today?`}
        starterPrompts={COPILOT_STARTER_PROMPTS}
        showSidebar
        showFilesDrawer
        showAssistantAvatar={false}
        className="h-full w-full"
        theme={COPILOT_THEME}
      />
    </div>
  );
}
