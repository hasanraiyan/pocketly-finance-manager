"use client";

import { PersonaChatLauncher } from "@personaai/ui";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-provider";
import {
  COPILOT_AGENT_ID,
  COPILOT_STARTER_PROMPTS,
  COPILOT_THEME,
} from "@/lib/persona-config";

/**
 * Demo of the FAB variant of the copilot, mounted globally so it's
 * reachable from every page -- except /copilot itself, which already is
 * the full PersonaChatView experience and would just show both at once.
 */
export function CopilotLauncher() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname?.startsWith("/copilot")) return null;

  const firstName = user?.name?.split(" ")[0] ?? "there";

  return (
    <PersonaChatLauncher
      agentId={COPILOT_AGENT_ID}
      title="Financial Copilot"
      greeting={`Good to see you, ${firstName}. How can I help with your finances today?`}
      starterPrompts={COPILOT_STARTER_PROMPTS}
      showSidebar
      showFilesDrawer
      showAssistantAvatar={false}
      theme={COPILOT_THEME}
    />
  );
}
