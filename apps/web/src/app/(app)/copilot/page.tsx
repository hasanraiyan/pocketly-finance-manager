"use client";

import { PersonaChatView } from "@personaai/ui";
import { useAuth } from "@/lib/auth-provider";
import {
  COPILOT_AGENT_ID,
  COPILOT_STARTER_PROMPTS,
  COPILOT_THEME,
} from "@/lib/persona-config";

export default function CopilotPage() {
  const { user } = useAuth();
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
